import React, { useState, useEffect } from 'react';
import { GameProvider, useGameContext } from './contexts/GameContext';
import { GameBoard } from './components/GameBoard/GameBoard';
import { DeckBuilder } from './components/DeckBuilder/DeckBuilder';
import { cardApi, deckApi, userDeckApi, SavedDeck, DeckMetadata } from './services/api';
import { Card } from './types';
import './App.css';

// ホーム画面コンポーネント
const Home: React.FC = () => {
  const {
    isConnected,
    error,
    gameState,
    createGame,
    joinGame,
    setReady,
    gameOver,
    resetGameOver
  } = useGameContext();

  const [username, setUsername] = useState<string>('');
  const [gameId, setGameId] = useState<string>('');
  const [view, setView] = useState<'home' | 'create' | 'join' | 'ready' | 'game' | 'deck_builder'>('home');
  const [deck, setDeck] = useState<Card[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [savedDecks, setSavedDecks] = useState<DeckMetadata[]>([]);
  const [selectedDeckIndex, setSelectedDeckIndex] = useState<number>(-1);

  const playerId = gameState?.players.find(p => p.username === username)?.id || '';

  // 保存されたデッキを読み込み（サーバーから）
  useEffect(() => {
    const loadSavedDecks = async () => {
      if (username.trim()) {
        try {
          const decks = await userDeckApi.getUserDecks(username);
          setSavedDecks(decks);
        } catch (err) {
          console.error('保存されたデッキの読み込みに失敗:', err);
          setSavedDecks([]);
        }
      }
    };

    loadSavedDecks();
  }, [username]);

  // デッキを保存（サーバーに）
  const saveDeck = async (deckName: string, cards: Card[]) => {
    if (!username.trim()) {
      alert('ユーザー名を入力してください');
      return;
    }

    try {
      await userDeckApi.saveDeck(username, deckName, cards);
      
      // デッキ一覧を再読み込み
      const updatedDecks = await userDeckApi.getUserDecks(username);
      setSavedDecks(updatedDecks);
      
      return true;
    } catch (err: any) {
      console.error('デッキ保存エラー:', err);
      alert(err.message || 'デッキの保存に失敗しました');
      return false;
    }
  };

  // デッキを削除（サーバーから）
  const deleteDeck = async (deckName: string) => {
    if (!username.trim()) {
      return;
    }

    try {
      await userDeckApi.deleteDeck(username, deckName);
      
      // デッキ一覧を再読み込み
      const updatedDecks = await userDeckApi.getUserDecks(username);
      setSavedDecks(updatedDecks);
      
      // 現在選択中のデッキが削除された場合はクリア
      const selectedDeck = savedDecks[selectedDeckIndex];
      if (selectedDeck && selectedDeck.name === deckName) {
        setDeck([]);
        setSelectedDeckIndex(-1);
      }
    } catch (err: any) {
      console.error('デッキ削除エラー:', err);
      alert(err.message || 'デッキの削除に失敗しました');
    }
  };

  // デッキを読み込み（サーバーから）
  const loadDeck = async (deckName: string) => {
    if (!username.trim()) {
      return;
    }

    try {
      const savedDeck = await userDeckApi.getDeck(username, deckName);
      setDeck(savedDeck.cards);
      
      // 選択されたデッキのインデックスを更新
      const index = savedDecks.findIndex(d => d.name === deckName);
      setSelectedDeckIndex(index);
    } catch (err: any) {
      console.error('デッキ読み込みエラー:', err);
      alert(err.message || 'デッキの読み込みに失敗しました');
    }
  };

  // デッキビルダーでデッキが完成した時の処理
  const handleDeckBuilt = async (builtDeck: Card[]) => {
    setDeck(builtDeck);
    setView('home');
    
    // ユーザー名が入力されている場合のみ保存を提案
    if (username.trim()) {
      // デッキ名を入力してもらって保存
      const deckName = prompt('デッキ名を入力してください:');
      if (deckName && deckName.trim()) {
        const success = await saveDeck(deckName.trim(), builtDeck);
        if (success) {
          alert('デッキを保存しました！');
        }
      }
    }
  };

  // ユーザー名変更ハンドラ
  const handleUsernameChange = (newUsername: string) => {
    setUsername(newUsername);
  };

  // サーバー接続ステータスが変わったらリセット
  useEffect(() => {
    if (!isConnected) {
      setView('home');
    }
  }, [isConnected]);

  // ゲーム状態の初期化時
  useEffect(() => {
    if (gameState) {
      if (view === 'create' || view === 'join') {
        setView('ready'); // ゲーム作成・参加後は「ready」ビューに移動
        setIsLoading(false);
      }
      
      // ゲームが開始したら、ゲーム画面に移動
      if (gameState.started && view === 'ready') {
        setView('game');
      }
    }
  }, [gameState, view]);

  // ゲーム終了時
  useEffect(() => {
    if (gameOver) {
      setTimeout(() => {
        resetGameOver();
        setView('home');
      }, 5000);
    }
  }, [gameOver, resetGameOver]);

  // ゲーム作成処理
  const handleCreateGame = async () => {
    if (!username.trim()) {
      alert('ユーザー名を入力してください');
      return;
    }

    if (deck.length === 0) {
      alert('デッキを選択してください');
      return;
    }

    setIsLoading(true);
    setLoadingMessage('ゲームを作成中...');

    try {
      createGame(username, deck.map(card => card.id));
    } catch (err) {
      console.error('ゲーム作成エラー:', err);
      setIsLoading(false);
      alert('ゲームの作成に失敗しました。もう一度お試しください。');
    }
  };

  // ゲーム参加処理
  const handleJoinGame = async () => {
    if (!username.trim()) {
      alert('ユーザー名を入力してください');
      return;
    }

    if (!gameId.trim()) {
      alert('ゲームIDを入力してください');
      return;
    }

    if (deck.length === 0) {
      alert('デッキを選択してください');
      return;
    }

    setIsLoading(true);
    setLoadingMessage('ゲームに参加中...');

    try {
      joinGame(gameId, username, deck.map(card => card.id));
    } catch (err) {
      console.error('ゲーム参加エラー:', err);
      setIsLoading(false);
      alert('ゲームへの参加に失敗しました。もう一度お試しください。');
    }
  };

  // ランダムデッキ使用
  const useRandomDeck = async () => {
    try {
      setIsLoading(true);
      setLoadingMessage('ランダムデッキを生成中...');
      const randomDeck = await deckApi.getRandomDeck();
      setDeck(randomDeck);
      setSelectedDeckIndex(-1);
      setIsLoading(false);
      alert('ランダムデッキを設定しました！');
    } catch (err) {
      console.error('ランダムデッキ生成エラー:', err);
      setIsLoading(false);
      alert('ランダムデッキの生成に失敗しました。');
    }
  };

  // ReadyScreenコンポーネント
  const ReadyScreen = () => {
    if (!gameState) return null;

    const handleReady = () => {
      setReady(gameState.id);
    };
  
    return (
      <div className="ready-container">
        <h2>ゲーム準備</h2>
        <p>ゲームID: {gameState.id}</p>
        <p>プレイヤー数: {gameState.players.length} / 2</p>
        
        {gameState.players.map(player => (
          <div key={player.id} className="player-status">
            <p>{player.username}</p>
            <span className={player.isReady ? "ready" : "not-ready"}>
              {player.isReady ? "準備完了" : "準備中..."}
            </span>
          </div>
        ))}
        
        <button 
          onClick={handleReady} 
          disabled={gameState.players.find(p => p.id === playerId)?.isReady}
        >
          準備完了
        </button>
      </div>
    );
  };

  // ローディング表示
  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <div className="loading-message">{loadingMessage}</div>
      </div>
    );
  }

  // ゲームオーバー表示
  if (gameOver) {
    return (
      <div className="game-over-container">
        <h2>ゲーム終了</h2>
        <p>勝者: {gameOver.winner || 'なし（引き分け）'}</p>
        {gameOver.reason && <p>理由: {gameOver.reason}</p>}
        <p>5秒後にホーム画面に戻ります...</p>
      </div>
    );
  }

  // エラー表示
  if (error) {
    return (
      <div className="error-container">
        <h2>エラーが発生しました</h2>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>再読み込み</button>
      </div>
    );
  }

  // デッキビルダー画面
  if (view === 'deck_builder') {
    return (
      <DeckBuilder
        onDeckBuilt={handleDeckBuilt}
        onClose={() => setView('home')}
        initialDeck={deck}
        username={username}
        onUsernameChange={handleUsernameChange}
      />
    );
  }

  // 準備画面
  if (view === 'ready' && gameState) {
    return <ReadyScreen />;
  }

  // ゲーム画面
  if (view === 'game' && gameState) {
    return <GameBoard gameId={gameState.id} />;
  }

  // ゲーム作成画面
  if (view === 'create') {
    return (
      <div className="form-container">
        <h2>新しいゲームを作成</h2>
        <div className="form-group">
          <label>ユーザー名:</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="ユーザー名を入力"
          />
        </div>
        
        <div className="deck-selection-section">
          <h3>デッキ選択</h3>
          {deck.length > 0 ? (
            <div className="selected-deck-info">
              <p>選択中のデッキ: {deck.length}枚</p>
              <button 
                className="change-deck-btn"
                onClick={() => setView('deck_builder')}
              >
                デッキを変更
              </button>
            </div>
          ) : (
            <div className="no-deck-selected">
              <p>デッキが選択されていません</p>
              <div className="deck-options">
                <button 
                  className="build-deck-btn"
                  onClick={() => setView('deck_builder')}
                >
                  デッキを組む
                </button>
                <button 
                  className="random-deck-btn"
                  onClick={useRandomDeck}
                >
                  ランダムデッキを使用
                </button>
              </div>
            </div>
          )}

          {savedDecks.length > 0 && (
            <div className="saved-decks-section">
              <h4>保存されたデッキ</h4>
              <div className="saved-decks-list">
                {savedDecks.map((savedDeck, index) => (
                  <div key={index} className="saved-deck-item">
                    <div className="deck-info">
                      <div className="deck-name">{savedDeck.name}</div>
                      <div className="deck-meta">
                        {savedDeck.cardCount}枚 | {new Date(savedDeck.lastModified).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="deck-actions">
                      <button 
                        className="use-deck-btn"
                        onClick={() => loadDeck(savedDeck.name)}
                      >
                        使用
                      </button>
                      <button 
                        className="edit-deck-btn"
                        onClick={async () => {
                          await loadDeck(savedDeck.name);
                          setView('deck_builder');
                        }}
                      >
                        編集
                      </button>
                      <button 
                        className="delete-deck-btn"
                        onClick={() => {
                          if (window.confirm(`デッキ「${savedDeck.name}」を削除しますか？`)) {
                            deleteDeck(savedDeck.name);
                          }
                        }}
                      >
                        削除
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="form-actions">
          <button 
            onClick={handleCreateGame}
            disabled={!isConnected || deck.length === 0}
          >
            ゲームを作成
          </button>
          <button className="secondary" onClick={() => setView('home')}>戻る</button>
        </div>
      </div>
    );
  }

  // ゲーム参加画面
  if (view === 'join') {
    return (
      <div className="form-container">
        <h2>ゲームに参加</h2>
        <div className="form-group">
          <label>ユーザー名:</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="ユーザー名を入力"
          />
        </div>
        <div className="form-group">
          <label>ゲームID:</label>
          <input
            type="text"
            value={gameId}
            onChange={(e) => setGameId(e.target.value)}
            placeholder="ゲームIDを入力"
          />
        </div>

        <div className="deck-selection-section">
          <h3>デッキ選択</h3>
          {deck.length > 0 ? (
            <div className="selected-deck-info">
              <p>選択中のデッキ: {deck.length}枚</p>
              <button 
                className="change-deck-btn"
                onClick={() => setView('deck_builder')}
              >
                デッキを変更
              </button>
            </div>
          ) : (
            <div className="no-deck-selected">
              <p>デッキが選択されていません</p>
              <div className="deck-options">
                <button 
                  className="build-deck-btn"
                  onClick={() => setView('deck_builder')}
                >
                  デッキを組む
                </button>
                <button 
                  className="random-deck-btn"
                  onClick={useRandomDeck}
                >
                  ランダムデッキを使用
                </button>
              </div>
            </div>
          )}

          {savedDecks.length > 0 && (
            <div className="saved-decks-section">
              <h4>保存されたデッキ</h4>
              <div className="saved-decks-list">
                {savedDecks.map((savedDeck, index) => (
                  <div key={index} className="saved-deck-item">
                    <div className="deck-info">
                      <div className="deck-name">{savedDeck.name}</div>
                      <div className="deck-meta">
                        {savedDeck.cardCount}枚 | {new Date(savedDeck.lastModified).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="deck-actions">
                      <button 
                        className="use-deck-btn"
                        onClick={() => loadDeck(savedDeck.name)}
                      >
                        使用
                      </button>
                      <button 
                        className="edit-deck-btn"
                        onClick={async () => {
                          await loadDeck(savedDeck.name);
                          setView('deck_builder');
                        }}
                      >
                        編集
                      </button>
                      <button 
                        className="delete-deck-btn"
                        onClick={() => {
                          if (window.confirm(`デッキ「${savedDeck.name}」を削除しますか？`)) {
                            deleteDeck(savedDeck.name);
                          }
                        }}
                      >
                        削除
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="form-actions">
          <button 
            onClick={handleJoinGame}
            disabled={!isConnected || deck.length === 0}
          >
            ゲームに参加
          </button>
          <button className="secondary" onClick={() => setView('home')}>戻る</button>
        </div>
      </div>
    );
  }

  // ホーム画面
  return (
    <div className="home-container">
      <div className="title-container">
        <h1>蟲神器 オンライン</h1>
        <p>トレーディングカードゲーム</p>
      </div>
      <div className="connection-status">
        サーバー接続状態: {isConnected ? (
          <span className="connected">接続済み</span>
        ) : (
          <span className="disconnected">未接続</span>
        )}
      </div>

      {/* デッキ状態表示 */}
      <div className="deck-status-container">
        <h3>現在のデッキ</h3>
        {deck.length > 0 ? (
          <div className="current-deck-info">
            <p>選択中: {deck.length}枚のデッキ</p>
            {selectedDeckIndex >= 0 && savedDecks[selectedDeckIndex] && (
              <p>デッキ名: {savedDecks[selectedDeckIndex].name}</p>
            )}
            <button 
              className="manage-deck-btn"
              onClick={() => setView('deck_builder')}
            >
              デッキを編集
            </button>
          </div>
        ) : (
          <div className="no-deck-info">
            <p>デッキが選択されていません</p>
            <div className="deck-options">
              <button 
                className="build-deck-btn"
                onClick={() => setView('deck_builder')}
              >
                デッキを組む
              </button>
              <button 
                className="random-deck-btn"
                onClick={useRandomDeck}
              >
                ランダムデッキを使用
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="menu-buttons">
        <button 
          onClick={() => setView('create')}
          disabled={!isConnected}
        >
          新しいゲームを作成
        </button>
        <button 
          onClick={() => setView('join')}
          disabled={!isConnected}
        >
          ゲームに参加
        </button>
        <button 
          onClick={() => setView('deck_builder')}
        >
          デッキビルダー
        </button>
      </div>

      <div className="game-info-box">
        <h3>ゲーム概要</h3>
        <p>『蟲神器』は、デッキを使用して対戦するトレーディングカードゲームです。プレイヤーは交互にターンを進行し、先に勝利条件を満たした方が勝者となります。</p>
        <p>勝利条件:</p>
        <ul>
          <li>相手の縄張りが0の状態で、相手本体を攻撃する。</li>
          <li>相手が降伏する。</li>
          <li>どちらかがドロー時に山札がなくなり、カードを引けなくなった場合、その時点で縄張りの数が多い方が勝利。</li>
        </ul>
      </div>
    </div>
  );
};

// メインアプリケーション
const App: React.FC = () => {
  return (
    <div className="app">
      <GameProvider>
        <Home />
      </GameProvider>
    </div>
  );
};

export default App;