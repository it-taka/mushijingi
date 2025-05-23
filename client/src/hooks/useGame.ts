import { useCallback } from 'react';
import { useSocket } from './useSocket';
import { 
  GameState, 
  Player, 
  PlayerPerspective, 
  GamePhase,
  FieldCard,
  Card
} from '../types';

/**
 * ゲームロジックのためのカスタムフック
 */
export const useGame = () => {
  const {
    socketId,
    gameState, 
    isConnected, 
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
  } = useSocket();

  /**
   * 自分と相手のプレイヤー情報を取得
   */
  const getPlayerPerspective = useCallback((gameState: GameState | null, playerId: string): PlayerPerspective => {
    if (!gameState) {
      return { me: null, opponent: null };
    }

    const me = gameState.players.find(player => player.id === playerId) || null;
    const opponent = gameState.players.find(player => player.id !== playerId) || null;

    return { me, opponent };
  }, []);

  /**
   * 現在のプレイヤーのターンかどうか
   */
  const isMyTurn = useCallback((gameState: GameState | null, playerId: string): boolean => {
    if (!gameState) return false;
    return gameState.players[gameState.currentPlayerIndex]?.id === playerId;
  }, []);

  /**
   * カードがプレイ可能かどうか
   */
  const canPlayCard = useCallback((gameState: GameState | null, playerId: string, card: Card): boolean => {
    if (!gameState || !isMyTurn(gameState, playerId)) return false;
    
    // メインフェーズのみカードをプレイ可能
    if (gameState.phase !== GamePhase.MAIN) return false;
    
    const { me } = getPlayerPerspective(gameState, playerId);
    if (!me) return false;
    
    // コストが足りるか確認
    return card.cost <= me.currentFood;
  }, [isMyTurn, getPlayerPerspective]);

  /**
   * エサをセット可能かどうか
   */
  const canSetFood = useCallback((gameState: GameState | null, playerId: string): boolean => {
    if (!gameState || !isMyTurn(gameState, playerId)) return false;
    
    // セットフェーズのみエサをセット可能
    return gameState.phase === GamePhase.SET;
  }, [isMyTurn]);

  /**
   * セットフェーズをスキップ可能かどうか
   */
  const canSkipSetPhase = useCallback((gameState: GameState | null, playerId: string): boolean => {
    if (!gameState || !isMyTurn(gameState, playerId)) return false;
    
    // セットフェーズのみスキップ可能
    return gameState.phase === GamePhase.SET;
  }, [isMyTurn]);

  /**
   * 攻撃可能かどうか
   */
  const canAttack = useCallback((
    gameState: GameState | null, 
    playerId: string, 
    attacker: FieldCard
  ): boolean => {
    if (!gameState || !isMyTurn(gameState, playerId)) return false;
    
    // メインフェーズのみ攻撃可能
    if (gameState.phase !== GamePhase.MAIN) return false;
    
    // すでに攻撃済みの場合は攻撃不可
    return !attacker.hasAttacked;
  }, [isMyTurn]);

  /**
   * ターン終了可能かどうか
   */
  const canEndTurn = useCallback((gameState: GameState | null, playerId: string): boolean => {
    if (!gameState || !isMyTurn(gameState, playerId)) return false;
    
    // どのフェーズでもターン終了可能（セットフェーズはスキップできる）
    return true;
  }, [isMyTurn]);

  /**
   * カードの有効なターゲットを取得
   */
  const getValidTargets = useCallback((
    gameState: GameState | null, 
    playerId: string, 
    attackerCard: FieldCard
  ): { validTargets: FieldCard[]; canAttackPlayer: boolean } => {
    if (!gameState || !canAttack(gameState, playerId, attackerCard)) {
      return { validTargets: [], canAttackPlayer: false };
    }
    
    const { opponent } = getPlayerPerspective(gameState, playerId);
    if (!opponent) {
      return { validTargets: [], canAttackPlayer: false };
    }
    
    // 相手フィールドのカード
    const validTargets = opponent.field;
    
    // 相手フィールドにカードがない場合は直接攻撃可能
    const canAttackPlayer = validTargets.length === 0;
    
    return { validTargets, canAttackPlayer };
  }, [canAttack, getPlayerPerspective]);

  /**
   * 技が使用可能かどうか
   */
  const canUseTechnique = useCallback((
    gameState: GameState | null,
    playerId: string,
    attackerCard: FieldCard,
    techniqueIndex: number
  ): boolean => {
    if (!gameState || !canAttack(gameState, playerId, attackerCard)) {
      return false;
    }

    // 技が存在するかチェック
    if (!attackerCard.card.techniques || 
        techniqueIndex >= attackerCard.card.techniques.length || 
        techniqueIndex < 0) {
      return false;
    }

    return true;
  }, [canAttack]);

  /**
   * 技の詳細情報を取得
   */
  const getTechniqueInfo = useCallback((
    card: Card,
    techniqueIndex: number
  ): { name: string; attack: number; effect: string } | null => {
    if (!card.techniques || 
        techniqueIndex >= card.techniques.length || 
        techniqueIndex < 0) {
      return null;
    }

    const technique = card.techniques[techniqueIndex];
    return {
      name: technique.name,
      attack: technique.attack || 0,
      effect: technique.effect || ''
    };
  }, []);

  /**
   * ゲーム関連のアクションと状態をまとめて返す
   */
  return {
    socketId,
    gameState,
    isConnected,
    error,
    gameOver,
    getPlayerPerspective,
    isMyTurn,
    canPlayCard,
    canSetFood,
    canSkipSetPhase,
    canAttack,
    canEndTurn,
    getValidTargets,
    canUseTechnique,
    getTechniqueInfo,
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