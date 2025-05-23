import { v4 as uuidv4 } from 'uuid';
import { 
  GameState, 
  GamePhase, 
  Player, 
  Action, 
  ActionType, 
  Card,
  ErrorType
} from '../types';
import { PlayerModel } from './Player';
import { CardModel } from './Card';

export class Game {
  id: string;
  players: PlayerModel[];
  currentPlayerIndex: number;
  phase: GamePhase;
  turn: number;
  winner?: PlayerModel;
  lastAction?: Action;
  started: boolean;
  ended: boolean;

  constructor() {
    //this.id = uuidv4();
    this.id = Math.floor(1000 + Math.random() * 9000).toString();
    this.players = [];
    this.currentPlayerIndex = 0;
    this.phase = GamePhase.DRAW;
    this.turn = 1;
    this.started = false;
    this.ended = false;
  }

  /**
   * プレイヤーをゲームに追加する
   */
  addPlayer(player: PlayerModel): boolean {
    if (this.players.length >= 2 || this.started) {
      return false;
    }
    
    this.players.push(player);
    return true;
  }

  /**
   * ゲームを開始する
   */
  start(): boolean {
    if (this.players.length !== 2 || this.started) {
      return false;
    }
    
    // プレイヤーの初期化
    this.players.forEach(player => player.initialize());
    
    // 最初のプレイヤーを決定（ランダム）
    this.currentPlayerIndex = Math.floor(Math.random() * 2);
    
    this.started = true;
    this.phase = GamePhase.SET;
    return true;
  }

  /**
   * 現在のプレイヤーを取得
   */
  getCurrentPlayer(): PlayerModel {
    return this.players[this.currentPlayerIndex];
  }

  /**
   * 相手プレイヤーを取得
   */
  getOpponentPlayer(): PlayerModel {
    return this.players[(this.currentPlayerIndex + 1) % 2];
  }

  /**
   * 次のフェイズに進む
   */
  nextPhase(): void {
    switch (this.phase) {
      case GamePhase.DRAW:
        this.phase = GamePhase.SET;
        break;
      case GamePhase.SET:
        this.phase = GamePhase.MAIN;
        // メインフェイズの開始時にコストを更新
        this.getCurrentPlayer().updateFood();
        break;
      case GamePhase.MAIN:
        this.phase = GamePhase.END;
        // ターン終了処理
        this.getCurrentPlayer().endTurn();
        break;
      case GamePhase.END:
        // 次のプレイヤーのターンへ
        this.currentPlayerIndex = (this.currentPlayerIndex + 1) % 2;
        this.phase = GamePhase.DRAW;
        if (this.currentPlayerIndex === 0) {
          this.turn++;
        }
        break;
    }
  }

  /**
   * アクションを処理する
   */
  processAction(action: Action): { success: boolean; error?: ErrorType } {
    // ゲームが終了している場合は何もしない
    if (this.ended) {
      return { success: false, error: ErrorType.INVALID_ACTION };
    }

    // 現在のプレイヤーのアクションかどうか確認
    const currentPlayer = this.getCurrentPlayer();
    if (action.playerId !== currentPlayer.id) {
      return { success: false, error: ErrorType.NOT_YOUR_TURN };
    }

    // アクションの種類に応じて処理
    switch (action.type) {
      case ActionType.PLAY_CARD:
        return this.handlePlayCard(action, currentPlayer);
      
      case ActionType.ATTACK:
        return this.handleAttack(action, currentPlayer);
      
      case ActionType.SET_FOOD:
        return this.handleSetFood(action, currentPlayer);
      
      case ActionType.USE_TECHNIQUE:
        return this.handleUseTechnique(action, currentPlayer);
      
      case ActionType.END_TURN:
        return this.handleEndTurn();
      
      case ActionType.SURRENDER:
        return this.handleSurrender(currentPlayer);
      
      default:
        return { success: false, error: ErrorType.INVALID_ACTION };
    }
  }

  /**
   * カードをプレイする処理
   */
  private handlePlayCard(action: Action, player: PlayerModel): { success: boolean; error?: ErrorType } {
    // メインフェーズ以外はカードをプレイできない
    if (this.phase !== GamePhase.MAIN) {
      return { success: false, error: ErrorType.INVALID_ACTION };
    }

    // カードIDから手札のインデックスを検索
    const cardIndex = player.hand.findIndex(card => card.id === action.cardId);
    if (cardIndex === -1) {
      return { success: false, error: ErrorType.CARD_NOT_FOUND };
    }

    // カードを場に出す
    const playedCard = player.playCard(cardIndex);
    if (!playedCard) {
      return { success: false, error: ErrorType.INSUFFICIENT_FOOD };
    }

    this.lastAction = action;
    return { success: true };
  }

  /**
   * 攻撃を処理
   */
  private handleAttack(action: Action, player: PlayerModel): { success: boolean; error?: ErrorType } {
    // メインフェーズ以外は攻撃できない
    if (this.phase !== GamePhase.MAIN) {
      return { success: false, error: ErrorType.INVALID_ACTION };
    }

    // 攻撃元の虫カードを検索
    const attackerIndex = player.field.findIndex(fieldCard => fieldCard.card.id === action.cardId);
    if (attackerIndex === -1) {
      return { success: false, error: ErrorType.CARD_NOT_FOUND };
    }

    // 技のインデックス（デフォルトは0、指定されていればその値を使用）
    const techniqueIndex = action.techniqueIndex !== undefined ? action.techniqueIndex : 0;

    // 技が存在するかチェック
    const attackerCard = player.field[attackerIndex];
    if (!attackerCard.card.techniques || techniqueIndex >= attackerCard.card.techniques.length || techniqueIndex < 0) {
      return { success: false, error: ErrorType.INVALID_ACTION };
    }

    // 攻撃を実行
    const attackPower = player.attack(attackerIndex, techniqueIndex);
    if (attackPower <= 0) {
      return { success: false, error: ErrorType.INVALID_ACTION };
    }

    const opponent = this.getOpponentPlayer();

    // ターゲットが指定されているか
    if (action.targetId) {
      // 相手フィールド上の虫を攻撃
      const defenderIndex = opponent.field.findIndex(fieldCard => fieldCard.card.id === action.targetId);
      if (defenderIndex === -1) {
        return { success: false, error: ErrorType.INVALID_TARGET };
      }

      // ダメージを適用
      const destroyed = opponent.receiveDamage(defenderIndex, attackPower);

      this.lastAction = {
        ...action,
        type: ActionType.ATTACK,
        techniqueIndex
      };

      return { success: true };
    } else {
      // 相手本体への直接攻撃（相手フィールドに虫がいない場合のみ可能）
      if (opponent.field.length > 0) {
        return { success: false, error: ErrorType.INVALID_TARGET };
      }

      // 縄張りがあるならダメージを適用
      if (opponent.territory.length > 0) {
        opponent.territory.pop();
      } else {
        // 縄張りがなく、相手本体に攻撃できた場合はゲーム終了
        this.winner = player;
        this.ended = true;
      }

      this.lastAction = {
        ...action,
        type: ActionType.ATTACK,
        techniqueIndex
      };

      return { success: true };
    }
  }

  /**
   * エサをセットする処理
   */
  private handleSetFood(action: Action, player: PlayerModel): { success: boolean; error?: ErrorType } {
    // セットフェーズ以外はエサをセットできない
    if (this.phase !== GamePhase.SET) {
      return { success: false, error: ErrorType.INVALID_ACTION };
    }

    // カードIDから手札のインデックスを検索
    const cardIndex = player.hand.findIndex(card => card.id === action.cardId);
    if (cardIndex === -1) {
      return { success: false, error: ErrorType.CARD_NOT_FOUND };
    }

    // エサをセット
    const setCard = player.setFood(cardIndex);
    if (!setCard) {
      return { success: false, error: ErrorType.INVALID_ACTION };
    }

    this.lastAction = action;
    this.nextPhase(); // セットフェーズからメインフェーズへ
    return { success: true };
  }

  /**
   * 術（カード効果）を使用する処理
   */
  private handleUseTechnique(action: Action, player: PlayerModel): { success: boolean; error?: ErrorType } {
    // メインフェーズ以外は術を使用できない
    if (this.phase !== GamePhase.MAIN) {
      return { success: false, error: ErrorType.INVALID_ACTION };
    }

    // TODO: 術カードの効果を実装

    this.lastAction = action;
    return { success: true };
  }

  /**
   * ターン終了処理
   */
  private handleEndTurn(): { success: boolean; error?: ErrorType } {
    // 現在のフェーズをターン終了に
    this.phase = GamePhase.END;
    
    // 次のフェイズ（次のプレイヤーのドローフェーズ）へ
    this.nextPhase();
    
    // 次のプレイヤーがドローする（先攻1ターン目以外）
    if (!(this.turn === 1 && this.currentPlayerIndex === 0)) {
      const currentPlayer = this.getCurrentPlayer();
      const drawnCard = currentPlayer.drawCard();
      
      // ドローできなかった場合（山札切れ）は勝敗判定
      if (!drawnCard) {
        this.checkDeckOutWinner();
      }

    }
    this.nextPhase();
    
    return { success: true };
  }

  /**
   * 降伏処理
   */
  private handleSurrender(player: PlayerModel): { success: boolean; error?: ErrorType } {
    // 相手を勝者に設定
    this.winner = this.getOpponentPlayer();
    this.ended = true;
    return { success: true };
  }

  /**
   * 山札切れ時の勝敗判定
   */
  private checkDeckOutWinner(): void {
    const player1Territory = this.players[0].territory.length;
    const player2Territory = this.players[1].territory.length;
    
    if (player1Territory > player2Territory) {
      this.winner = this.players[0];
    } else if (player2Territory > player1Territory) {
      this.winner = this.players[1];
    }
    // 同数の場合はwinner未設定（引き分け）
    
    this.ended = true;
  }

  /**
   * ゲームの状態をJSON形式で返す
   */
  toJSON(): GameState {
    return {
      id: this.id,
      players: this.players.map(player => player.toJSON()),
      currentPlayerIndex: this.currentPlayerIndex,
      phase: this.phase,
      turn: this.turn,
      winner: this.winner?.toJSON(),
      lastAction: this.lastAction,
      started: this.started
    };
  }

  toJSONForPlayer(playerId: string) {
    const playerIndex = this.players.findIndex(p => p.id === playerId);
    const player = this.players[playerIndex];
    const opponent = this.players[1-playerIndex];
  
    if (playerIndex === -1) {
      throw new Error('プレイヤーが見つかりません');
    }
    
    // 自分と相手のインデックスを特定
    const myIndex = playerIndex;
    const opponentIndex = 1 - playerIndex; // 2人プレイヤーゲームなので
    
    // プレイヤーの視点に合わせて調整したcurrentPlayerIndex
    // 0が常に「自分のターン」、1が「相手のターン」を意味するように変換
    const adjustedCurrentPlayerIndex = this.currentPlayerIndex === myIndex ? 0 : 1;
    
    return {
      id: this.id,
      started: this.started,
      phase: this.phase,
      turn: this.turn,
      currentPlayerIndex: adjustedCurrentPlayerIndex,
      players: [
        {
          id: player.id,
          username: player.username,
          isReady: player.isReady,
          deck: player.deck,
          hand: player.hand,      
          field: player.field,  
          foodArea: player.foodArea,
          territory: player.territory,
          graveyard: player.graveyard,
          currentFood: player.currentFood
        },
        {
          id: opponent.id,
          username: opponent.username,
          isReady: opponent.isReady,
          deck: opponent.deck,
          hand: opponent.hand,
          field: opponent.field,       
          foodArea: opponent.foodArea,
          territory: opponent.territory,
          graveyard: opponent.graveyard,
          currentFood: opponent.currentFood
        }
      ],
      // その他のゲーム情報
    };
  }
}