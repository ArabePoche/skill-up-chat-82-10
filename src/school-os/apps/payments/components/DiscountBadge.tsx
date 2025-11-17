/**
 * Badge pour afficher la remise d'un élève
 */
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Percent } from 'lucide-react';
import { formatDiscount, hasDiscount as checkDiscount } from '../utils/discountCalculations';

interface DiscountBadgeProps {
  discountPercentage: number | null | undefined;
  discountAmount: number | null | undefined;
  className?: string;
}

export const DiscountBadge: React.FC<DiscountBadgeProps> = ({
  discountPercentage,
  discountAmount,
  className = '',
}) => {
  if (!checkDiscount(discountPercentage, discountAmount)) {
    return null;
  }

  const discountText = formatDiscount(discountPercentage, discountAmount);

  return (
    <Badge variant="secondary" className={`bg-green-100 text-green-700 hover:bg-green-200 ${className}`}>
      <Percent className="w-3 h-3 mr-1" />
      Remise : {discountText}
    </Badge>
  );
};
