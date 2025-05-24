import { Card } from '../types';

// APIのベースURL
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

/**
 * API呼び出しのためのヘルパー関数
 */
const fetchApi = async (endpoint: string, options: RequestInit = {}) => {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `APIエラー: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API呼び出しエラー:', error);
    throw error;
  }
};

/**
 * カード関連のAPI
 */
export const cardApi = {
  // 全てのカードを取得
  getAllCards: async (): Promise<Card[]> => {
    const response = await fetchApi('/cards');
    return response.cards;
  },

  // IDでカードを取得
  getCardById: async (id: string): Promise<Card> => {
    const response = await fetchApi(`/cards/${id}`);
    return response.card;
  },

  // 名前でカードを検索
  searchCardsByName: async (name: string): Promise<Card[]> => {
    const response = await fetchApi(`/cards/search/name?name=${encodeURIComponent(name)}`);
    return response.cards;
  },

  // タイプでカードをフィルタリング
  filterCardsByType: async (type: string): Promise<Card[]> => {
    const response = await fetchApi(`/cards/filter/type?type=${encodeURIComponent(type)}`);
    return response.cards;
  },

  // 属性でカードをフィルタリング
  filterCardsByAttribute: async (attribute: string): Promise<Card[]> => {
    const response = await fetchApi(`/cards/filter/attribute?attribute=${encodeURIComponent(attribute)}`);
    return response.cards;
  },

  // コスト範囲でカードをフィルタリング
  filterCardsByCost: async (minCost: number, maxCost: number): Promise<Card[]> => {
    const response = await fetchApi(`/cards/filter/cost?minCost=${minCost}&maxCost=${maxCost}`);
    return response.cards;
  },

  // レアリティでカードをフィルタリング
  filterCardsByRarity: async (rarity: string): Promise<Card[]> => {
    const response = await fetchApi(`/cards/filter/rarity?rarity=${encodeURIComponent(rarity)}`);
    return response.cards;
  },

  // セットでカードをフィルタリング
  filterCardsBySet: async (set: string): Promise<Card[]> => {
    const response = await fetchApi(`/cards/filter/set?set=${encodeURIComponent(set)}`);
    return response.cards;
  }
};

/**
 * デッキ関連のAPI
 */
export const deckApi = {
  // ランダムデッキを生成
  getRandomDeck: async (): Promise<Card[]> => {
    const response = await fetchApi('/decks/random');
    return response.deck;
  },

  // デッキのバリデーション
  validateDeck: async (deck: Card[]): Promise<{ valid: boolean; message?: string }> => {
    const response = await fetchApi('/decks/validate', {
      method: 'POST',
      body: JSON.stringify({ deck }),
    });
    return response;
  }
};

/**
 * ユーザーデッキ管理API
 */
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

export const userDeckApi = {
  // ユーザーのデッキ一覧を取得
  getUserDecks: async (username: string): Promise<DeckMetadata[]> => {
    if (!username || username.trim() === '') {
      throw new Error('ユーザー名を指定してください');
    }
    
    const response = await fetchApi(`/users/${encodeURIComponent(username)}/decks`);
    return response.decks;
  },

  // 特定のデッキを取得
  getDeck: async (username: string, deckName: string): Promise<SavedDeck> => {
    if (!username || !deckName) {
      throw new Error('ユーザー名とデッキ名を指定してください');
    }
    
    const response = await fetchApi(
      `/users/${encodeURIComponent(username)}/decks/${encodeURIComponent(deckName)}`
    );
    return response.deck;
  },

  // デッキを保存
  saveDeck: async (username: string, deckName: string, cards: Card[]): Promise<SavedDeck> => {
    if (!username || !deckName || !cards) {
      throw new Error('ユーザー名、デッキ名、カードデータを指定してください');
    }
    
    const response = await fetchApi(`/users/${encodeURIComponent(username)}/decks`, {
      method: 'POST',
      body: JSON.stringify({ deckName, cards }),
    });
    return response.deck;
  },

  // デッキを更新
  updateDeck: async (username: string, deckName: string, cards: Card[]): Promise<SavedDeck> => {
    if (!username || !deckName || !cards) {
      throw new Error('ユーザー名、デッキ名、カードデータを指定してください');
    }
    
    const response = await fetchApi(
      `/users/${encodeURIComponent(username)}/decks/${encodeURIComponent(deckName)}`,
      {
        method: 'PUT',
        body: JSON.stringify({ cards }),
      }
    );
    return response.deck;
  },

  // デッキを削除
  deleteDeck: async (username: string, deckName: string): Promise<void> => {
    if (!username || !deckName) {
      throw new Error('ユーザー名とデッキ名を指定してください');
    }
    
    await fetchApi(
      `/users/${encodeURIComponent(username)}/decks/${encodeURIComponent(deckName)}`,
      {
        method: 'DELETE',
      }
    );
  },

  // デッキをリネーム
  renameDeck: async (username: string, oldName: string, newName: string): Promise<SavedDeck> => {
    if (!username || !oldName || !newName) {
      throw new Error('ユーザー名、現在のデッキ名、新しいデッキ名を指定してください');
    }
    
    const response = await fetchApi(
      `/users/${encodeURIComponent(username)}/decks/${encodeURIComponent(oldName)}/rename`,
      {
        method: 'PUT',
        body: JSON.stringify({ newName }),
      }
    );
    return response.deck;
  },

  // ユーザーのデッキ数を取得
  getUserDeckCount: async (username: string): Promise<number> => {
    if (!username) {
      throw new Error('ユーザー名を指定してください');
    }
    
    const response = await fetchApi(`/users/${encodeURIComponent(username)}/decks/count`);
    return response.count;
  },

  // デッキの存在確認
  deckExists: async (username: string, deckName: string): Promise<boolean> => {
    try {
      await userDeckApi.getDeck(username, deckName);
      return true;
    } catch {
      return false;
    }
  }
};

export default {
  card: cardApi,
  deck: deckApi,
  userDeck: userDeckApi,
};