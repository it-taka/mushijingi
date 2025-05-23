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

export default {
  card: cardApi,
  deck: deckApi,
};