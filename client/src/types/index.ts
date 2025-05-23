// カードの種類
export enum CardType {
  BUG = "虫",
  ENHANCEMENT = "強化",
  TECHNIQUE = "術"
}

// カードの属性
export enum CardAttribute {
  RED = "赤",
  BLUE = "青",
  GREEN = "緑",
}

// カードの技
export interface Technique {
  name: string;
  attack?: number;
  effect?: string;
}

// カードの基本インターフェース
export interface Card {
  id: string;
  name: string;
  type: CardType;
  attribute: CardAttribute;
  cost: number;
  hitpoints?: number; // ヒットポイント（体力）
  techniques?: Technique[];
  flavor_text?: string;
  rarity: string;
  set: string;
  image: string;
}

// ゲームのフェーズ
export enum GamePhase {
  DRAW = "ドローフェイズ",
  SET = "セットフェイズ",
  MAIN = "メインフェーズ",
  END = "ターンエンド"
}

// ゲームの状態
export interface GameState {
  id: string;
  players: Player[];
  currentPlayerIndex: number;
  phase: GamePhase;
  turn: number;
  winner?: Player;
  lastAction?: Action;
  started: boolean;
}

// プレイヤーの状態
export interface Player {
  id: string;
  username: string;
  deck: Card[];
  hand: Card[];
  field: FieldCard[];
  foodArea: Card[];
  territory: Card[];
  graveyard: Card[];
  currentFood: number;
  isReady: boolean;
}

// フィールド上のカードの状態
export interface FieldCard {
  card: Card;
  enhancements: Card[];
  damage: number;
  hasAttacked: boolean;
}

// アクションの種類
export enum ActionType {
  PLAY_CARD = "カードを場に出す",
  ATTACK = "攻撃を行う",
  SET_FOOD = "エサをセット",
  SKIP_SET_PHASE = "セットフェーズをスキップ",
  USE_TECHNIQUE = "技を使用",
  END_TURN = "ターン終了",
  SURRENDER = "降伏"
}

// アクション
export interface Action {
  type: ActionType;
  playerId: string;
  cardId?: string;
  targetId?: string;
  techniqueIndex?: number;
}

// ソケットイベント
export enum SocketEvent {
  JOIN_GAME = "joinGame",
  CREATE_GAME = "createGame",
  READY = "ready",
  ACTION = "action",
  GAME_STATE = "gameState",
  GAME_OVER = "gameOver",
  ERROR = "error"
}

// エラーの種類
export enum ErrorType {
  INVALID_ACTION = "不正なアクション",
  NOT_YOUR_TURN = "あなたのターンではありません",
  INSUFFICIENT_FOOD = "エサが不足しています",
  CARD_NOT_FOUND = "カードが見つかりません",
  INVALID_TARGET = "不正なターゲット"
}

// ゲームの設定
export interface GameSettings {
  username: string;
  deck?: Card[];
}

// プレイヤーの視点（自分と相手）
export interface PlayerPerspective {
  me: Player | null;
  opponent: Player | null;
}