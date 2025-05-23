import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { 
  SocketEvent, 
  GameState, 
  Action, 
  ActionType, 
  Card 
} from '../types';

// ソケットサーバーのURL
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001';

/**
 * ソケット通信のためのカスタムフック
 */
export const useSocket = () => {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [gameOver, setGameOver] = useState<{ winner?: string; reason?: string } | null>(null);
  const [socketId, setSocketId] = useState<string | undefined>(undefined);

  // ソケット接続の初期化
  useEffect(() => {
    // ソケットインスタンスの作成
    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
      autoConnect: true
    });

    // 接続イベント
    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
      setIsConnected(true);
      setSocketId(socket.id);
      setError(null);
    });

    // 切断イベント
    socket.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsConnected(false);
    });

    // 接続エラーイベント
    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
      setError('サーバーに接続できませんでした');
      setIsConnected(false);
    });

    // ゲーム状態更新イベント
    socket.on(SocketEvent.GAME_STATE, (data: { gameState: GameState }) => {
      console.log('Game state updated:', data.gameState);
      setGameState(data.gameState);
      setError(null);
    });

    // エラーイベント
    socket.on(SocketEvent.ERROR, (data: { message: string }) => {
      console.error('Socket error:', data.message);
      setError(data.message);
    });

    // ゲーム終了イベント
    socket.on(SocketEvent.GAME_OVER, (data: { gameState: GameState; winner?: string; reason?: string }) => {
      console.log('Game over:', data);
      setGameState(data.gameState);
      setGameOver({
        winner: data.winner,
        reason: data.reason
      });
    });

    // ソケットの参照を保存
    socketRef.current = socket;

    // クリーンアップ
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  /**
   * ゲームを作成する
   */
  const createGame = useCallback((username: string, deck?: string[]) => {
    if (!socketRef.current || !isConnected) {
      setError('サーバーに接続されていません');
      return;
    }

    socketRef.current.emit(SocketEvent.CREATE_GAME, {
      username,
      deck
    });
  }, [isConnected]);

  /**
   * ゲームに参加する
   */
  const joinGame = useCallback((gameId: string, username: string, deck?: string[]) => {
    if (!socketRef.current || !isConnected) {
      setError('サーバーに接続されていません');
      return;
    }

    socketRef.current.emit(SocketEvent.JOIN_GAME, {
      gameId,
      username,
      deck
    });
  }, [isConnected]);

  /**
   * 準備完了を通知する
   */
  const setReady = useCallback((gameId: string) => {
    if (!socketRef.current || !isConnected) {
      setError('サーバーに接続されていません');
      return;
    }

    socketRef.current.emit(SocketEvent.READY, {
      gameId
    });
  }, [isConnected]);

  /**
   * アクションを送信する
   */
  const sendAction = useCallback((gameId: string, action: {
    type: ActionType;
    cardId?: string;
    targetId?: string;
    techniqueIndex?: number;
  }) => {
    if (!socketRef.current || !isConnected) {
      setError('サーバーに接続されていません');
      return;
    }

    socketRef.current.emit(SocketEvent.ACTION, {
      gameId,
      action
    });
  }, [isConnected]);

  /**
   * カードを場に出す
   */
  const playCard = useCallback((gameId: string, cardId: string) => {
    sendAction(gameId, {
      type: ActionType.PLAY_CARD,
      cardId
    });
  }, [sendAction]);

  /**
   * 攻撃を行う
   */
  const attack = useCallback((gameId: string, cardId: string, targetId?: string, techniqueIndex?: number) => {
    sendAction(gameId, {
      type: ActionType.ATTACK,
      cardId,
      targetId,
      techniqueIndex
    });
  }, [sendAction]);

  /**
   * エサをセットする
   */
  const setFood = useCallback((gameId: string, cardId: string) => {
    sendAction(gameId, {
      type: ActionType.SET_FOOD,
      cardId
    });
  }, [sendAction]);

  /**
   * セットフェーズをスキップする
   */
  const skipSetPhase = useCallback((gameId: string) => {
    sendAction(gameId, {
      type: ActionType.SKIP_SET_PHASE
    });
  }, [sendAction]);

  /**
   * 技を使用する
   */
  const useTechnique = useCallback((gameId: string, cardId: string, techniqueIndex: number) => {
    sendAction(gameId, {
      type: ActionType.USE_TECHNIQUE,
      cardId,
      techniqueIndex
    });
  }, [sendAction]);

  /**
   * ターンを終了する
   */
  const endTurn = useCallback((gameId: string) => {
    sendAction(gameId, {
      type: ActionType.END_TURN
    });
  }, [sendAction]);

  /**
   * 降伏する
   */
  const surrender = useCallback((gameId: string) => {
    sendAction(gameId, {
      type: ActionType.SURRENDER
    });
  }, [sendAction]);

  /**
   * エラーをクリアする
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * ゲームオーバー状態をリセットする
   */
  const resetGameOver = useCallback(() => {
    setGameOver(null);
  }, []);

  return {
    socketId,
    isConnected,
    gameState,
    error,
    gameOver,
    createGame,
    joinGame,
    setReady,
    playCard,
    attack,
    setFood,
    skipSetPhase,
    useTechnique,
    endTurn,
    surrender,
    clearError,
    resetGameOver
  };
};