import React, { useState, useEffect } from 'react';
import { GameProvider, useGameContext } from './contexts/GameContext';
import { GameBoard } from './components/GameBoard/GameBoard';
import { cardApi, deckApi } from './services/api';
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
  const [view, setView] = useState<'home' | 'create' | 'join' | 'ready' | 'game'>('home');
  const [deck, setDeck] = useState<Card[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');

  const playerId = gameState?.players.find(p => p.username === username)?.id || '';

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

    setIsLoading(true);
    setLoadingMessage('デッキを準備中...');

    try {
      const randomDeck = await deckApi.getRandomDeck();
      setDeck(randomDeck);
      console.log(randomDeck);
      setLoadingMessage('ゲームを作成中...');
      createGame(username, randomDeck.map(card => card.id));
    } catch (err) {
      console.error('デッキ生成エラー:', err);
      setIsLoading(false);
      alert('デッキの生成に失敗しました。もう一度お試しください。');
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

    setIsLoading(true);
    setLoadingMessage('デッキを準備中...');

    try {
      const randomDeck = await deckApi.getRandomDeck();
      setDeck(randomDeck);
      setLoadingMessage('ゲームに参加中...');
      joinGame(gameId, username, randomDeck.map(card => card.id));
    } catch (err) {
      console.error('デッキ生成エラー:', err);
      setIsLoading(false);
      alert('デッキの生成に失敗しました。もう一度お試しください。');
    }
  };

  // ReadyScreenコンポーネントをここに追加
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
        <div className="form-actions">
          <button onClick={handleCreateGame}>ゲームを作成</button>
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
        <div className="form-actions">
          <button onClick={handleJoinGame}>ゲームに参加</button>
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