/**
 * Composant pour afficher le prix FCFA + son équivalent en SC
 * Utilisé dans les ProductCard et ProductDetailsModal
 */
import React from 'react';
import { useScToFcfaRate, fcfaToSc } from '../hooks/useMarketplaceOrders';

interface ScPriceDisplayProps {
  priceFcfa: number;
  className?: string;
  showFcfa?: boolean;
  size?: 'sm' | 'md' | 'lg';
  isOutOfStock?: boolean;
}

const ScPriceDisplay: React.FC<ScPriceDisplayProps> = ({
  priceFcfa,
  className = '',
  showFcfa = true,
  size = 'md',
  isOutOfStock = false,
}) => {
  const { data: rate } = useScToFcfaRate();
  const scPrice = fcfaToSc(priceFcfa, rate || 10);

  const sizeClasses = {
    sm: { main: 'text-sm', sub: 'text-[10px]' },
    md: { main: 'text-lg', sub: 'text-xs' },
    lg: { main: 'text-3xl', sub: 'text-sm' },
  };

  return (
    <div className={`flex flex-col ${className}`}>
      <span className={`font-bold ${sizeClasses[size].main} ${isOutOfStock ? 'text-muted-foreground' : 'text-foreground'}`}>
        {Math.round(priceFcfa)} FCFA
      </span>
      <span className={`${sizeClasses[size].sub} font-semibold text-emerald-600`}>
        ≈ {scPrice} SC
      </span>
    </div>
  );
};

export default ScPriceDisplay;
