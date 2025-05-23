import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useGame } from '../hooks/useGame';
import { GameState, Card, Player, FieldCard } from '../types';

// コンテキストの型定義
interface GameContextType {
  // ゲーム状態
  gameState: GameState | null;
  isConnected: boolean;
  error: string | null;
  gameOver: { winner?: string; reason?: string } | null;
  playerId: string;
  selectedCard: Card | null;
  setSelectedCard: (card: Card | null) => void;
  
  // ゲーム管理アクション
  createGame: (username: string, deck?: string[]) => void;
  joinGame: (gameId: string, username: string, deck?: string[]) => void;
  setReady: (gameId: string) => void;
  
  // ゲームプレイアクション
  playCard: (gameId: string, cardId: string) => void;
  attack: (gameId: string, cardId: string, targetId?: string, techniqueIndex?: number) => void;
  setFood: (gameId: string, cardId: string) => void;
  skipSetPhase: (gameId: string) => void;
  useTechnique: (gameId: string, cardId: string, techniqueIndex: number) => void;
  endTurn: (gameId: string) => void;
  surrender: (gameId: string) => void;
  
  // ユーティリティ
  getPlayerPerspective: (gameState: GameState | null, playerId: string) => { me: Player | null; opponent: Player | null; };
  isMyTurn: (gameState: GameState | null, playerId: string) => boolean;
  canPlayCard: (gameState: GameState | null, playerId: string, card: Card) => boolean;
  canSetFood: (gameState: GameState | null, playerId: string) => boolean;
  canSkipSetPhase: (gameState: GameState | null, playerId: string) => boolean;
  canAttack: (gameState: GameState | null, playerId: string, attacker: FieldCard) => boolean;
  canEndTurn: (gameState: GameState | null, playerId: string) => boolean;
  getValidTargets: (gameState: GameState | null, playerId: string, attackerCard: FieldCard) => { validTargets: FieldCard[]; canAttackPlayer: boolean; };
  clearError: () => void;
  resetGameOver: () => void;
}

// コンテキストの作成
const GameContext = createContext<GameContextType | undefined>(undefined);

// コンテキストプロバイダー
export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const game = useGame();
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);

  if (!game.isConnected) {
    // ローディング表示などを返す
    return <div>サーバーに接続中...</div>;
  }

  const playerId = game.socketId;
  if (!playerId) {
    throw new Error('gameProvider error');
  }

  // コンテキスト値
  const contextValue: GameContextType = {
    ...game,
    playerId,
    selectedCard,
    setSelectedCard
  };

  return (
    <GameContext.Provider value={contextValue}>
      {children}
    </GameContext.Provider>
  );
};

// カスタムフック
export const useGameContext = (): GameContextType => {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGameContext must be used within a GameProvider');
  }
  return context;
};