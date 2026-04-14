/**
 * Tableau de bord comptable avec statistiques
 */
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, DollarSign, Calendar, PieChart } from 'lucide-react';
import { useAccountingStats, useTransactions } from '../hooks/useAccounting';
import { Cell, Pie, PieChart as RechartsPieChart, ResponsiveContainer, Tooltip } from 'recharts';

interface DashboardProps {
  schoolId?: string;
}

export const Dashboard: React.FC<DashboardProps> = ({ schoolId }) => {
  const { data: stats = [], isLoading: statsLoading } = useAccountingStats(schoolId);
  const { data: transactions = [], isLoading: transLoading } = useTransactions(schoolId);
  const expenseCategoryColors = ['#fb7185', '#f97316', '#f59e0b', '#14b8a6', '#06b6d4', '#8b5cf6', '#6366f1'];

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

  const expenseCategoryData = useMemo(() => {
    const categoryTotals = transactions
      .filter((transaction) => transaction.type === 'expense')
      .reduce((accumulator, transaction) => {
        const category = transaction.category?.trim() || 'Sans categorie';
        accumulator.set(category, (accumulator.get(category) || 0) + Number(transaction.amount));
        return accumulator;
      }, new Map<string, number>());

    const totalExpenseAmount = Array.from(categoryTotals.values()).reduce((sum, amount) => sum + amount, 0);

    return Array.from(categoryTotals.entries())
      .map(([category, amount], index) => ({
        category,
        amount,
        percentage: totalExpenseAmount > 0 ? (amount / totalExpenseAmount) * 100 : 0,
        fill: expenseCategoryColors[index % expenseCategoryColors.length],
      }))
      .sort((left, right) => right.amount - left.amount);
  }, [transactions]);

  if (statsLoading || transLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Chargement des statistiques...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-0 bg-transparent shadow-[0_24px_70px_-32px_rgba(15,23,42,0.75)]">
        <CardContent className="bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 p-4 sm:p-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-[28px] border border-emerald-400/15 bg-white/5 p-4 sm:p-5 backdrop-blur-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-200/70">Revenus du mois</p>
                  <div className="mt-3 text-2xl font-bold text-white sm:text-3xl">
                    {formatAmount(summary.currentMonthIncome)}
                  </div>
                </div>
                <div className="rounded-full border border-emerald-300/25 bg-emerald-400/10 p-2.5 shadow-[0_0_24px_rgba(16,185,129,0.18)]">
                  <TrendingUp className="h-4 w-4 text-emerald-300" />
                </div>
              </div>
              <p className="mt-3 text-xs text-slate-300">
                Total cumulé: {formatAmount(summary.totalIncome)}
              </p>
            </div>

            <div className="rounded-[28px] border border-cyan-300/15 bg-white/5 p-4 sm:p-5 backdrop-blur-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-200/70">Solde</p>
                  <div className={`mt-3 text-2xl font-bold sm:text-3xl ${summary.currentMonthBalance >= 0 ? 'text-white' : 'text-rose-200'}`}>
                    {formatAmount(summary.currentMonthBalance)}
                  </div>
                </div>
                <div className="rounded-full border border-cyan-300/25 bg-cyan-400/10 p-2.5 shadow-[0_0_24px_rgba(34,211,238,0.16)]">
                  <DollarSign className="h-4 w-4 text-cyan-200" />
                </div>
              </div>
              <p className="mt-3 text-xs text-slate-300">
                Solde cumulé: {formatAmount(summary.totalBalance)}
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-[28px] border border-rose-300/15 bg-white/5 p-4 sm:p-5 backdrop-blur-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-rose-200/70">Depenses du mois</p>
                <div className="mt-3 text-2xl font-bold text-white sm:text-3xl">
                  {formatAmount(summary.currentMonthExpense)}
                </div>
              </div>
              <div className="rounded-full border border-rose-300/25 bg-rose-400/10 p-2.5 shadow-[0_0_24px_rgba(251,113,133,0.16)]">
                <TrendingDown className="h-4 w-4 text-rose-200" />
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-300">
              Total cumulé: {formatAmount(summary.totalExpense)}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <PieChart className="h-4 w-4 text-muted-foreground" />
            Dépenses par catégorie
          </CardTitle>
        </CardHeader>
        <CardContent>
          {expenseCategoryData.length === 0 ? (
            <div className="rounded-2xl border border-dashed py-10 text-center text-sm text-muted-foreground">
              Aucune dépense enregistrée pour afficher le diagramme.
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,320px)_1fr] lg:items-center">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={expenseCategoryData}
                      dataKey="amount"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={88}
                      paddingAngle={3}
                    >
                      {expenseCategoryData.map((entry) => (
                        <Cell key={entry.category} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => [formatAmount(value), 'Montant']}
                      contentStyle={{ borderRadius: '12px', borderColor: 'hsl(var(--border))' }}
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-3">
                {expenseCategoryData.map((item) => (
                  <div key={item.category} className="flex items-center justify-between rounded-2xl border bg-card/70 px-4 py-3">
                    <div className="min-w-0 pr-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-3 w-3 rounded-full shrink-0"
                          style={{ backgroundColor: item.fill }}
                        />
                        <p className="truncate font-medium text-foreground">{item.category}</p>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.percentage.toFixed(1)}% des dépenses
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-semibold text-foreground">{formatAmount(item.amount)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            Évolution mensuelle
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-4">
            {stats.slice(0, 6).map((stat) => {
              const monthDate = new Date(stat.month);
              const monthName = monthDate.toLocaleDateString('fr-FR', { 
                month: 'long', 
                year: 'numeric' 
              });

              return (
                <div key={stat.month} className="flex items-center justify-between rounded-2xl border bg-card/70 px-4 py-3">
                  <div>
                    <p className="font-medium capitalize text-foreground">{monthName}</p>
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
