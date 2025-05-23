import { SocketEvent } from '../types';

// クライアントから送信されるイベント
export const CLIENT_EVENTS = {
  JOIN_GAME: SocketEvent.JOIN_GAME,
  CREATE_GAME: SocketEvent.CREATE_GAME,
  READY: SocketEvent.READY,
  ACTION: SocketEvent.ACTION
};

// サーバーから送信されるイベント
export const SERVER_EVENTS = {
  GAME_STATE: SocketEvent.GAME_STATE,
  GAME_OVER: SocketEvent.GAME_OVER,
  ERROR: SocketEvent.ERROR
};

// サーバーからのエラーメッセージ
export enum SERVER_ERROR_MESSAGES {
  GAME_NOT_FOUND = 'ゲームが見つかりません',
  GAME_ALREADY_STARTED = 'ゲームはすでに開始されています',
  GAME_FULL = 'ゲームの定員に達しています',
  INVALID_DECK = '無効なデッキです',
  INVALID_ACTION = '無効なアクションです',
  NOT_YOUR_TURN = 'あなたのターンではありません',
  INSUFFICIENT_FOOD = 'エサが不足しています',
  CARD_NOT_FOUND = 'カードが見つかりません',
  INVALID_TARGET = '無効なターゲットです'
}

// イベントのペイロード型定義
export interface JoinGamePayload {
  gameId: string;
  username: string;
  deck?: string[]; // カードIDの配列
}

export interface CreateGamePayload {
  username: string;
  deck?: string[]; // カードIDの配列
}

export interface ReadyPayload {
  gameId: string;
}

export interface ActionPayload {
  gameId: string;
  action: {
    type: string;
    cardId?: string;
    targetId?: string;
    techniqueIndex?: number;
  };
}

export interface GameStatePayload {
  gameState: any; // GameState型に変換される
}

export interface GameOverPayload {
  gameState: any; // GameState型に変換される
  winner?: string;
  reason?: string;
}

export interface ErrorPayload {
  message: string;
  code?: string;
}