import { Server, Socket } from 'socket.io';
import { 
  CLIENT_EVENTS, 
  SERVER_EVENTS, 
  SERVER_ERROR_MESSAGES,
  JoinGamePayload,
  CreateGamePayload,
  ReadyPayload,
  ActionPayload
} from './events';
import { GameManager } from '../models/GameManager';
import { cardService } from '../services/CardService';
import { Action, ActionType, ErrorType } from '../types';

// ゲームマネージャーのインスタンス
const gameManager = new GameManager();

/**
 * ソケット接続のセットアップ
 */
export const setupSocketHandlers = (io: Server) => {
  io.on('connection', (socket: Socket) => {
    console.log(`クライアント接続: ${socket.id}`);

    // プレイヤーIDとして使用
    const playerId = socket.id;

    // ゲーム作成イベント
    socket.on(CLIENT_EVENTS.CREATE_GAME, (payload: CreateGamePayload) => {
      handleCreateGame(io, socket, playerId, payload);
    });

    // ゲーム参加イベント
    socket.on(CLIENT_EVENTS.JOIN_GAME, (payload: JoinGamePayload) => {
      handleJoinGame(io, socket, playerId, payload);
    });

    // レディイベント（ゲーム開始準備完了）
    socket.on(CLIENT_EVENTS.READY, (payload: ReadyPayload) => {
      handleReady(io, socket, playerId, payload);
    });

    // アクションイベント
    socket.on(CLIENT_EVENTS.ACTION, (payload: ActionPayload) => {
      handleAction(io, socket, playerId, payload);
    });

    // 切断イベント
    socket.on('disconnect', () => {
      handleDisconnect(io, socket, playerId);
    });
  });
};

/**
 * ゲーム作成処理
 */
const handleCreateGame = (io: Server, socket: Socket, playerId: string, payload: CreateGamePayload) => {
  const { username, deck } = payload;

  // デッキのバリデーション（デッキが指定されていない場合はランダム生成）
  let playerDeck = deck 
    ? deck.map(id => cardService.getCardById(id)).filter(card => card !== undefined)
    : cardService.generateRandomDeck();

  const deckValidation = cardService.validateDeck(playerDeck);
  if (!deckValidation.valid) {
    socket.emit(SERVER_EVENTS.ERROR, {
      message: deckValidation.message || SERVER_ERROR_MESSAGES.INVALID_DECK
    });
    return;
  }

  // 新しいゲームを作成
  const game = gameManager.createGame();
  
  // プレイヤーをゲームに追加
  gameManager.addPlayerToGame(game.id, playerId, username, playerDeck);
  
  // ルーム参加
  socket.join(game.id);
  
  // ゲーム状態をクライアントに送信
  socket.emit(SERVER_EVENTS.GAME_STATE, {
    gameState: game.toJSON()
  });

  console.log(`ゲーム作成: ${game.id}, プレイヤー: ${username} (${playerId})`);
};

/**
 * ゲーム参加処理
 */
const handleJoinGame = (io: Server, socket: Socket, playerId: string, payload: JoinGamePayload) => {
  const { gameId, username, deck } = payload;

  // ゲームの存在確認
  const game = gameManager.getGame(gameId);
  if (!game) {
    socket.emit(SERVER_EVENTS.ERROR, {
      message: SERVER_ERROR_MESSAGES.GAME_NOT_FOUND
    });
    return;
  }

  // ゲーム状態確認
  if (game.started) {
    socket.emit(SERVER_EVENTS.ERROR, {
      message: SERVER_ERROR_MESSAGES.GAME_ALREADY_STARTED
    });
    return;
  }

  if (game.players.length >= 2) {
    socket.emit(SERVER_EVENTS.ERROR, {
      message: SERVER_ERROR_MESSAGES.GAME_FULL
    });
    return;
  }

  // デッキのバリデーション（デッキが指定されていない場合はランダム生成）
  let playerDeck = deck 
    ? deck.map(id => cardService.getCardById(id)).filter(card => card !== undefined)
    : cardService.generateRandomDeck();

  const deckValidation = cardService.validateDeck(playerDeck);
  if (!deckValidation.valid) {
    socket.emit(SERVER_EVENTS.ERROR, {
      message: deckValidation.message || SERVER_ERROR_MESSAGES.INVALID_DECK
    });
    return;
  }

  // プレイヤーをゲームに追加
  const success = gameManager.addPlayerToGame(gameId, playerId, username, playerDeck);
  if (!success) {
    socket.emit(SERVER_EVENTS.ERROR, {
      message: SERVER_ERROR_MESSAGES.GAME_FULL
    });
    return;
  }

  // ルーム参加
  socket.join(gameId);

  // ゲーム状態をルームの全員に送信
  io.to(gameId).emit(SERVER_EVENTS.GAME_STATE, {
    gameState: game.toJSON()
  });

  console.log(`ゲーム参加: ${gameId}, プレイヤー: ${username} (${playerId})`);
};

/**
 * レディ（ゲーム開始準備完了）処理
 */
const handleReady = (io: Server, socket: Socket, playerId: string, payload: ReadyPayload) => {
  const { gameId } = payload;

  // ゲームの存在確認
  const game = gameManager.getGame(gameId);
  if (!game) {
    socket.emit(SERVER_EVENTS.ERROR, {
      message: SERVER_ERROR_MESSAGES.GAME_NOT_FOUND
    });
    return;
  }

  // プレイヤーがゲームに参加しているか確認
  const player = game.players.find(player => player.id === playerId);
  if (!player) {
    socket.emit(SERVER_EVENTS.ERROR, {
      message: 'あなたはこのゲームに参加していません'
    });
    return;
  } else {
    // プレイヤーをレディ状態に設定
    player.setReady(true);
  }

  io.to(gameId).emit(SERVER_EVENTS.GAME_STATE, {
    gameState: game.toJSON()
  });


  // 両方のプレイヤーがレディ状態か確認
  const allPlayersReady = game.players.length === 2 && game.players.every(p => p.isReady);
  
  if (allPlayersReady) {
    // ゲームを開始
    const success = gameManager.startGame(gameId);
    if (!success) {
      socket.emit(SERVER_EVENTS.ERROR, {
        message: 'ゲームを開始できませんでした'
      });
      return;
    }

    // 各プレイヤーに適切な視点のゲーム状態を送信
    game.players.forEach(player => {
      const playerView = game.toJSONForPlayer(player.id);
      io.to(player.id).emit(SERVER_EVENTS.GAME_STATE, {
        gameState: playerView
      });
    });

    console.log(`ゲーム開始: ${gameId} - 両方のプレイヤーが準備完了`);
  } else {
    console.log(`プレイヤー ${playerId} が準備完了: ${gameId}`);
  }
};

/**
 * アクション処理
 */
const handleAction = (io: Server, socket: Socket, playerId: string, payload: ActionPayload) => {
  const { gameId, action } = payload;

  // ゲームの存在確認
  const game = gameManager.getGame(gameId);
  if (!game) {
    socket.emit(SERVER_EVENTS.ERROR, {
      message: SERVER_ERROR_MESSAGES.GAME_NOT_FOUND
    });
    return;
  }

  // プレイヤーがゲームに参加しているか確認
  const playerInGame = game.players.some(player => player.id === playerId);
  if (!playerInGame) {
    socket.emit(SERVER_EVENTS.ERROR, {
      message: 'あなたはこのゲームに参加していません'
    });
    return;
  }

  // アクションを処理
  const actionObj: Action = {
    type: action.type as ActionType,
    playerId,
    cardId: action.cardId,
    targetId: action.targetId,
    techniqueIndex: action.techniqueIndex
  };

  const result = game.processAction(actionObj);
  if (!result.success) {
    // エラーメッセージをマッピング
    let errorMessage: string;
    switch (result.error) {
      case ErrorType.NOT_YOUR_TURN:
        errorMessage = SERVER_ERROR_MESSAGES.NOT_YOUR_TURN;
        break;
      case ErrorType.INSUFFICIENT_FOOD:
        errorMessage = SERVER_ERROR_MESSAGES.INSUFFICIENT_FOOD;
        break;
      case ErrorType.CARD_NOT_FOUND:
        errorMessage = SERVER_ERROR_MESSAGES.CARD_NOT_FOUND;
        break;
      case ErrorType.INVALID_TARGET:
        errorMessage = SERVER_ERROR_MESSAGES.INVALID_TARGET;
        break;
      default:
        errorMessage = SERVER_ERROR_MESSAGES.INVALID_ACTION;
    }

    socket.emit(SERVER_EVENTS.ERROR, {
      message: errorMessage
    });
    return;
  }

  // ゲーム状態をルームの全員に送信
  io.to(gameId).emit(SERVER_EVENTS.GAME_STATE, {
    gameState: game.toJSON()
  });

  // ゲームが終了している場合
  if (game.ended) {
    io.to(gameId).emit(SERVER_EVENTS.GAME_OVER, {
      gameState: game.toJSON(),
      winner: game.winner?.username,
      reason: '勝利条件達成'
    });

    // ゲームを削除
    setTimeout(() => {
      gameManager.endGame(gameId);
    }, 5000); // 5秒後にゲームを削除
  }

  console.log(`アクション処理: ${gameId}, プレイヤー: ${playerId}, アクション: ${action.type}`);
};

/**
 * 切断処理
 */
const handleDisconnect = (io: Server, socket: Socket, playerId: string) => {
  console.log(`クライアント切断: ${playerId}`);

  // プレイヤーが参加しているゲームを取得
  const game = gameManager.getPlayerGame(playerId);
  if (!game) {
    return;
  }

  // ゲームが開始していない場合はプレイヤーを削除
  if (!game.started) {
    gameManager.endGame(game.id);
    return;
  }

  // ゲームが開始している場合は相手プレイヤーを勝者に
  const opponent = game.players.find(player => player.id !== playerId);
  if (opponent) {
    game.winner = opponent;
    game.ended = true;

    // ゲーム終了通知
    io.to(game.id).emit(SERVER_EVENTS.GAME_OVER, {
      gameState: game.toJSON(),
      winner: opponent.username,
      reason: '相手プレイヤーが切断しました'
    });

    // ゲームを削除
    setTimeout(() => {
      gameManager.endGame(game.id);
    }, 5000); // 5秒後にゲームを削除
  }
};