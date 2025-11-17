/**
 * Affichage minimaliste des statuts mensuels de paiement
 */
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { MonthlyPaymentStatus } from '../hooks/useMonthlyPaymentTracking';

interface MonthlyStatusBadgesProps {
  months: MonthlyPaymentStatus[];
}

const getMonthShortName = (monthLabel: string): string => {
  const [month] = monthLabel.split(' ');
  return month.substring(0, 3); // Prend les 3 premières lettres
};

const getStatusStyles = (status: MonthlyPaymentStatus['status']) => {
  switch (status) {
    case 'paid':
      return 'bg-green-100 text-green-700 border-green-200 hover:bg-green-100';
    case 'partial':
      return 'bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100';
    case 'late':
      return 'bg-red-100 text-red-700 border-red-200 hover:bg-red-100';
    default:
      return 'bg-muted text-muted-foreground border-border hover:bg-muted';
  }
};

export const MonthlyStatusBadges: React.FC<MonthlyStatusBadgesProps> = ({ months }) => {
  return (
    <div className="flex flex-wrap gap-1.5">
      {months.map((month) => {
        const shortMonth = getMonthShortName(month.monthLabel);
        const remaining = month.expectedAmount - month.paidAmount;
        
        return (
          <Badge
            key={month.month}
            variant="outline"
            className={cn(
              "text-[10px] px-2 py-0.5 font-medium transition-colors cursor-default",
              getStatusStyles(month.status)
            )}
            title={
              month.status === 'paid'
                ? `${month.monthLabel} - Payé`
                : month.status === 'partial'
                ? `${month.monthLabel} - Reste ${Math.round(remaining).toLocaleString()} FCFA`
                : month.status === 'late'
                ? `${month.monthLabel} - En retard`
                : `${month.monthLabel} - À venir`
            }
          >
            {shortMonth}
            {month.status === 'partial' && (
              <span className="ml-1 opacity-70">
                ({Math.round(remaining / 1000)}k)
              </span>
            )}
          </Badge>
        );
      })}
    </div>
  );
};
