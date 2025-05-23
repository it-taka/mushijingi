import fs from 'fs';
import path from 'path';
import { Card } from '../types';
import { CardModel } from '../models/Card';

/**
 * カード関連の処理を行うサービス
 */
export class CardService {
  private cards: Card[] = [];
  private readonly dataPath: string;

  constructor() {
    this.dataPath = path.resolve(__dirname, '../data/cards.json');
    this.loadCards();
  }

  /**
   * カードデータをロードする
   */
  private loadCards(): void {
    try {
      const data = fs.readFileSync(this.dataPath, 'utf8');
      const parsed = JSON.parse(data);
      this.cards = parsed.cards || [];
    } catch (error) {
      console.error('カードデータの読み込みに失敗しました:', error);
      this.cards = [];
    }
  }

  /**
   * 全てのカードを取得
   */
  getAllCards(): Card[] {
    return [...this.cards];
  }

  /**
   * IDでカードを取得
   */
  getCardById(id: string): Card | undefined {
    return this.cards.find(card => card.id === id);
  }

  /**
   * 名前でカードを検索
   */
  searchCardsByName(name: string): Card[] {
    const lowerName = name.toLowerCase();
    return this.cards.filter(card => card.name.toLowerCase().includes(lowerName));
  }

  /**
   * タイプでカードをフィルタリング
   */
  filterCardsByType(type: string): Card[] {
    return this.cards.filter(card => card.type === type);
  }

  /**
   * 属性でカードをフィルタリング
   */
  filterCardsByAttribute(attribute: string): Card[] {
    return this.cards.filter(card => card.attribute === attribute);
  }

  /**
   * コスト範囲でカードをフィルタリング
   */
  filterCardsByCost(minCost: number, maxCost: number): Card[] {
    return this.cards.filter(card => card.cost >= minCost && card.cost <= maxCost);
  }

  /**
   * レアリティでカードをフィルタリング
   */
  filterCardsByRarity(rarity: string): Card[] {
    return this.cards.filter(card => card.rarity === rarity);
  }

  /**
   * セットでカードをフィルタリング
   */
  filterCardsBySet(set: string): Card[] {
    return this.cards.filter(card => card.set === set);
  }

  /**
   * デッキが有効かどうかを検証する
   */
  validateDeck(deck: Card[]): { valid: boolean; message?: string } {
    // デッキサイズの確認
    if (deck.length !== 20) {
      return { valid: false, message: 'デッキは20枚である必要があります' };
    }

    // 同名カードの枚数制限チェック
    const cardCounts = new Map<string, number>();
    for (const card of deck) {
      const count = cardCounts.get(card.name) || 0;
      if (count >= 2) {
        return { valid: false, message: `同名カード「${card.name}」は2枚までしか入れられません` };
      }
      cardCounts.set(card.name, count + 1);
    }

    // カードの存在確認
    for (const card of deck) {
      const foundCard = this.getCardById(card.id);
      if (!foundCard) {
        return { valid: false, message: `カード「${card.name}」は存在しません` };
      }
    }

    return { valid: true };
  }

  /**
   * ランダムなデッキを生成する
   */
  generateRandomDeck(): Card[] {
    const shuffled = [...this.cards].sort(() => 0.5 - Math.random());
    
    // 20枚を選択
    const selectedCards = shuffled.slice(0, 20);
    
    // 同名カードの制限を適用
    const uniqueNames = new Set<string>();
    const finalDeck: Card[] = [];
    
    for (const card of selectedCards) {
      if (!uniqueNames.has(card.name) || 
          (finalDeck.filter(c => c.name === card.name).length < 2)) {
        finalDeck.push(card);
        uniqueNames.add(card.name);
        
        if (finalDeck.length >= 20) {
          break;
        }
      }
    }
    
    // 足りない場合は追加で選択
    while (finalDeck.length < 20) {
      const remainingCards = shuffled.filter(card => 
        !finalDeck.some(c => c.id === card.id) && 
        finalDeck.filter(c => c.name === card.name).length < 2
      );
      
      if (remainingCards.length === 0) {
        break;
      }
      
      finalDeck.push(remainingCards[0]);
    }
    
    return finalDeck;
  }
}

// シングルトンインスタンスを作成
export const cardService = new CardService();