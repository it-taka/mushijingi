import React, { useState } from 'react';
import { useGameContext } from '../../contexts/GameContext';
import { Card as CardType, ActionType, FieldCard, GamePhase } from '../../types';
import { Card } from '../Card/Card';
import { PlayerArea } from '../PlayerArea/PlayerArea';
import './GameBoard.css';

interface GameBoardProps {
  gameId: string;
}

export const GameBoard: React.FC<GameBoardProps> = ({ gameId }) => {
  const {
    gameState,
    playerId,
    getPlayerPerspective,
    isMyTurn,
    canPlayCard,
    canSetFood,
    canSkipSetPhase,
    canAttack,
    canEndTurn,
    getValidTargets,
    playCard,
    attack,
    setFood,
    skipSetPhase,
    endTurn,
    selectedCard,
    setSelectedCard
  } = useGameContext();

  // アクション用の状態
  const [attackingCard, setAttackingCard] = useState<FieldCard | null>(null);
  const [showHandDetails, setShowHandDetails] = useState<boolean>(false);
  const [selectedHandCard, setSelectedHandCard] = useState<CardType | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<CardType | null>(null);
  const [selectedTechniqueIndex, setSelectedTechniqueIndex] = useState<number>(0); // 技選択用
  const [actionMode, setActionMode] = useState<'none' | 'play' | 'food' | 'attack' | 'technique_select'>('none');

  // プレイヤーの視点を取得
  const { me, opponent } = getPlayerPerspective(gameState, playerId);

  // 手札のカードをクリック時の処理
  const handleHandCardClick = (card: CardType) => {
    // すでに選択中のカードをもう一度クリックした場合は選択解除
    if (selectedHandCard && selectedHandCard.id === card.id) {
      setSelectedHandCard(null);
      setActionMode('none');
      return;
    }

    // カードを選択
    setSelectedHandCard(card);
    setSelectedCard(card);
    
    // 可能なアクションを判断
    if (gameState) {
      if (canSetFood(gameState, playerId) && me?.hand.includes(card)) {
        setActionMode('food');
      } else if (canPlayCard(gameState, playerId, card) && me?.hand.includes(card)) {
        setActionMode('play');
      } else {
        setActionMode('none');
      }
    }
  };

  // フィールドのカードをクリック時の処理
  const handleFieldCardClick = (card: CardType, isOpponent: boolean) => {
    if (!gameState) return;

    if (!isOpponent) {
      // 自分のフィールドカードを選択
      const myFieldCard = me?.field.find(fc => fc.card.id === card.id);
      
      if (myFieldCard && canAttack(gameState, playerId, myFieldCard)) {
        setAttackingCard(myFieldCard);
        setSelectedTarget(null);
        setSelectedTechniqueIndex(0); // デフォルトで最初の技を選択
        
        // 技が複数ある場合は技選択モードに
        if (myFieldCard.card.techniques && myFieldCard.card.techniques.length > 1) {
          setActionMode('technique_select');
        } else {
          setActionMode('attack');
        }
      }
    } else if (attackingCard) {
      // 攻撃先として相手のカードを選択
      setSelectedTarget(card);
      // 技選択済みなら攻撃モードに移行
      if (actionMode === 'technique_select') {
        setActionMode('attack');
      }
    }
  };

  // カードをクリック時の処理（PlayerAreaから呼び出される）
  const handleCardClick = (card: CardType, location: 'hand' | 'field', isOpponent: boolean = false) => {
    if (location === 'hand') {
      handleHandCardClick(card);
    } else if (location === 'field') {
      handleFieldCardClick(card, isOpponent);
    }
  };

  // 技を選択する処理
  const handleTechniqueSelect = (techniqueIndex: number) => {
    setSelectedTechniqueIndex(techniqueIndex);
    setActionMode('attack'); // 技選択後は攻撃モードに移行
  };

  // カードをプレイするボタンのハンドラ
  const handlePlayCardAction = () => {
    if (selectedHandCard && gameState && canPlayCard(gameState, playerId, selectedHandCard)) {
      playCard(gameId, selectedHandCard.id);
      setSelectedHandCard(null);
      setActionMode('none');
    }
  };

  // エサをセットするボタンのハンドラ
  const handleSetFoodAction = () => {
    if (selectedHandCard && gameState && canSetFood(gameState, playerId)) {
      setFood(gameId, selectedHandCard.id);
      setSelectedHandCard(null);
      setActionMode('none');
    }
  };

  // セットフェーズをスキップするボタンのハンドラ
  const handleSkipSetPhaseAction = () => {
    if (gameState && canSkipSetPhase(gameState, playerId)) {
      skipSetPhase(gameId);
      setSelectedHandCard(null);
      setActionMode('none');
    }
  };

  // 攻撃を実行するボタンのハンドラ
  const handleAttackAction = () => {
    if (attackingCard && selectedTarget && gameState) {
      attack(gameId, attackingCard.card.id, selectedTarget.id, selectedTechniqueIndex);
      setAttackingCard(null);
      setSelectedTarget(null);
      setSelectedTechniqueIndex(0);
      setActionMode('none');
    }
  };

  // 相手本体への直接攻撃ボタンのハンドラ
  const handleDirectAttackAction = () => {
    if (attackingCard && gameState) {
      const { canAttackPlayer } = getValidTargets(gameState, playerId, attackingCard);
      
      if (canAttackPlayer) {
        attack(gameId, attackingCard.card.id, undefined, selectedTechniqueIndex);
        setAttackingCard(null);
        setSelectedTechniqueIndex(0);
        setActionMode('none');
      }
    }
  };

  // ターン終了ボタンの処理
  const handleEndTurn = () => {
    if (gameState && canEndTurn(gameState, playerId)) {
      endTurn(gameId);
      setAttackingCard(null);
      setSelectedHandCard(null);
      setSelectedTarget(null);
      setSelectedTechniqueIndex(0);
      setActionMode('none');
    }
  };

  // アクションをキャンセル
  const cancelAction = () => {
    setSelectedHandCard(null);
    setAttackingCard(null);
    setSelectedTarget(null);
    setSelectedTechniqueIndex(0);
    setActionMode('none');
  };

  // 手札の詳細表示切り替え
  const toggleHandDetails = () => {
    setShowHandDetails(!showHandDetails);
  };

  // 現在のフェーズとターン情報
  const renderGameInfo = () => {
    if (!gameState) return null;

    // 先攻1ターン目かどうかを判定
    const isFirstPlayerFirstTurn = 
      gameState.turn === 1 && 
      gameState.currentPlayerIndex === 0 && 
      isMyTurn(gameState, playerId);

    // フェーズの表示名
    let phaseName;
    switch (gameState.phase) {
      case GamePhase.DRAW:
        phaseName = "ドローフェーズ";
        break;
      case GamePhase.SET:
        phaseName = isFirstPlayerFirstTurn ? "セットフェーズ（ドローなし）" : "セットフェーズ";
        break;
      case GamePhase.MAIN:
        phaseName = "メインフェーズ";
        break;
      case GamePhase.END:
        phaseName = "エンドフェーズ";
        break;
      default:
        phaseName = gameState.phase;
    }

    return (
      <div className="game-info">
        <div className="turn-info">
          <div className="turn-number">ターン: {gameState.turn}</div>
          <div className="phase-info">フェーズ: {phaseName}</div>
        </div>
        <div className="active-player">
          現在のプレイヤー: {gameState.players[gameState.currentPlayerIndex]?.username}
          {isMyTurn(gameState, playerId) ? '（あなた）' : '（相手）'}
        </div>
        {me && (
          <div className="food-info">
            現在のエサ: {me.currentFood}
          </div>
        )}
      </div>
    );
  };

  // 技選択UI
  const renderTechniqueSelection = () => {
    if (!attackingCard || !attackingCard.card.techniques || attackingCard.card.techniques.length <= 1) {
      return null;
    }

    return (
      <div className="technique-selection">
        <h4>使用する技を選択してください：</h4>
        <div className="technique-buttons">
          {attackingCard.card.techniques.map((technique, index) => (
            <button
              key={index}
              className={`technique-btn ${selectedTechniqueIndex === index ? 'selected' : ''}`}
              onClick={() => handleTechniqueSelect(index)}
            >
              <div className="technique-name">{technique.name}</div>
              <div className="technique-info">
                {technique.attack && <span>攻撃力: {technique.attack}</span>}
                {technique.effect && <div className="technique-effect">{technique.effect}</div>}
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  };

  // アクションボタンの表示
  const renderActionButtons = () => {
    if (!gameState || !isMyTurn(gameState, playerId)) return null;

    switch (actionMode) {
      case 'play':
        return (
          <div className="action-buttons">
            <button 
              className="play-card-btn" 
              onClick={handlePlayCardAction}
              disabled={!selectedHandCard}
            >
              カードをプレイ
            </button>
            <button className="cancel-btn" onClick={cancelAction}>
              キャンセル
            </button>
          </div>
        );
      
      case 'food':
        return (
          <div className="action-buttons">
            <button 
              className="set-food-btn" 
              onClick={handleSetFoodAction}
              disabled={!selectedHandCard}
            >
              エサをセット
            </button>
            <button className="cancel-btn" onClick={cancelAction}>
              キャンセル
            </button>
          </div>
        );
      
      case 'technique_select':
        return (
          <div className="action-buttons">
            {renderTechniqueSelection()}
            <button className="cancel-btn" onClick={cancelAction}>
              キャンセル
            </button>
          </div>
        );
      
      case 'attack':
        const validTargets = attackingCard ? getValidTargets(gameState, playerId, attackingCard) : { validTargets: [], canAttackPlayer: false };
        
        return (
          <div className="action-buttons attack-mode">
            {selectedTarget && (
              <button 
                className="attack-btn" 
                onClick={handleAttackAction}
                disabled={!attackingCard || !selectedTarget}
              >
                {selectedTarget.name}を攻撃
                {attackingCard?.card.techniques && attackingCard.card.techniques[selectedTechniqueIndex] && (
                  <div className="selected-technique">
                    使用技: {attackingCard.card.techniques[selectedTechniqueIndex].name}
                  </div>
                )}
              </button>
            )}
            
            {validTargets.canAttackPlayer && (
              <button 
                className="direct-attack-btn" 
                onClick={handleDirectAttackAction}
              >
                相手本体へ直接攻撃
                {attackingCard?.card.techniques && attackingCard.card.techniques[selectedTechniqueIndex] && (
                  <div className="selected-technique">
                    使用技: {attackingCard.card.techniques[selectedTechniqueIndex].name}
                  </div>
                )}
              </button>
            )}
            
            {/* 技が複数ある場合は技変更ボタンを表示 */}
            {attackingCard?.card.techniques && attackingCard.card.techniques.length > 1 && (
              <button 
                className="change-technique-btn" 
                onClick={() => setActionMode('technique_select')}
              >
                技を変更
              </button>
            )}
            
            <button className="cancel-btn" onClick={cancelAction}>
              キャンセル
            </button>
          </div>
        );
      
      default:
        return (
          <div className="action-buttons">
            {/* セットフェーズでのスキップボタン */}
            {canSkipSetPhase(gameState, playerId) && (
              <button className="skip-set-btn" onClick={handleSkipSetPhaseAction}>
                セットフェーズをスキップ
              </button>
            )}
            
            {canEndTurn(gameState, playerId) && (
              <button className="end-turn-btn" onClick={handleEndTurn}>
                ターン終了
              </button>
            )}
          </div>
        );
    }
  };

  // アクション情報
  const renderActionInfo = () => {
    if (!gameState || !me) return null;

    let actionPrompt = "";
    
    if (isMyTurn(gameState, playerId)) {
      switch (actionMode) {
        case 'play':
          actionPrompt = `「${selectedHandCard?.name}」をプレイしますか？（コスト: ${selectedHandCard?.cost}）`;
          break;
        case 'food':
          actionPrompt = `「${selectedHandCard?.name}」をエサにセットしますか？`;
          break;
        case 'technique_select':
          actionPrompt = `「${attackingCard?.card.name}」で使用する技を選んでください`;
          break;
        case 'attack':
          if (selectedTarget) {
            const selectedTechnique = attackingCard?.card.techniques?.[selectedTechniqueIndex];
            actionPrompt = `「${attackingCard?.card.name}」の「${selectedTechnique?.name}」で「${selectedTarget.name}」を攻撃しますか？`;
          } else {
            actionPrompt = "攻撃先を選んでください";
          }
          break;
        default:
          if (gameState.phase === GamePhase.SET) {
            actionPrompt = "エサにするカードを選ぶか、セットフェーズをスキップできます";
          } else if (gameState.phase === GamePhase.MAIN) {
            actionPrompt = "プレイするカードか、攻撃する虫を選んでください";
          }
      }
    } else {
      actionPrompt = "相手のターンです...";
    }

    return (
      <div className="action-info">
        <div className="action-prompt">{actionPrompt}</div>
        {renderActionButtons()}
        
        <button className="toggle-details-btn" onClick={toggleHandDetails}>
          {showHandDetails ? '詳細を隠す' : '詳細を表示'}
        </button>
      </div>
    );
  };

  // ゲームが存在しない場合
  if (!gameState) {
    return <div className="loading">ゲームを読み込み中...</div>;
  }

  return (
    <div className="game-board">
      {renderGameInfo()}
      
      {/* 相手エリア */}
      <div className="opponent-area">
        {opponent && (
          <PlayerArea
            player={opponent}
            isOpponent={true}
            selectedCard={selectedTarget || selectedCard}
            attackingCard={attackingCard}
            onCardClick={handleCardClick}
            showHandDetails={false}
          />
        )}
      </div>
      
      {/* センターエリア（フィールド） */}
      <div className="center-area">
        {renderActionInfo()}
      </div>
      
      {/* 自分エリア */}
      <div className="player-area">
        {me && (
          <PlayerArea
            player={me}
            isOpponent={false}
            selectedCard={selectedHandCard || selectedCard}
            attackingCard={attackingCard}
            onCardClick={handleCardClick}
            showHandDetails={showHandDetails}
          />
        )}
      </div>
    </div>
  );
};

export default GameBoard;