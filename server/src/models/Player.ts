import { Player, Card, FieldCard } from '../types';
import { CardModel } from './Card';

export class PlayerModel implements Player {
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

  constructor(id: string, username: string, deck: Card[] = []) {
    this.id = id;
    this.username = username;
    this.deck = [...deck];
    this.hand = [];
    this.field = [];
    this.foodArea = [];
    this.territory = [];
    this.graveyard = [];
    this.currentFood = 0;
    this.isReady = false;
  }

  /**
   * ゲーム開始時の初期化
   */
  initialize(): void {
    // デッキをシャッフル
    this.shuffleDeck();
    
    // 縄張りを6枚セット
    for (let i = 0; i < 6; i++) {
      const card = this.drawCardFromDeck();
      if (card) {
        this.territory.push(card);
      }
    }
    
    // 初期手札を4枚引く
    for (let i = 0; i < 4; i++) {
      this.drawCard();
    }
  }

  setReady(ready: boolean): void {
    this.isReady = ready;
  }

  /**
   * デッキをシャッフルする
   */
  shuffleDeck(): void {
    for (let i = this.deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
    }
  }

  /**
   * カードを1枚引く
   * @returns 引いたカードまたはnull（山札が空の場合）
   */
  drawCard(): Card | null {
    const card = this.drawCardFromDeck();
    if (card) {
      this.hand.push(card);
      return card;
    }
    return null;
  }

  /**
   * 山札からカードを1枚引く（手札には加えない）
   * @returns 引いたカードまたはnull（山札が空の場合）
   */
  private drawCardFromDeck(): Card | null {
    if (this.deck.length === 0) {
      return null;
    }
    return this.deck.shift() || null;
  }

  /**
   * 手札からカードをプレイする
   * @param cardIndex 手札のインデックス
   * @returns プレイしたカードまたはnull（コストが足りない場合など）
   */
  playCard(cardIndex: number): Card | null {
    if (cardIndex < 0 || cardIndex >= this.hand.length) {
      return null;
    }

    const card = this.hand[cardIndex];
    const cardModel = new CardModel(card);

    // コストが足りるか確認
    if (cardModel.cost > this.currentFood) {
      return null;
    }

    // コストを消費
    this.currentFood -= cardModel.cost;

    // 手札から取り除く
    this.hand.splice(cardIndex, 1);

    // カードの種類に応じて処理
    if (cardModel.isBug()) {
      // 虫カードを場に出す
      this.field.push({
        card,
        enhancements: [],
        damage: 0,
        hasAttacked: false
      });
    } else if (cardModel.isTechnique()) {
      // 術カードは使用後に捨て札へ
      this.graveyard.push(card);
    }

    return card;
  }

  /**
   * エサをセットする
   * @param cardIndex 手札のインデックス
   * @returns セットしたカードまたはnull
   */
  setFood(cardIndex: number): Card | null {
    if (cardIndex < 0 || cardIndex >= this.hand.length) {
      return null;
    }

    const card = this.hand[cardIndex];
    this.hand.splice(cardIndex, 1);
    this.foodArea.push(card);
    
    return card;
  }

  /**
   * ターン開始時にエサの数を更新する
   */
  updateFood(): void {
    this.currentFood = this.foodArea.length;
  }

  /**
   * フィールド上のカードで攻撃を行う
   * @param fieldIndex フィールドのインデックス
   * @param techniqueIndex 使用する技のインデックス
   * @returns 攻撃力
   */
  attack(fieldIndex: number, techniqueIndex: number = 0): number {
    if (fieldIndex < 0 || fieldIndex >= this.field.length) {
      console.log(`攻撃エラー: 無効なフィールドインデックス ${fieldIndex}`);
      return 0;
    }

    const fieldCard = this.field[fieldIndex];
    
    // すでに攻撃済みの場合
    if (fieldCard.hasAttacked) {
      console.log(`攻撃エラー: ${fieldCard.card.name} は既に攻撃済み`);
      return 0;
    }

    // 技のインデックスが有効かチェック
    if (!fieldCard.card.techniques || techniqueIndex >= fieldCard.card.techniques.length || techniqueIndex < 0) {
      console.log(`攻撃エラー: 無効な技インデックス ${techniqueIndex} (${fieldCard.card.name})`);
      return 0;
    }

    // 指定された技の攻撃力を取得
    const selectedTechnique = fieldCard.card.techniques[techniqueIndex];
    const attack = selectedTechnique.attack || 0;
    
    console.log(`攻撃実行: ${fieldCard.card.name} の ${selectedTechnique.name} (攻撃力: ${attack})`);
    
    // 攻撃済みとマーク
    fieldCard.hasAttacked = true;
    
    return attack;
  }

  /**
   * 虫カードがダメージを受ける
   * @param fieldIndex フィールドのインデックス
   * @param damage ダメージ量
   * @returns 破壊されたかどうか
   */
  receiveDamage(fieldIndex: number, damage: number): boolean {
    if (fieldIndex < 0 || fieldIndex >= this.field.length) {
      console.log(`ダメージ処理エラー: 無効なフィールドインデックス ${fieldIndex}`);
      return false;
    }

    const fieldCard = this.field[fieldIndex];
    const oldDamage = fieldCard.damage;
    fieldCard.damage += damage;

    console.log(`ダメージ処理: ${fieldCard.card.name}`);
    console.log(`- 受けたダメージ: ${damage}`);
    console.log(`- 前回までのダメージ: ${oldDamage}`);
    console.log(`- 累積ダメージ: ${fieldCard.damage}`);
    console.log(`- 最大HP: ${fieldCard.card.hitpoints || 0}`);

    // 累積ダメージがヒットポイント以上なら破壊（修正：hitpointsと比較）
    const maxHp = fieldCard.card.hitpoints || 0;
    if (fieldCard.damage >= maxHp) {
      console.log(`- 結果: 破壊される (${fieldCard.damage} >= ${maxHp})`);
      
      // 虫カードと装備カードを捨て札に移動
      this.graveyard.push(fieldCard.card);
      this.graveyard.push(...fieldCard.enhancements);
      
      // フィールドから取り除く
      this.field.splice(fieldIndex, 1);
      
      return true;
    }
    
    console.log(`- 結果: 生存 (${fieldCard.damage} < ${maxHp})`);
    return false;
  }

  /**
   * ターン終了時の処理（旧メソッド - 互換性のため残す）
   */
  endTurn(): void {
    console.log(`ターン終了処理開始: プレイヤー ${this.username}`);
    
    // すべての虫カードの攻撃フラグとダメージをリセット
    this.field.forEach((fieldCard, index) => {
      console.log(`カード ${index}: ${fieldCard.card.name}`);
      console.log(`  - 攻撃済み: ${fieldCard.hasAttacked} -> false`);
      console.log(`  - ダメージ: ${fieldCard.damage} -> 0 (HP: ${fieldCard.card.hitpoints})`);
      
      // 攻撃フラグをリセット（次のターンで攻撃可能に）
      fieldCard.hasAttacked = false;
      
      // ダメージをリセット（蟲神器のルールではターン終了時にダメージ回復）
      fieldCard.damage = 0;
    });
    
    console.log(`ターン終了処理完了: プレイヤー ${this.username} のフィールドカード ${this.field.length}枚をリセット`);
  }

  /**
   * 全カードのダメージのみをリセット（全プレイヤー対象）
   */
  resetDamageOnly(): void {
    console.log(`ダメージリセット: プレイヤー ${this.username}`);
    
    this.field.forEach((fieldCard, index) => {
      if (fieldCard.damage > 0) {
        console.log(`  カード ${index}: ${fieldCard.card.name} - ダメージ: ${fieldCard.damage} -> 0`);
        fieldCard.damage = 0;
      }
    });
  }

  /**
   * 攻撃フラグのみをリセット（現在のプレイヤーのみ）
   */
  resetAttackFlags(): void {
    console.log(`攻撃フラグリセット: プレイヤー ${this.username}`);
    
    this.field.forEach((fieldCard, index) => {
      if (fieldCard.hasAttacked) {
        console.log(`  カード ${index}: ${fieldCard.card.name} - 攻撃済み: true -> false`);
        fieldCard.hasAttacked = false;
      }
    });
  }

  /**
   * プレイヤーの状態をJSON形式で返す
   */
  toJSON(): Player {
    return {
      id: this.id,
      username: this.username,
      deck: [...this.deck],
      hand: [...this.hand],
      field: [...this.field],
      foodArea: [...this.foodArea],
      territory: [...this.territory],
      graveyard: [...this.graveyard],
      currentFood: this.currentFood,
      isReady: this.isReady
    };
  }
}