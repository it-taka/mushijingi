import { Card, CardType, Action, ActionType } from '../types';

/**
 * デッキのバリデーション
 */
export const validateDeck = (deck: Card[]): { valid: boolean; message?: string } => {
  // デッキサイズの確認
  if (!deck || deck.length !== 20) {
    return { valid: false, message: 'デッキは20枚である必要があります' };
  }

  // 同名カードの枚数制限チェック
  const cardCounts = new Map<string, number>();
  for (const card of deck) {
    const name = card.name;
    const count = cardCounts.get(name) || 0;
    cardCounts.set(name, count + 1);
    
    if (cardCounts.get(name)! > 2) {
      return { valid: false, message: `同名カード「${name}」は2枚までしか入れられません` };
    }
  }

  return { valid: true };
};

/**
 * アクションのバリデーション
 */
export const validateAction = (action: Action): { valid: boolean; message?: string } => {
  // アクションタイプの確認
  if (!Object.values(ActionType).includes(action.type)) {
    return { valid: false, message: '不正なアクションタイプです' };
  }

  // プレイヤーIDの確認
  if (!action.playerId) {
    return { valid: false, message: 'プレイヤーIDが指定されていません' };
  }

  // アクションタイプに応じた追加チェック
  switch (action.type) {
    case ActionType.PLAY_CARD:
    case ActionType.SET_FOOD:
      if (!action.cardId) {
        return { valid: false, message: 'カードIDが指定されていません' };
      }
      break;
      
    case ActionType.ATTACK:
      if (!action.cardId) {
        return { valid: false, message: '攻撃するカードが指定されていません' };
      }
      break;
      
    case ActionType.USE_TECHNIQUE:
      if (!action.cardId) {
        return { valid: false, message: '技を使用するカードが指定されていません' };
      }
      if (action.techniqueIndex === undefined) {
        return { valid: false, message: '使用する技が指定されていません' };
      }
      break;
      
    case ActionType.SKIP_SET_PHASE:
    case ActionType.END_TURN:
    case ActionType.SURRENDER:
      // これらのアクションは追加パラメータ不要
      break;
  }

  return { valid: true };
};

/**
 * ユーザー名のバリデーション
 */
export const validateUsername = (username: string): { valid: boolean; message?: string } => {
  if (!username || username.trim() === '') {
    return { valid: false, message: 'ユーザー名を入力してください' };
  }
  
  if (username.length < 2) {
    return { valid: false, message: 'ユーザー名は2文字以上である必要があります' };
  }
  
  if (username.length > 20) {
    return { valid: false, message: 'ユーザー名は20文字以下である必要があります' };
  }
  
  return { valid: true };
};

/**
 * ゲームIDのバリデーション
 */
export const validateGameId = (gameId: string): { valid: boolean; message?: string } => {
  if (!gameId || gameId.trim() === '') {
    return { valid: false, message: 'ゲームIDを入力してください' };
  }
  
  // 4桁の数字フォーマットチェック（更新されたゲームIDフォーマット）
  const gameIdRegex = /^\d{4}$/;
  if (!gameIdRegex.test(gameId)) {
    return { valid: false, message: '無効なゲームIDです' };
  }
  
  return { valid: true };
};