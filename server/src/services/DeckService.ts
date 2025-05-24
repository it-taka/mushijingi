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
    this.initializeBaseDirectory();
  }

  /**
   * ベースディレクトリを初期化（同期的に実行）
   */
  private initializeBaseDirectory(): void {
    try {
      // 同期的にディレクトリの存在を確認
      require('fs').accessSync(this.baseDir);
    } catch {
      // ディレクトリが存在しない場合は作成
      require('fs').mkdirSync(this.baseDir, { recursive: true });
      console.log(`ベースディレクトリを作成しました: ${this.baseDir}`);
    }
  }

  /**
   * ユーザーディレクトリのパスを取得
   */
  private getUserDirectory(username: string): string {
    // 入力検証
    if (!username || typeof username !== 'string' || username.trim() === '') {
      throw new Error('ユーザー名が無効です');
    }

    // ファイル名として安全な文字列に変換（全角文字対応）
    const trimmedUsername = username.trim();
    // 全角文字をBase64エンコードで安全に変換
    const safeUsername = Buffer.from(trimmedUsername, 'utf8').toString('base64').replace(/[/+=]/g, '_');
    
    // 長すぎる場合は短縮
    const finalUsername = safeUsername.length > 50 ? safeUsername.substring(0, 50) : safeUsername;
    
    console.log(`ユーザーディレクトリパス生成: "${username}" -> "${finalUsername}"`);
    return path.join(this.baseDir, finalUsername);
  }

  /**
   * デッキファイルのパスを取得
   */
  private getDeckFilePath(username: string, deckName: string): string {
    // 入力検証
    if (!deckName || typeof deckName !== 'string' || deckName.trim() === '') {
      throw new Error('デッキ名が無効です');
    }

    const trimmedDeckName = deckName.trim();
    // 全角文字をBase64エンコードで安全に変換
    const safeDeckName = Buffer.from(trimmedDeckName, 'utf8').toString('base64').replace(/[/+=]/g, '_');
    
    // 長すぎる場合は短縮
    const finalDeckName = safeDeckName.length > 50 ? safeDeckName.substring(0, 50) : safeDeckName;
    
    const filePath = path.join(this.getUserDirectory(username), `${finalDeckName}.json`);
    console.log(`デッキファイルパス生成: "${deckName}" -> "${filePath}"`);
    return filePath;
  }

  /**
   * ユーザーディレクトリが存在することを確認（非同期）
   */
  private async ensureUserDirectory(username: string): Promise<void> {
    const userDir = this.getUserDirectory(username);
    console.log(`ユーザーディレクトリを確認中: ${userDir}`);
    
    try {
      await fs.access(userDir);
      console.log(`ユーザーディレクトリは既に存在します: ${userDir}`);
    } catch (error) {
      console.log(`ユーザーディレクトリが存在しないため作成します: ${userDir}`);
      try {
        await fs.mkdir(userDir, { recursive: true });
        console.log(`ユーザーディレクトリを作成しました: ${userDir}`);
      } catch (mkdirError) {
        console.error(`ユーザーディレクトリの作成に失敗しました: ${userDir}`, mkdirError);
        throw new Error(`ユーザーディレクトリの作成に失敗: ${mkdirError}`);
      }
    }
  }

  /**
   * デッキを保存
   */
  async saveDeck(username: string, deckName: string, cards: Card[]): Promise<SavedDeck> {
    try {
      // 入力検証
      if (!username || typeof username !== 'string' || username.trim() === '') {
        throw new Error('ユーザー名が指定されていません');
      }
      
      if (!deckName || typeof deckName !== 'string' || deckName.trim() === '') {
        throw new Error('デッキ名が指定されていません');
      }
      
      if (!Array.isArray(cards) || cards.length === 0) {
        throw new Error('カードデータが無効です');
      }

      console.log(`デッキ保存開始: ユーザー="${username.trim()}", デッキ名="${deckName.trim()}", カード数=${cards.length}`);
      
      // ユーザーディレクトリを確実に作成
      await this.ensureUserDirectory(username);

      const now = new Date().toISOString();
      const deckFilePath = this.getDeckFilePath(username, deckName);
      
      console.log(`デッキファイルパス: ${deckFilePath}`);
      
      // 既存のデッキがある場合は作成日時を保持
      let createdAt = now;
      try {
        const existingDeck = await this.loadDeck(username, deckName);
        createdAt = existingDeck.createdAt;
        console.log(`既存デッキを更新: 作成日時=${createdAt}`);
      } catch {
        console.log(`新規デッキを作成: 作成日時=${createdAt}`);
      }

      const savedDeck: SavedDeck = {
        name: deckName.trim(),
        cards: cards,
        lastModified: now,
        createdAt: createdAt
      };

      // ディレクトリが存在することを再確認
      const userDir = this.getUserDirectory(username);
      try {
        await fs.access(userDir);
      } catch {
        console.log(`ファイル保存前に再度ディレクトリを作成: ${userDir}`);
        await fs.mkdir(userDir, { recursive: true });
      }

      await fs.writeFile(deckFilePath, JSON.stringify(savedDeck, null, 2), 'utf8');
      console.log(`デッキ保存完了: ${deckFilePath}`);
      
      // 保存後に確認
      try {
        await fs.access(deckFilePath);
        console.log(`保存確認完了: ファイルが存在します`);
      } catch {
        console.error(`保存確認失敗: ファイルが存在しません`);
        throw new Error('デッキファイルの保存に失敗しました');
      }
      
      return savedDeck;
    } catch (error) {
      console.error(`デッキ保存エラー (${username}/${deckName}):`, error);
      throw new Error(`デッキの保存に失敗しました: ${error}`);
    }
  }

  /**
   * デッキを読み込み
   */
  async loadDeck(username: string, deckName: string): Promise<SavedDeck> {
    try {
      // 入力検証
      if (!username || typeof username !== 'string' || username.trim() === '') {
        throw new Error('ユーザー名が指定されていません');
      }
      
      if (!deckName || typeof deckName !== 'string' || deckName.trim() === '') {
        throw new Error('デッキ名が指定されていません');
      }

      const deckFilePath = this.getDeckFilePath(username, deckName);
      console.log(`デッキ読み込み開始: ${deckFilePath}`);
      
      const data = await fs.readFile(deckFilePath, 'utf-8');
      const deck: SavedDeck = JSON.parse(data);
      
      // バリデーション
      if (!deck.name || !Array.isArray(deck.cards)) {
        throw new Error('無効なデッキデータ');
      }
      
      console.log(`デッキ読み込み完了: ${deck.name} (${deck.cards.length}枚)`);
      return deck;
    } catch (error) {
      console.error(`デッキ読み込みエラー (${username}/${deckName}):`, error);
      throw new Error(`デッキの読み込みに失敗しました: ${error}`);
    }
  }

  /**
   * ユーザーの全デッキ一覧を取得
   */
  async getUserDecks(username: string): Promise<DeckMetadata[]> {
    try {
      // 入力検証
      if (!username || typeof username !== 'string' || username.trim() === '') {
        throw new Error('ユーザー名が指定されていません');
      }

      const userDir = this.getUserDirectory(username);
      console.log(`ユーザーデッキ一覧取得: ${userDir}`);
      
      try {
        await fs.access(userDir);
      } catch {
        console.log(`ユーザーディレクトリが存在しないため空配列を返します`);
        return [];
      }

      const files = await fs.readdir(userDir);
      const deckFiles = files.filter(file => file.endsWith('.json'));
      console.log(`デッキファイル数: ${deckFiles.length}`);
      
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
      const sortedDecks = decks.sort((a, b) => 
        new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
      );
      
      console.log(`デッキ一覧取得完了: ${sortedDecks.length}個`);
      return sortedDecks;
    } catch (error) {
      console.error(`ユーザーデッキ一覧取得エラー (${username}):`, error);
      throw new Error(`デッキ一覧の取得に失敗しました: ${error}`);
    }
  }

  /**
   * デッキを削除
   */
  async deleteDeck(username: string, deckName: string): Promise<void> {
    try {
      const deckFilePath = this.getDeckFilePath(username, deckName);
      console.log(`デッキ削除: ${deckFilePath}`);
      await fs.unlink(deckFilePath);
      console.log(`デッキ削除完了: ${deckFilePath}`);
    } catch (error) {
      console.error(`デッキ削除エラー (${username}/${deckName}):`, error);
      throw new Error(`デッキの削除に失敗しました: ${error}`);
    }
  }

  /**
   * デッキをリネーム
   */
  async renameDeck(username: string, oldName: string, newName: string): Promise<SavedDeck> {
    try {
      console.log(`デッキリネーム: ${oldName} -> ${newName}`);
      
      // 既存のデッキを読み込み
      const deck = await this.loadDeck(username, oldName);
      
      // 新しい名前で保存
      deck.name = newName;
      deck.lastModified = new Date().toISOString();
      const savedDeck = await this.saveDeck(username, newName, deck.cards);
      
      // 古いファイルを削除
      await this.deleteDeck(username, oldName);
      
      console.log(`デッキリネーム完了: ${oldName} -> ${newName}`);
      return savedDeck;
    } catch (error) {
      console.error(`デッキリネームエラー (${username}/${oldName} -> ${newName}):`, error);
      throw new Error(`デッキのリネームに失敗しました: ${error}`);
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
      const name = card.name;
      const count = cardCounts.get(name) || 0;
      cardCounts.set(name, count + 1);
      
      if (cardCounts.get(name)! > 2) {
        return { valid: false, message: `同名カード「${name}」は2枚までです` };
      }
    }

    return { valid: true };
  }
}

// シングルトンインスタンスを作成
export const deckService = new DeckService();