import fs from 'fs/promises';
import path from 'path';
import { Card } from '../types';

export interface SavedDeck {
  name: string;
  cards: Card[];
  lastModified: string;
  createdAt: string;
}

export interface DeckMetadata {
  name: string;
  cardCount: number;
  lastModified: string;
  createdAt: string;
}

/**
 * デッキ管理サービス
 */
export class DeckService {
  private readonly baseDir: string;

  constructor() {
    this.baseDir = path.resolve(__dirname, '../data/decks');
    this.ensureBaseDirectory();
  }

  /**
   * ベースディレクトリが存在することを確認
   */
  private async ensureBaseDirectory(): Promise<void> {
    try {
      await fs.access(this.baseDir);
    } catch {
      await fs.mkdir(this.baseDir, { recursive: true });
    }
  }

  /**
   * ユーザーディレクトリのパスを取得
   */
  private getUserDirectory(username: string): string {
    // ファイル名として安全な文字列に変換
    const safeUsername = username.replace(/[^a-zA-Z0-9_-]/g, '_');
    return path.join(this.baseDir, safeUsername);
  }

  /**
   * デッキファイルのパスを取得
   */
  private getDeckFilePath(username: string, deckName: string): string {
    const safeDeckName = deckName.replace(/[^a-zA-Z0-9_-]/g, '_');
    return path.join(this.getUserDirectory(username), `${safeDeckName}.json`);
  }

  /**
   * ユーザーディレクトリが存在することを確認
   */
  private async ensureUserDirectory(username: string): Promise<void> {
    const userDir = this.getUserDirectory(username);
    try {
      await fs.access(userDir);
    } catch {
      await fs.mkdir(userDir, { recursive: true });
    }
  }

  /**
   * デッキを保存
   */
  async saveDeck(username: string, deckName: string, cards: Card[]): Promise<SavedDeck> {
    try {
      await this.ensureUserDirectory(username);

      const now = new Date().toISOString();
      const deckFilePath = this.getDeckFilePath(username, deckName);
      
      // 既存のデッキがある場合は作成日時を保持
      let createdAt = now;
      try {
        const existingDeck = await this.loadDeck(username, deckName);
        createdAt = existingDeck.createdAt;
      } catch {
        // 新規デッキの場合は現在時刻を使用
      }

      const savedDeck: SavedDeck = {
        name: deckName,
        cards: cards,
        lastModified: now,
        createdAt: createdAt
      };

      await fs.writeFile(deckFilePath, JSON.stringify(savedDeck, null, 2));
      return savedDeck;
    } catch (error) {
      console.error(`デッキ保存エラー (${username}/${deckName}):`, error);
      throw new Error('デッキの保存に失敗しました');
    }
  }

  /**
   * デッキを読み込み
   */
  async loadDeck(username: string, deckName: string): Promise<SavedDeck> {
    try {
      const deckFilePath = this.getDeckFilePath(username, deckName);
      const data = await fs.readFile(deckFilePath, 'utf-8');
      const deck: SavedDeck = JSON.parse(data);
      
      // バリデーション
      if (!deck.name || !Array.isArray(deck.cards)) {
        throw new Error('無効なデッキデータ');
      }
      
      return deck;
    } catch (error) {
      console.error(`デッキ読み込みエラー (${username}/${deckName}):`, error);
      throw new Error('デッキの読み込みに失敗しました');
    }
  }

  /**
   * ユーザーの全デッキ一覧を取得
   */
  async getUserDecks(username: string): Promise<DeckMetadata[]> {
    try {
      const userDir = this.getUserDirectory(username);
      
      try {
        await fs.access(userDir);
      } catch {
        // ユーザーディレクトリが存在しない場合は空配列を返す
        return [];
      }

      const files = await fs.readdir(userDir);
      const deckFiles = files.filter(file => file.endsWith('.json'));
      
      const decks: DeckMetadata[] = [];
      
      for (const file of deckFiles) {
        try {
          const filePath = path.join(userDir, file);
          const data = await fs.readFile(filePath, 'utf-8');
          const deck: SavedDeck = JSON.parse(data);
          
          decks.push({
            name: deck.name,
            cardCount: deck.cards.length,
            lastModified: deck.lastModified,
            createdAt: deck.createdAt
          });
        } catch (error) {
          console.error(`デッキファイル読み込みエラー (${file}):`, error);
          // 破損したファイルは無視して続行
        }
      }
      
      // 最終更新日時でソート（新しい順）
      return decks.sort((a, b) => 
        new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
      );
    } catch (error) {
      console.error(`ユーザーデッキ一覧取得エラー (${username}):`, error);
      throw new Error('デッキ一覧の取得に失敗しました');
    }
  }

  /**
   * デッキを削除
   */
  async deleteDeck(username: string, deckName: string): Promise<void> {
    try {
      const deckFilePath = this.getDeckFilePath(username, deckName);
      await fs.unlink(deckFilePath);
    } catch (error) {
      console.error(`デッキ削除エラー (${username}/${deckName}):`, error);
      throw new Error('デッキの削除に失敗しました');
    }
  }

  /**
   * デッキをリネーム
   */
  async renameDeck(username: string, oldName: string, newName: string): Promise<SavedDeck> {
    try {
      // 既存のデッキを読み込み
      const deck = await this.loadDeck(username, oldName);
      
      // 新しい名前で保存
      deck.name = newName;
      deck.lastModified = new Date().toISOString();
      const savedDeck = await this.saveDeck(username, newName, deck.cards);
      
      // 古いファイルを削除
      await this.deleteDeck(username, oldName);
      
      return savedDeck;
    } catch (error) {
      console.error(`デッキリネームエラー (${username}/${oldName} -> ${newName}):`, error);
      throw new Error('デッキのリネームに失敗しました');
    }
  }

  /**
   * デッキの存在確認
   */
  async deckExists(username: string, deckName: string): Promise<boolean> {
    try {
      const deckFilePath = this.getDeckFilePath(username, deckName);
      await fs.access(deckFilePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * ユーザーのデッキ数を取得
   */
  async getUserDeckCount(username: string): Promise<number> {
    try {
      const decks = await this.getUserDecks(username);
      return decks.length;
    } catch {
      return 0;
    }
  }

  /**
   * デッキのバリデーション
   */
  validateDeck(cards: Card[]): { valid: boolean; message?: string } {
    // デッキサイズの確認
    if (!cards || cards.length !== 20) {
      return { valid: false, message: 'デッキは20枚である必要があります' };
    }

    // 同名カードの枚数制限チェック
    const cardCounts = new Map<string, number>();
    for (const card of cards) {
      const count = cardCounts.get(card.name) || 0;
      if (count >= 2) {
        return { valid: false, message: `同名カード「${card.name}」は2枚までです` };
      }
      cardCounts.set(card.name, count + 1);
    }

    return { valid: true };
  }
}

// シングルトンインスタンスを作成
export const deckService = new DeckService();