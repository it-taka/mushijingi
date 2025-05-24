import express, { Request, Response } from 'express';
import cors from 'cors';
import { cardService } from './services/CardService';
import { deckService } from './services/DeckService';

// Express アプリケーションを作成
const app = express();

// ミドルウェアの設定
app.use(cors());
app.use(express.json());

// カード一覧を取得するAPI
app.get('/api/cards', (req: Request, res: Response) => {
  const cards = cardService.getAllCards();
  res.json({ cards });
});

// IDでカードを取得するAPI
app.get('/api/cards/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const card = cardService.getCardById(id);
  
  if (!card) {
    return res.status(404).json({ error: 'カードが見つかりません' });
  }
  
  res.json({ card });
});

// 名前でカードを検索するAPI
app.get('/api/cards/search/name', (req: Request, res: Response) => {
  const { name } = req.query;
  
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: '検索キーワードを指定してください' });
  }
  
  const cards = cardService.searchCardsByName(name);
  res.json({ cards });
});

// タイプでカードをフィルタリングするAPI
app.get('/api/cards/filter/type', (req: Request, res: Response) => {
  const { type } = req.query;
  
  if (!type || typeof type !== 'string') {
    return res.status(400).json({ error: 'タイプを指定してください' });
  }
  
  const cards = cardService.filterCardsByType(type);
  res.json({ cards });
});

// 属性でカードをフィルタリングするAPI
app.get('/api/cards/filter/attribute', (req: Request, res: Response) => {
  const { attribute } = req.query;
  
  if (!attribute || typeof attribute !== 'string') {
    return res.status(400).json({ error: '属性を指定してください' });
  }
  
  const cards = cardService.filterCardsByAttribute(attribute);
  res.json({ cards });
});

// コスト範囲でカードをフィルタリングするAPI
app.get('/api/cards/filter/cost', (req: Request, res: Response) => {
  const minCost = parseInt(req.query.minCost as string) || 0;
  const maxCost = parseInt(req.query.maxCost as string) || 10;
  
  const cards = cardService.filterCardsByCost(minCost, maxCost);
  res.json({ cards });
});

// レアリティでカードをフィルタリングするAPI
app.get('/api/cards/filter/rarity', (req: Request, res: Response) => {
  const { rarity } = req.query;
  
  if (!rarity || typeof rarity !== 'string') {
    return res.status(400).json({ error: 'レアリティを指定してください' });
  }
  
  const cards = cardService.filterCardsByRarity(rarity);
  res.json({ cards });
});

// セットでカードをフィルタリングするAPI
app.get('/api/cards/filter/set', (req: Request, res: Response) => {
  const { set } = req.query;
  
  if (!set || typeof set !== 'string') {
    return res.status(400).json({ error: 'セットを指定してください' });
  }
  
  const cards = cardService.filterCardsBySet(set);
  res.json({ cards });
});

// ランダムデッキを生成するAPI
app.get('/api/decks/random', (req: Request, res: Response) => {
  const deck = cardService.generateRandomDeck();
  res.json({ deck });
});

// デッキのバリデーションAPI
app.post('/api/decks/validate', (req: Request, res: Response) => {
  const { deck } = req.body;
  
  if (!deck || !Array.isArray(deck)) {
    return res.status(400).json({ error: '無効なデッキデータです' });
  }
  
  const validation = cardService.validateDeck(deck);
  res.json({ ...validation });
});

// === 新しいデッキ管理API ===

// ユーザーのデッキ一覧を取得
app.get('/api/users/:username/decks', async (req: Request, res: Response) => {
  try {
    const { username } = req.params;
    
    if (!username || username.trim() === '') {
      return res.status(400).json({ error: 'ユーザー名を指定してください' });
    }
    
    const decks = await deckService.getUserDecks(username);
    res.json({ decks });
  } catch (error: any) {
    console.error('デッキ一覧取得エラー:', error);
    res.status(500).json({ error: error.message || 'デッキ一覧の取得に失敗しました' });
  }
});

// 特定のデッキを取得
app.get('/api/users/:username/decks/:deckName', async (req: Request, res: Response) => {
  try {
    const { username, deckName } = req.params;
    
    if (!username || !deckName) {
      return res.status(400).json({ error: 'ユーザー名とデッキ名を指定してください' });
    }
    
    const deck = await deckService.loadDeck(username, deckName);
    res.json({ deck });
  } catch (error: any) {
    console.error('デッキ取得エラー:', error);
    res.status(404).json({ error: error.message || 'デッキが見つかりません' });
  }
});

// デッキを保存
app.post('/api/users/:username/decks', async (req: Request, res: Response) => {
  try {
    const { username } = req.params;
    const { deckName, cards } = req.body;
    
    if (!username || !deckName || !cards) {
      return res.status(400).json({ 
        error: 'ユーザー名、デッキ名、カードデータを指定してください' 
      });
    }
    
    // デッキのバリデーション
    const validation = deckService.validateDeck(cards);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.message });
    }
    
    const savedDeck = await deckService.saveDeck(username, deckName, cards);
    res.json({ deck: savedDeck, message: 'デッキを保存しました' });
  } catch (error: any) {
    console.error('デッキ保存エラー:', error);
    res.status(500).json({ error: error.message || 'デッキの保存に失敗しました' });
  }
});

// デッキを更新
app.put('/api/users/:username/decks/:deckName', async (req: Request, res: Response) => {
  try {
    const { username, deckName } = req.params;
    const { cards } = req.body;
    
    if (!username || !deckName || !cards) {
      return res.status(400).json({ 
        error: 'ユーザー名、デッキ名、カードデータを指定してください' 
      });
    }
    
    // デッキの存在確認
    const exists = await deckService.deckExists(username, deckName);
    if (!exists) {
      return res.status(404).json({ error: 'デッキが見つかりません' });
    }
    
    // デッキのバリデーション
    const validation = deckService.validateDeck(cards);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.message });
    }
    
    const savedDeck = await deckService.saveDeck(username, deckName, cards);
    res.json({ deck: savedDeck, message: 'デッキを更新しました' });
  } catch (error: any) {
    console.error('デッキ更新エラー:', error);
    res.status(500).json({ error: error.message || 'デッキの更新に失敗しました' });
  }
});

// デッキを削除
app.delete('/api/users/:username/decks/:deckName', async (req: Request, res: Response) => {
  try {
    const { username, deckName } = req.params;
    
    if (!username || !deckName) {
      return res.status(400).json({ error: 'ユーザー名とデッキ名を指定してください' });
    }
    
    // デッキの存在確認
    const exists = await deckService.deckExists(username, deckName);
    if (!exists) {
      return res.status(404).json({ error: 'デッキが見つかりません' });
    }
    
    await deckService.deleteDeck(username, deckName);
    res.json({ message: 'デッキを削除しました' });
  } catch (error: any) {
    console.error('デッキ削除エラー:', error);
    res.status(500).json({ error: error.message || 'デッキの削除に失敗しました' });
  }
});

// デッキをリネーム
app.put('/api/users/:username/decks/:deckName/rename', async (req: Request, res: Response) => {
  try {
    const { username, deckName } = req.params;
    const { newName } = req.body;
    
    if (!username || !deckName || !newName) {
      return res.status(400).json({ 
        error: 'ユーザー名、現在のデッキ名、新しいデッキ名を指定してください' 
      });
    }
    
    // 新しい名前のデッキが既に存在するかチェック
    const newNameExists = await deckService.deckExists(username, newName);
    if (newNameExists) {
      return res.status(409).json({ error: 'その名前のデッキは既に存在します' });
    }
    
    const renamedDeck = await deckService.renameDeck(username, deckName, newName);
    res.json({ deck: renamedDeck, message: 'デッキ名を変更しました' });
  } catch (error: any) {
    console.error('デッキリネームエラー:', error);
    res.status(500).json({ error: error.message || 'デッキ名の変更に失敗しました' });
  }
});

// ユーザーのデッキ数を取得
app.get('/api/users/:username/decks/count', async (req: Request, res: Response) => {
  try {
    const { username } = req.params;
    
    if (!username) {
      return res.status(400).json({ error: 'ユーザー名を指定してください' });
    }
    
    const count = await deckService.getUserDeckCount(username);
    res.json({ count });
  } catch (error: any) {
    console.error('デッキ数取得エラー:', error);
    res.status(500).json({ error: error.message || 'デッキ数の取得に失敗しました' });
  }
});

// ヘルスチェック用のエンドポイント
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'OK' });
});

export default app;