/**
 * Composant pour afficher le prix FCFA + son équivalent en SC
 * Utilisé dans les ProductCard et ProductDetailsModal
 */
import React from 'react';
import { useScToFcfaRate, fcfaToSc } from '../hooks/useMarketplaceOrders';
import coinSC from '@/assets/coin-soumboulah-cash.png';

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
  const effectiveRate = (rate && rate > 0) ? rate : 1;

  // Valeur SC avec décimales réelles (ex : 0,5 S. au lieu de 1 S.)
  const scRaw = fcfaToSc(priceFcfa, effectiveRate);
  const scFormatted = new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(scRaw);

  const sizeClasses = {
    sm: { main: 'text-sm', sub: 'text-[10px]', coin: 'w-3 h-3' },
    md: { main: 'text-lg', sub: 'text-xs', coin: 'w-4 h-4' },
    lg: { main: 'text-3xl', sub: 'text-sm', coin: 'w-5 h-5' },
  };

  return (
    <div className={`flex flex-col ${className}`}>
      {showFcfa && (
        <span className={`font-bold ${sizeClasses[size].main} ${isOutOfStock ? 'text-muted-foreground' : 'text-foreground'}`}>
          {Math.round(priceFcfa)} FCFA
        </span>
      )}
      <span className={`${sizeClasses[size].sub} font-semibold text-emerald-600 flex items-center gap-0.5`}>
        <img src={coinSC} alt="S." className={`${sizeClasses[size].coin} object-contain`} />
        ≈ {scFormatted} S.
      </span>
    </div>
  );
};

export default ScPriceDisplay;
