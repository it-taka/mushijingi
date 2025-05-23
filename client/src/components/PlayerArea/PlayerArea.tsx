import React from 'react';
import { Player, Card as CardType, FieldCard } from '../../types';
import { Card } from '../Card/Card';
import './PlayerArea.css';

interface PlayerAreaProps {
  player: Player;
  isOpponent: boolean;
  selectedCard: CardType | null;
  attackingCard: FieldCard | null;
  onCardClick: (card: CardType, location: 'hand' | 'field') => void;
  showHandDetails: boolean;
}

export const PlayerArea: React.FC<PlayerAreaProps> = ({
  player,
  isOpponent,
  selectedCard,
  attackingCard,
  onCardClick,
  showHandDetails
}) => {
  // 手札を表示
  const renderHand = () => {
    // 相手の手札は裏向きで表示する
    if (isOpponent) {
      return (
        <div className="hand-area">
          <div className="area-title">手札 ({player.hand.length}枚)</div>
          <div className="cards-container">
            {player.hand.map((_, index) => (
              <div key={`opponent-hand-${index}`} className="card-back hand-card-back">
                <div className="card-back-inner"></div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // 自分の手札は表向きで表示（小さいサイズ）
    return (
      <div className="hand-area">
        <div className="area-title">手札 ({player.hand.length}枚)</div>
        <div className="cards-container hand-cards-container">
          {player.hand.map((card) => (
            <div key={`my-hand-${card.id}`} className="hand-card-wrapper">
              <Card
                card={card}
                isSelected={selectedCard?.id === card.id}
                isPlayable={true}
                onClick={() => onCardClick(card, 'hand')}
                showDetails={showHandDetails}
              />
            </div>
          ))}
        </div>
      </div>
    );
  };

  // フィールドを表示
  const renderField = () => {
    return (
      <div className="field-area">
        <div className="area-title">場 ({player.field.length}枚)</div>
        <div className="cards-container field-cards-container">
          {player.field.map((fieldCard) => (
            <Card
              key={`field-${fieldCard.card.id}`}
              card={fieldCard.card}
              isSelected={selectedCard?.id === fieldCard.card.id || 
                          (attackingCard && fieldCard.card.id === attackingCard.card.id)}
              isPlayable={!isOpponent || (isOpponent && attackingCard !== null)}
              hasAttacked={fieldCard.hasAttacked}
              damage={fieldCard.damage} // ダメージ情報を渡す
              onClick={() => onCardClick(fieldCard.card, 'field')}
              showDetails={!isOpponent && showHandDetails}
            />
          ))}
          {player.field.length === 0 && (
            <div className="empty-area">空</div>
          )}
        </div>
      </div>
    );
  };

  // エサ場を表示
  const renderFoodArea = () => {
    return (
      <div className="food-area">
        <div className="area-title">エサ場 ({player.foodArea.length}枚)</div>
        <div className="cards-container">
          {player.foodArea.map((card, index) => (
            <div key={`food-${index}`} className="card-back food-card">
              <div className="card-back-inner"></div>
            </div>
          ))}
          {player.foodArea.length === 0 && (
            <div className="empty-area">空</div>
          )}
        </div>
        <div className="current-food">
          現在のエサ: {player.currentFood}
        </div>
      </div>
    );
  };

  // 縄張りを表示
  const renderTerritory = () => {
    return (
      <div className="territory-area">
        <div className="area-title">縄張り ({player.territory.length}枚)</div>
        <div className="cards-container">
          {player.territory.map((_, index) => (
            <div key={`territory-${index}`} className="card-back territory-card">
              <div className="card-back-inner"></div>
            </div>
          ))}
          {player.territory.length === 0 && (
            <div className="empty-area danger">危険!</div>
          )}
        </div>
      </div>
    );
  };

  // 捨て札を表示
  const renderGraveyard = () => {
    return (
      <div className="graveyard-area">
        <div className="area-title">捨て札 ({player.graveyard.length}枚)</div>
        {player.graveyard.length > 0 && (
          <div className="card-back graveyard-card">
            <div className="card-back-inner"></div>
            <div className="graveyard-count">{player.graveyard.length}</div>
          </div>
        )}
        {player.graveyard.length === 0 && (
          <div className="empty-area">空</div>
        )}
      </div>
    );
  };

  // プレイヤー情報を表示
  const renderPlayerInfo = () => {
    return (
      <div className="player-info">
        <div className="player-name">
          {player.username} {isOpponent ? '(相手)' : '(あなた)'}
        </div>
        <div className="deck-info">
          山札: {player.deck.length}枚
        </div>
      </div>
    );
  };

  return (
    <div className={`player-area-container ${isOpponent ? 'opponent' : 'player'}`}>
      {renderPlayerInfo()}
      
      <div className="game-areas">
        <div className="left-side">
          {/* 相手の場合は手札を先に（上/奥に）、自分の場合は場を先に（下/手前に） */}
          {isOpponent ? (
            <>
              {renderHand()}
              {renderField()}
            </>
          ) : (
            <>
              {renderField()}
              {renderHand()}
            </>
          )}
        </div>
        
        <div className="right-side">
          {renderFoodArea()}
          {renderTerritory()}
          {renderGraveyard()}
        </div>
      </div>
    </div>
  );
};

export default PlayerArea;