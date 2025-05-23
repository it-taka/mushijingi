import React, { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Card as CardType, CardType as CardTypeEnum, CardAttribute } from '../../types';
import './Card.css';

interface CardProps {
  card: CardType;
  isSelected: boolean | null;
  isPlayable?: boolean;
  hasAttacked?: boolean;
  damage?: number; // フィールド上のカードのダメージ値
  onClick?: () => void;
  showDetails?: boolean;
}

const attributeColors = {
  [CardAttribute.RED]: '#ff5555',
  [CardAttribute.BLUE]: '#5555ff',
  [CardAttribute.GREEN]: '#55aa55',
};

export const Card: React.FC<CardProps> = ({
  card,
  isSelected = false,
  isPlayable = true,
  hasAttacked = false,
  damage = 0,
  onClick,
  showDetails = false
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [touchStartPos, setTouchStartPos] = useState<{ x: number; y: number } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleClick = () => {
    if (isPlayable && onClick && !isExpanded) {
      onClick();
    }
  };

  // 現在のヒットポイントを計算
  const getCurrentHitpoints = (): number => {
    if (card.type !== CardTypeEnum.BUG || !card.hitpoints) {
      return 0;
    }
    const current = Math.max(0, card.hitpoints - damage);
    
    // デバッグ情報をコンソールに出力
    console.log(`HP計算 - ${card.name}:`);
    console.log(`- 最大HP: ${card.hitpoints}`);
    console.log(`- 受けたダメージ: ${damage}`);
    console.log(`- 現在HP: ${current}`);
    
    return current;
  };

  // 最大ヒットポイントを取得
  const getMaxHitpoints = (): number => {
    return card.hitpoints || 0;
  };

  // ヒットポイントの表示色を決定
  const getHitpointsColor = (): string => {
    if (card.type !== CardTypeEnum.BUG) return '#333';
    
    const current = getCurrentHitpoints();
    const max = getMaxHitpoints();
    
    if (max === 0) return '#333';
    
    const ratio = current / max;
    
    if (ratio > 0.7) return '#4CAF50'; // 緑（健康）
    if (ratio > 0.3) return '#FF9800'; // オレンジ（注意）
    return '#F44336'; // 赤（危険）
  };

  // 拡大表示時にスクロールを無効化
  useEffect(() => {
    if (isExpanded) {
      // スクロールを無効化
      document.body.style.overflow = 'hidden';
      return () => {
        // クリーンアップ時にスクロールを元に戻す
        document.body.style.overflow = 'unset';
      };
    }
  }, [isExpanded]);

  // 長押し開始
  const handleLongPressStart = useCallback((clientX: number, clientY: number) => {
    setTouchStartPos({ x: clientX, y: clientY });
    
    const timer = setTimeout(() => {
      setIsExpanded(true);
    }, 500); // 500ms の長押しで拡大
    
    setLongPressTimer(timer);
  }, []);

  // 長押し終了
  const handleLongPressEnd = useCallback(() => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    setTouchStartPos(null);
  }, [longPressTimer]);

  // 移動検出（長押しをキャンセル）
  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (touchStartPos) {
      const deltaX = Math.abs(clientX - touchStartPos.x);
      const deltaY = Math.abs(clientY - touchStartPos.y);
      
      // 10px以上移動したら長押しをキャンセル
      if (deltaX > 10 || deltaY > 10) {
        handleLongPressEnd();
      }
    }
  }, [touchStartPos, handleLongPressEnd]);

  // マウスイベント
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleLongPressStart(e.clientX, e.clientY);
  };

  const handleMouseUp = () => {
    handleLongPressEnd();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    handleMove(e.clientX, e.clientY);
  };

  const handleMouseLeave = () => {
    handleLongPressEnd();
  };

  // タッチイベント
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    handleLongPressStart(touch.clientX, touch.clientY);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    handleLongPressEnd();
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    handleMove(touch.clientX, touch.clientY);
  };

  // 拡大表示を閉じる
  const handleCloseExpanded = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsExpanded(false);
  };

  // ESCキーで閉じる
  useEffect(() => {
    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isExpanded) {
        setIsExpanded(false);
      }
    };

    if (isExpanded) {
      document.addEventListener('keydown', handleEscKey);
      return () => {
        document.removeEventListener('keydown', handleEscKey);
      };
    }
  }, [isExpanded]);
  
  // カードの背景色（属性に基づく）
  const getCardBackgroundColor = () => {
    return attributeColors[card.attribute] || '#aaaaaa';
  };
  
  // カードタイプによるスタイル変更（無効化）
  const getCardTypeStyle = () => {
    // すべてのカードで同じスタイルを使用
    return {};
  };
  
  // 攻撃力の表示
  const renderAttack = () => {
    if (card.type !== CardTypeEnum.BUG || !card.techniques || card.techniques.length === 0) {
      return null;
    }
    
    return (
      <div className="card-attack">
        攻撃力: {card.techniques[0].attack}
      </div>
    );
  };

  // ヒットポイントの表示（右上バッジ）
  const renderHitpointsBadge = () => {
    if (card.type !== CardTypeEnum.BUG || !card.hitpoints) {
      return null;
    }

    const current = getCurrentHitpoints();
    const max = getMaxHitpoints();
    const color = getHitpointsColor();

    return (
      <div className="card-hp-badge" style={{ backgroundColor: color }}>
        {current}/{max}
        {damage > 0 && (
          <div className="damage-indicator" style={{ fontSize: '8px', color: '#ff4444' }}>
            -{damage}
          </div>
        )}
      </div>
    );
  };
  
  // 技の表示
  const renderTechniques = () => {
    if (!card.techniques || card.techniques.length === 0) {
      return null;
    }
    
    return (
      <div className="card-techniques">
        {card.techniques.map((technique, index) => (
          <div key={index} className="card-technique">
            <div className="technique-name">{technique.name}</div>
            {technique.attack && <div className="technique-attack">攻撃力: {technique.attack}</div>}
            {technique.effect && <div className="technique-effect">{technique.effect}</div>}
          </div>
        ))}
      </div>
    );
  };
  
  // フレーバーテキストの表示
  const renderFlavorText = () => {
    if (!card.flavor_text) {
      return null;
    }
    
    return (
      <div className="card-flavor-text">
        {card.flavor_text}
      </div>
    );
  };

  // 拡大表示
  const renderExpandedCard = () => {
    return (
      <div 
        className="card-expanded-overlay" 
        onClick={handleCloseExpanded} 
        onTouchEnd={handleCloseExpanded}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 9999,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          animation: 'fadeIn 0.2s ease-in-out'
        }}
      >
        <div 
          className="card-expanded-container"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '20px',
            justifyContent: 'center',
            position: 'relative',
            maxWidth: '90vw',
            maxHeight: '90vh'
          }}
        >
          {/* 拡大表示時は画像のみ */}
          <img 
            src={card.image} 
            alt={card.name}
            className="card-image-expanded"
            style={{
              width: '360px',
              height: '500px',
              objectFit: 'cover',
              borderRadius: '10px',
              cursor: 'default',
              animation: 'scaleIn 0.3s ease-out',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
              flexShrink: 0
            }}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = '/images/card-back.jpg';
            }} 
          />
          
          <div 
            className="card-expanded-close-hint"
            style={{
              color: 'white',
              fontSize: '16px',
              textAlign: 'center',
              opacity: 0.8,
              animation: 'pulse 2s infinite',
              flexShrink: 0,
              marginTop: '10px'
            }}
          >
            タップして閉じる（ESCキーでも閉じます）
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div 
        ref={cardRef}
        className={`
          card 
          ${isSelected ? 'card-selected' : ''} 
          ${!isPlayable ? 'card-disabled' : ''} 
          ${hasAttacked ? 'card-attacked' : ''}
          ${damage > 0 ? 'card-damaged' : ''}
        `}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
        style={{
          ...getCardTypeStyle()
        }}
      >
        {/* カード画像 - 全体を覆う */}
        <img 
          src={card.image} 
          alt={card.name}
          className="card-image"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = '/images/card-back.jpg';
          }} 
        />

        {/* HP バッジ（右上） */}
        {renderHitpointsBadge()}

        {/* 詳細表示時のみ技とフレーバーテキストを表示（絶対位置） */}
        {showDetails && (
          <div className="card-details-overlay">
            {renderTechniques()}
            {renderFlavorText()}
          </div>
        )}
      </div>
      
      {/* Portal を使用して body 直下に描画 */}
      {isExpanded && createPortal(renderExpandedCard(), document.body)}
    </>
  );
};

export default Card;