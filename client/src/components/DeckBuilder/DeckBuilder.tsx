import React, { useState, useEffect } from 'react';
import { Card as CardType, CardType as CardTypeEnum, CardAttribute } from '../../types';
import { cardApi, deckApi } from '../../services/api';
import { Card } from '../Card/Card';
import './DeckBuilder.css';

interface DeckBuilderProps {
  onDeckBuilt: (deck: CardType[]) => void;
  onClose: () => void;
  initialDeck?: CardType[];
}

export const DeckBuilder: React.FC<DeckBuilderProps> = ({ 
  onDeckBuilt, 
  onClose, 
  initialDeck = [] 
}) => {
  const [allCards, setAllCards] = useState<CardType[]>([]);
  const [deck, setDeck] = useState<CardType[]>(initialDeck);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAttribute, setSelectedAttribute] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedRarity, setSelectedRarity] = useState<string>('');
  const [costRange, setCostRange] = useState<{ min: number; max: number }>({ min: 0, max: 10 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // カードデータを取得
  useEffect(() => {
    const fetchCards = async () => {
      try {
        setLoading(true);
        const cards = await cardApi.getAllCards();
        setAllCards(cards);
      } catch (err) {
        setError('カードデータの取得に失敗しました');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchCards();
  }, []);

  // フィルタリングされたカードリスト
  const filteredCards = allCards.filter(card => {
    const matchesSearch = card.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAttribute = !selectedAttribute || card.attribute === selectedAttribute;
    const matchesType = !selectedType || card.type === selectedType;
    const matchesRarity = !selectedRarity || card.rarity === selectedRarity;
    const matchesCost = card.cost >= costRange.min && card.cost <= costRange.max;

    return matchesSearch && matchesAttribute && matchesType && matchesRarity && matchesCost;
  });

  // デッキにカードを追加
  const addCardToDeck = (card: CardType) => {
    // 既にデッキに入っている枚数を確認
    const cardCount = deck.filter(c => c.name === card.name).length;
    
    if (deck.length >= 20) {
      alert('デッキは20枚までです');
      return;
    }
    
    if (cardCount >= 2) {
      alert('同名カードは2枚までです');
      return;
    }

    setDeck([...deck, card]);
  };

  // デッキからカードを削除
  const removeCardFromDeck = (index: number) => {
    const newDeck = [...deck];
    newDeck.splice(index, 1);
    setDeck(newDeck);
  };

  // デッキの完成
  const completeDeck = () => {
    if (deck.length !== 20) {
      alert('デッキは20枚である必要があります');
      return;
    }

    // 同名カード制限チェック
    const cardCounts = new Map<string, number>();
    for (const card of deck) {
      const count = cardCounts.get(card.name) || 0;
      if (count >= 2) {
        alert(`同名カード「${card.name}」は2枚までです`);
        return;
      }
      cardCounts.set(card.name, count + 1);
    }

    onDeckBuilt(deck);
  };

  // ランダムデッキ生成
  const generateRandomDeck = async () => {
    try {
      const randomDeck = await deckApi.getRandomDeck();
      setDeck(randomDeck);
    } catch (err) {
      alert('ランダムデッキの生成に失敗しました');
    }
  };

  // レアリティの色を取得
  const getRarityColor = (rarity: string): string => {
    switch (rarity) {
      case 'LR': return '#ff6b6b';
      case 'SR': return '#ffd93d';
      case 'R': return '#74b9ff';
      case 'N': return '#ddd';
      default: return '#aaa';
    }
  };

  // コストの色を取得
  const getCostColor = (cost: number): string => {
    if (cost <= 1) return '#2ecc71';
    if (cost <= 3) return '#f39c12';
    if (cost <= 5) return '#e74c3c';
    return '#8e44ad';
  };

  if (loading) {
    return (
      <div className="deck-builder-loading">
        <div className="loading-spinner"></div>
        <p>カードを読み込み中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="deck-builder-error">
        <h3>エラー</h3>
        <p>{error}</p>
        <button onClick={onClose}>閉じる</button>
      </div>
    );
  }

  return (
    <div className="deck-builder-overlay">
      <div className="deck-builder-container">
        {/* ヘッダー */}
        <div className="deck-builder-header">
          <h2>デッキビルダー</h2>
          <div className="deck-count">
            デッキ: {deck.length}/20
          </div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="deck-builder-content">
          {/* フィルター */}
          <div className="filters-section">
            <div className="filter-row">
              <input
                type="text"
                placeholder="カード名で検索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
              
              <select
                value={selectedAttribute}
                onChange={(e) => setSelectedAttribute(e.target.value)}
                className="filter-select"
              >
                <option value="">全ての属性</option>
                <option value={CardAttribute.RED}>赤</option>
                <option value={CardAttribute.BLUE}>青</option>
                <option value={CardAttribute.GREEN}>緑</option>
              </select>

              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="filter-select"
              >
                <option value="">全てのタイプ</option>
                <option value={CardTypeEnum.BUG}>虫</option>
                <option value={CardTypeEnum.ENHANCEMENT}>強化</option>
                <option value={CardTypeEnum.TECHNIQUE}>術</option>
              </select>

              <select
                value={selectedRarity}
                onChange={(e) => setSelectedRarity(e.target.value)}
                className="filter-select"
              >
                <option value="">全てのレアリティ</option>
                <option value="LR">LR</option>
                <option value="SR">SR</option>
                <option value="R">R</option>
                <option value="N">N</option>
              </select>
            </div>

            <div className="cost-filter">
              <label>コスト: {costRange.min} - {costRange.max}</label>
              <input
                type="range"
                min="0"
                max="10"
                value={costRange.min}
                onChange={(e) => setCostRange({ ...costRange, min: parseInt(e.target.value) })}
              />
              <input
                type="range"
                min="0"
                max="10"
                value={costRange.max}
                onChange={(e) => setCostRange({ ...costRange, max: parseInt(e.target.value) })}
              />
            </div>
          </div>

          <div className="deck-builder-main">
            {/* カードリスト */}
            <div className="card-list-section">
              <div className="section-header">
                <h3>カード一覧 ({filteredCards.length}枚)</h3>
              </div>
              <div className="card-list">
                {filteredCards.map((card) => {
                  const inDeckCount = deck.filter(c => c.name === card.name).length;
                  const canAdd = deck.length < 20 && inDeckCount < 2;
                  
                  return (
                    <div key={card.id} className="card-list-item">
                      <div className="card-preview">
                        <Card
                          card={card}
                          isSelected={false}
                          isPlayable={canAdd}
                          onClick={() => canAdd && addCardToDeck(card)}
                          showDetails={false}
                        />
                      </div>
                      <div className="card-info">
                        <div className="card-name">{card.name}</div>
                        <div className="card-details">
                          <span 
                            className="card-cost"
                            style={{ backgroundColor: getCostColor(card.cost) }}
                          >
                            {card.cost}
                          </span>
                          <span className="card-attribute">{card.attribute}</span>
                          <span className="card-type">{card.type}</span>
                          <span 
                            className="card-rarity"
                            style={{ color: getRarityColor(card.rarity) }}
                          >
                            {card.rarity}
                          </span>
                        </div>
                        <div className="deck-count-info">
                          デッキ内: {inDeckCount}/2
                        </div>
                        {canAdd && (
                          <button 
                            className="add-card-btn"
                            onClick={() => addCardToDeck(card)}
                          >
                            追加
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 現在のデッキ */}
            <div className="current-deck-section">
              <div className="section-header">
                <h3>現在のデッキ ({deck.length}/20)</h3>
                <div className="deck-actions">
                  <button 
                    className="random-deck-btn"
                    onClick={generateRandomDeck}
                  >
                    ランダム生成
                  </button>
                  <button 
                    className="clear-deck-btn"
                    onClick={() => setDeck([])}
                  >
                    クリア
                  </button>
                </div>
              </div>
              
              <div className="deck-list">
                {deck.map((card, index) => (
                  <div key={`deck-${index}`} className="deck-card-item">
                    <div className="deck-card-preview">
                      <Card
                        card={card}
                        isSelected={false}
                        isPlayable={true}
                        onClick={() => removeCardFromDeck(index)}
                        showDetails={false}
                      />
                    </div>
                    <div className="deck-card-info">
                      <div className="card-name">{card.name}</div>
                      <button 
                        className="remove-card-btn"
                        onClick={() => removeCardFromDeck(index)}
                      >
                        削除
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* デッキ統計 */}
              <div className="deck-stats">
                <h4>デッキ統計</h4>
                <div className="stats-grid">
                  {Object.values(CardAttribute).map(attr => {
                    const count = deck.filter(c => c.attribute === attr).length;
                    return (
                      <div key={attr} className="stat-item">
                        <span className="stat-label">{attr}:</span>
                        <span className="stat-value">{count}</span>
                      </div>
                    );
                  })}
                  {Object.values(CardTypeEnum).map(type => {
                    const count = deck.filter(c => c.type === type).length;
                    return (
                      <div key={type} className="stat-item">
                        <span className="stat-label">{type}:</span>
                        <span className="stat-value">{count}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="cost-curve">
                  <h5>コストカーブ</h5>
                  {Array.from({ length: 11 }, (_, i) => {
                    const count = deck.filter(c => c.cost === i).length;
                    return (
                      <div key={i} className="cost-bar">
                        <span className="cost-label">{i}:</span>
                        <div 
                          className="cost-bar-fill"
                          style={{ 
                            width: `${count * 20}px`,
                            backgroundColor: getCostColor(i)
                          }}
                        />
                        <span className="cost-count">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* フッター */}
        <div className="deck-builder-footer">
          <button 
            className="complete-deck-btn"
            onClick={completeDeck}
            disabled={deck.length !== 20}
          >
            デッキ完成 ({deck.length}/20)
          </button>
          <button className="cancel-btn" onClick={onClose}>
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
};