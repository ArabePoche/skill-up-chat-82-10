/**
 * Tableau de bord comptable avec statistiques
 */
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, DollarSign, Calendar } from 'lucide-react';
import { useAccountingStats, useTransactions } from '../hooks/useAccounting';

interface DashboardProps {
  schoolId?: string;
}

export const Dashboard: React.FC<DashboardProps> = ({ schoolId }) => {
  const { data: stats = [], isLoading: statsLoading } = useAccountingStats(schoolId);
  const { data: transactions = [], isLoading: transLoading } = useTransactions(schoolId);

  const summary = useMemo(() => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const currentMonthStats = stats.find(s => s.month?.startsWith(currentMonth));

    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const totalExpense = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    return {
      currentMonthIncome: currentMonthStats?.total_income || 0,
      currentMonthExpense: currentMonthStats?.total_expense || 0,
      currentMonthBalance: currentMonthStats?.net_balance || 0,
      totalIncome,
      totalExpense,
      totalBalance: totalIncome - totalExpense,
    };
  }, [stats, transactions]);

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (statsLoading || transLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Chargement des statistiques...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenus (Mois actuel)</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatAmount(summary.currentMonthIncome)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total: {formatAmount(summary.totalIncome)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dépenses (Mois actuel)</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatAmount(summary.currentMonthExpense)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total: {formatAmount(summary.totalExpense)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Solde (Mois actuel)</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${summary.currentMonthBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatAmount(summary.currentMonthBalance)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total: {formatAmount(summary.totalBalance)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Évolution mensuelle
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.slice(0, 6).map((stat) => {
              const monthDate = new Date(stat.month);
              const monthName = monthDate.toLocaleDateString('fr-FR', { 
                month: 'long', 
                year: 'numeric' 
              });

              return (
                <div key={stat.month} className="flex items-center justify-between border-b pb-3">
                  <div>
                    <p className="font-medium capitalize">{monthName}</p>
                    <p className="text-sm text-muted-foreground">
                      Revenus: {formatAmount(stat.total_income)} | 
                      Dépenses: {formatAmount(stat.total_expense)}
                    </p>
                  </div>
                  <div className={`text-lg font-bold ${stat.net_balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatAmount(stat.net_balance)}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
