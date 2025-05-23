import { Card, CardType, CardAttribute, Technique } from '../types';

export class CardModel implements Card {
  id: string;
  name: string;
  type: CardType;
  attribute: CardAttribute;
  cost: number;
  techniques?: Technique[];
  flavor_text?: string;
  rarity: string;
  set: string;
  image: string;

  constructor(data: Card) {
    this.id = data.id;
    this.name = data.name;
    this.type = data.type;
    this.attribute = data.attribute;
    this.cost = data.cost;
    this.techniques = data.techniques;
    this.flavor_text = data.flavor_text;
    this.rarity = data.rarity;
    this.set = data.set;
    this.image = data.image;
  }

  /**
   * カードが虫かどうか
   */
  isBug(): boolean {
    return this.type === CardType.BUG;
  }

  /**
   * カードが強化カードかどうか
   */
  isEnhancement(): boolean {
    return this.type === CardType.ENHANCEMENT;
  }

  /**
   * カードが術カードかどうか
   */
  isTechnique(): boolean {
    return this.type === CardType.TECHNIQUE;
  }

  /**
   * カードの攻撃力を取得（技が指定されている場合はその技の攻撃力を返す）
   */
  getAttack(techniqueIndex?: number): number {
    if (!this.isBug() || !this.techniques || this.techniques.length === 0) {
      return 0;
    }

    if (techniqueIndex !== undefined && this.techniques[techniqueIndex]) {
      return this.techniques[techniqueIndex].attack || 0;
    }

    // デフォルトは最初の技の攻撃力
    return this.techniques[0].attack || 0;
  }

  /**
   * カードのJSONオブジェクトを返す
   */
  toJSON(): Card {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      attribute: this.attribute,
      cost: this.cost,
      techniques: this.techniques,
      flavor_text: this.flavor_text,
      rarity: this.rarity,
      set: this.set,
      image: this.image
    };
  }
}