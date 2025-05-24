import React, { useState, useEffect } from 'react';
import { Card as CardType, CardType as CardTypeEnum, CardAttribute } from '../../types';
import { cardApi, deckApi, userDeckApi } from '../../services/api';
import { Card } from '../Card/Card';
import './DeckBuilder.css';

interface DeckBuilderProps {
  onDeckBuilt: (deck: CardType[]) => void;
  onClose: () => void;
  initialDeck?: CardType[];
  username: string;
  onUsernameChange: (username: string) => void;
}

export const DeckBuilder: React.FC<DeckBuilderProps> = ({ 
  onDeckBuilt, 
  onClose, 
  initialDeck = [],
  username,
  onUsernameChange
}) => {
  const [allCards, setAllCards] = useState<CardType[]>([]);
  const [deck, setDeck] = useState<CardType[]>(initialDeck);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAttribute, setSelectedAttribute] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedRarity, setSelectedRarity] = useState<string>('');
  const [selectedCost, setSelectedCost] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUsernameModal, setShowUsernameModal] = useState(!username.trim());
  const [tempUsername, setTempUsername] = useState(username);
  const [isSaving, setIsSaving] = useState(false);

  // カードデータを取得
  useEffect(() => {
    const fetchCards = async () => {
      try {
        setLoading(true);
        console.log('カードデータを取得中...');
        const cards = await cardApi.getAllCards();
        setAllCards(cards);
        console.log(`カードデータ取得完了: ${cards.length}枚`);
      } catch (err) {
        setError('カードデータの取得に失敗しました');
        console.error('カードデータ取得エラー:', err);
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
    const matchesCost = !selectedCost || card.cost.toString() === selectedCost;

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

    console.log(`デッキにカード追加: ${card.name} (${deck.length + 1}/20)`);
    setDeck([...deck, card]);
  };

  // デッキからカードを削除（1枚ずつ）
  const removeCardFromDeck = (cardName: string) => {
    const cardIndex = deck.findIndex(c => c.name === cardName);
    if (cardIndex !== -1) {
      const newDeck = [...deck];
      newDeck.splice(cardIndex, 1);
      console.log(`デッキからカード削除: ${cardName} (${newDeck.length}/20)`);
      setDeck(newDeck);
    }
  };

  // デッキでのカード枚数を取得
  const getCardCountInDeck = (cardName: string): number => {
    return deck.filter(c => c.name === cardName).length;
  };

  // ユーザー名を設定
  const handleUsernameSubmit = () => {
    if (!tempUsername.trim()) {
      alert('ユーザー名を入力してください');
      return;
    }
    console.log(`ユーザー名設定: ${tempUsername}`);
    onUsernameChange(tempUsername);
    setShowUsernameModal(false);
  };

  // デッキの完成
  const completeDeck = async () => {
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

    console.log(`デッキ完成: ${deck.length}枚`);
    onDeckBuilt(deck);
  };

  // ランダムデッキ生成
  const generateRandomDeck = async () => {
    try {
      console.log('ランダムデッキ生成開始');
      const randomDeck = await deckApi.getRandomDeck();
      setDeck(randomDeck);
      console.log(`ランダムデッキ生成完了: ${randomDeck.length}枚`);
    } catch (err) {
      console.error('ランダムデッキ生成エラー:', err);
      alert('ランダムデッキの生成に失敗しました');
    }
  };

  // デッキをクリア
  const clearDeck = () => {
    if (deck.length > 0 && !window.confirm('デッキをクリアしますか？')) {
      return;
    }
    setDeck([]);
    console.log('デッキをクリアしました');
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

  // ユニークなカード名でグループ化されたデッキリスト
  const groupedDeckCards = () => {
    const cardGroups = new Map<string, { card: CardType; count: number }>();
    
    deck.forEach(card => {
      if (cardGroups.has(card.name)) {
        cardGroups.get(card.name)!.count++;
      } else {
        cardGroups.set(card.name, { card, count: 1 });
      }
    });
    
    return Array.from(cardGroups.values()).sort((a, b) => a.card.name.localeCompare(b.card.name));
  };

  // ユーザー名入力モーダル
  const renderUsernameModal = () => {
    if (!showUsernameModal) return null;

    return (
      <div className="username-modal-overlay">
        <div className="username-modal">
          <h3>ユーザー名を入力してください</h3>
          <p>デッキを保存するためにユーザー名が必要です。</p>
          <input
            type="text"
            value={tempUsername}
            onChange={(e) => setTempUsername(e.target.value)}
            placeholder="ユーザー名を入力..."
            className="username-input"
            onKeyPress={(e) => e.key === 'Enter' && handleUsernameSubmit()}
          />
          <div className="username-modal-actions">
            <button onClick={handleUsernameSubmit} className="confirm-btn">
              確定
            </button>
            <button onClick={onClose} className="cancel-btn">
              キャンセル
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="deck-builder-overlay">
        <div className="deck-builder-loading">
          <div className="loading-spinner"></div>
          <p>カードを読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="deck-builder-overlay">
        <div className="deck-builder-error">
          <h3>エラー</h3>
          <p>{error}</p>
          <button onClick={onClose}>閉じる</button>
        </div>
      </div>
    );
  }

  return (
    <>
      {renderUsernameModal()}
      <div className="deck-builder-overlay">
        <div className="deck-builder-container">
          {/* ヘッダー */}
          <div className="deck-builder-header">
            <h2>デッキビルダー</h2>
            <div className="user-info">
              <span className="username-display">ユーザー: {username}</span>
              <div className={`deck-count ${deck.length === 20 ? 'complete' : deck.length === 0 ? 'empty' : 'building'}`}>
                デッキ: {deck.length}/20
                {deck.length === 20 && <span className="complete-indicator"> ✓</span>}
              </div>
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
                <select
                  value={selectedCost}
                  onChange={(e) => setSelectedCost(e.target.value)}
                  className="filter-select"
                >
                  <option value="">全てのコスト</option>
                  <option value="0">0</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                  <option value="5">5</option>
                  <option value="6">6</option>
                </select>
                <span className="filter-results">
                  検索結果: {filteredCards.length}枚
                </span>
              </div>
            </div>

            <div className="deck-builder-main">
              {/* カードリスト */}
              <div className="card-list-section">
                <div className="section-header">
                  <h3>カード一覧 ({filteredCards.length}枚)</h3>
                </div>
                <div className="card-list">
                  {filteredCards.length === 0 ? (
                    <div className="no-cards-message">
                      <p>条件に一致するカードがありません</p>
                      <p>検索条件を変更してください</p>
                    </div>
                  ) : (
                    filteredCards.map((card) => {
                      const inDeckCount = getCardCountInDeck(card.name);
                      const canAdd = deck.length < 20 && inDeckCount < 2;
                      const canRemove = inDeckCount > 0;
                      
                      return (
                        <div key={card.id} className="card-list-item">
                          <div className="card-preview">
                            <Card
                              card={card}
                              isSelected={false}
                              isPlayable={true}
                              onClick={() => {}}
                              showDetails={false}
                            />
                          </div>
                          <div className="card-actions">
                            <div className="card-name">{card.name}</div>
                            <div className="card-details">
                              <span className="card-cost">コスト: {card.cost}</span>
                              <span className="card-rarity" style={{ color: getRarityColor(card.rarity) }}>
                                {card.rarity}
                              </span>
                            </div>
                            <div className="deck-count-info">
                              デッキ内: {inDeckCount}/2
                            </div>
                            <div className="action-buttons">
                              <button 
                                className="add-card-btn"
                                onClick={() => addCardToDeck(card)}
                                disabled={!canAdd}
                                title={!canAdd ? (deck.length >= 20 ? 'デッキが満杯です' : '同名カードは2枚までです') : 'デッキに追加'}
                              >
                                +
                              </button>
                              <button 
                                className="remove-card-btn"
                                onClick={() => removeCardFromDeck(card.name)}
                                disabled={!canRemove}
                                title={canRemove ? 'デッキから削除' : 'デッキにありません'}
                              >
                                -
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
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
                      title="ランダムなデッキを生成"
                    >
                      ランダム生成
                    </button>
                    {username.trim() && deck.length === 20 && (
                      <button 
                        className="save-deck-btn"
                        onClick={async () => {
                          const deckName = prompt('デッキ名を入力してください:');
                          if (deckName && deckName.trim()) {
                            try {
                              setIsSaving(true);
                              console.log(`デッキ保存開始: ${deckName.trim()}`);
                              await userDeckApi.saveDeck(username, deckName.trim(), deck);
                              console.log(`デッキ保存完了: ${deckName.trim()}`);
                              alert('デッキを保存しました！');
                            } catch (err: any) {
                              console.error('デッキ保存エラー:', err);
                              alert(err.message || 'デッキの保存に失敗しました');
                            } finally {
                              setIsSaving(false);
                            }
                          }
                        }}
                        disabled={isSaving}
                        title="現在のデッキを保存"
                      >
                        {isSaving ? '保存中...' : 'デッキを保存'}
                      </button>
                    )}
                    <button 
                      className={`complete-deck-btn ${deck.length === 20 ? 'ready' : ''}`}
                      onClick={completeDeck}
                      disabled={deck.length !== 20 || isSaving}
                      title={deck.length !== 20 ? `あと${20 - deck.length}枚必要です` : 'デッキを完成させる'}
                    >
                      {deck.length === 20 ? 'デッキ完成' : `デッキ完成 (${deck.length}/20)`}
                    </button>
                    <button 
                      className="clear-deck-btn"
                      onClick={clearDeck}
                      disabled={deck.length === 0}
                      title="デッキを空にする"
                    >
                      クリア
                    </button>
                  </div>
                </div>
                
                <div className="deck-list">
                  {deck.length === 0 ? (
                    <div className="empty-deck-message">
                      <p>デッキが空です</p>
                      <p>左のカード一覧からカードを追加してください</p>
                    </div>
                  ) : (
                    groupedDeckCards().map(({ card, count }, index) => (
                      <div key={`deck-${card.name}-${index}`} className="deck-card-item">
                        <div className="deck-card-preview">
                          <Card
                            card={card}
                            isSelected={false}
                            isPlayable={true}
                            onClick={() => {}}
                            showDetails={false}
                          />
                        </div>
                        <div className="deck-card-info">
                          <div className="card-name">{card.name}</div>
                          <div className="card-details">
                            <span className="card-cost">コスト: {card.cost}</span>
                            <span className="card-count">×{count}</span>
                          </div>
                          <div className="deck-card-actions">
                            <button 
                              className="add-card-btn small"
                              onClick={() => addCardToDeck(card)}
                              disabled={deck.length >= 20 || count >= 2}
                              title={deck.length >= 20 ? 'デッキが満杯' : count >= 2 ? '2枚まで' : '追加'}
                            >
                              +
                            </button>
                            <button 
                              className="remove-card-btn small"
                              onClick={() => removeCardFromDeck(card.name)}
                              title="削除"
                            >
                              -
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* デッキ統計 */}
                <div className="deck-stats">
                  <h4>デッキ統計</h4>
                  
                  {/* 基本統計 */}
                  <div className="basic-stats">
                    <div className="stat-row">
                      <span className="stat-label">総枚数:</span>
                      <span className={`stat-value ${deck.length === 20 ? 'complete' : deck.length === 0 ? 'empty' : 'building'}`}>
                        {deck.length}/20
                      </span>
                    </div>
                    <div className="stat-row">
                      <span className="stat-label">ユニーク:</span>
                      <span className="stat-value">{groupedDeckCards().length}種類</span>
                    </div>
                  </div>

                  {/* 属性別統計 */}
                  <h5>属性別</h5>
                  <div className="stats-grid">
                    {Object.values(CardAttribute).map(attr => {
                      const count = deck.filter(c => c.attribute === attr).length;
                      const percentage = deck.length > 0 ? Math.round((count / deck.length) * 100) : 0;
                      return (
                        <div key={attr} className="stat-item">
                          <span className="stat-label">{attr}:</span>
                          <span className="stat-value">{count} ({percentage}%)</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* タイプ別統計 */}
                  <h5>タイプ別</h5>
                  <div className="stats-grid">
                    {Object.values(CardTypeEnum).map(type => {
                      const count = deck.filter(c => c.type === type).length;
                      const percentage = deck.length > 0 ? Math.round((count / deck.length) * 100) : 0;
                      return (
                        <div key={type} className="stat-item">
                          <span className="stat-label">{type}:</span>
                          <span className="stat-value">{count} ({percentage}%)</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* コストカーブ */}
                  <div className="cost-curve">
                    <h5>コストカーブ</h5>
                    {Array.from({ length: 7 }, (_, i) => {
                      const count = deck.filter(c => c.cost === i).length;
                      const maxWidth = Math.max(...Array.from({ length: 7 }, (_, j) => 
                        deck.filter(c => c.cost === j).length
                      ));
                      const barWidth = maxWidth > 0 ? (count / maxWidth) * 100 : 0;
                      
                      return (
                        <div key={i} className="cost-bar">
                          <span className="cost-label">{i}:</span>
                          <div className="cost-bar-container">
                            <div 
                              className="cost-bar-fill"
                              style={{ 
                                width: `${barWidth}%`,
                                backgroundColor: getCostColor(i),
                                minWidth: count > 0 ? '8px' : '0px'
                              }}
                            />
                          </div>
                          <span className="cost-count">{count}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* 平均コスト */}
                  {deck.length > 0 && (
                    <div className="average-cost">
                      <span className="stat-label">平均コスト:</span>
                      <span className="stat-value">
                        {(deck.reduce((sum, card) => sum + card.cost, 0) / deck.length).toFixed(1)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* フッター */}
          <div className="deck-builder-footer">
            <div className="footer-info">
              <span className="deck-status">
                デッキ状態: {deck.length === 20 ? '完成' : deck.length === 0 ? '空' : `構築中 (${deck.length}/20)`}
              </span>
            </div>
            <div className="footer-actions">
              <button className="cancel-btn" onClick={onClose}>
                {deck.length === 20 ? '完了' : 'キャンセル'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};