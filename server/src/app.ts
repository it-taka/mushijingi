import express, { Request, Response } from 'express';
import cors from 'cors';
import { cardService } from './services/CardService';

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

// ヘルスチェック用のエンドポイント
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'OK' });
});

export default app;