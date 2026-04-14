/**
 * Tableau de bord comptable avec statistiques
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, TrendingDown, DollarSign, Calendar, BarChart3 } from 'lucide-react';
import { useSchoolYear } from '@/school/context/SchoolYearContext';
import { useAccountingStats, useTransactions } from '../hooks/useAccounting';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface DashboardProps {
  schoolId?: string;
}

const getMonthKey = (value?: string) => value?.slice(0, 7) || '';

const formatMonthLabel = (month: string) => {
  const monthDate = new Date(`${month}-01T00:00:00`);
  return monthDate.toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
  });
};

const buildSchoolYearMonths = (startDate?: string, endDate?: string) => {
  if (!startDate || !endDate) return [] as Array<{ value: string; label: string }>;

  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
    return [] as Array<{ value: string; label: string }>;
  }

  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const lastMonth = new Date(end.getFullYear(), end.getMonth(), 1);
  const months: Array<{ value: string; label: string }> = [];

  while (cursor <= lastMonth) {
    const value = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
    months.push({
      value,
      label: formatMonthLabel(value),
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return months;
};

export const Dashboard: React.FC<DashboardProps> = ({ schoolId }) => {
  const { activeSchoolYear } = useSchoolYear();
  const { data: stats = [], isLoading: statsLoading } = useAccountingStats(schoolId);
  const { data: transactions = [], isLoading: transLoading } = useTransactions(schoolId);
  const expenseCategoryColors = ['#fb7185', '#f97316', '#f59e0b', '#14b8a6', '#06b6d4', '#8b5cf6', '#6366f1'];

  const schoolYearMonths = useMemo(
    () => buildSchoolYearMonths(activeSchoolYear?.start_date, activeSchoolYear?.end_date),
    [activeSchoolYear?.end_date, activeSchoolYear?.start_date]
  );

  const [selectedSummaryMonth, setSelectedSummaryMonth] = useState('');
  const [selectedChartMonth, setSelectedChartMonth] = useState('all');

  useEffect(() => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const fallbackMonth = schoolYearMonths.at(-1)?.value || '';
    const nextMonth = schoolYearMonths.some((month) => month.value === currentMonth)
      ? currentMonth
      : fallbackMonth;

    setSelectedSummaryMonth(nextMonth);
    setSelectedChartMonth(nextMonth || 'all');
  }, [schoolYearMonths]);

  const schoolYearMonthSet = useMemo(
    () => new Set(schoolYearMonths.map((month) => month.value)),
    [schoolYearMonths]
  );

  const filteredTransactions = useMemo(() => {
    if (schoolYearMonthSet.size === 0) return transactions;

    return transactions.filter((transaction) => schoolYearMonthSet.has(getMonthKey(transaction.transaction_date)));
  }, [schoolYearMonthSet, transactions]);

  const filteredStats = useMemo(() => {
    if (schoolYearMonthSet.size === 0) return stats;

    return stats.filter((stat) => schoolYearMonthSet.has(getMonthKey(stat.month)));
  }, [schoolYearMonthSet, stats]);

  const summary = useMemo(() => {
    const selectedMonthStats = filteredStats.find((stat) => getMonthKey(stat.month) === selectedSummaryMonth);

    const selectedMonthTransactions = filteredTransactions.filter(
      (transaction) => getMonthKey(transaction.transaction_date) === selectedSummaryMonth
    );

    const selectedMonthIncomeFromTransactions = selectedMonthTransactions
      .filter((transaction) => transaction.type === 'income')
      .reduce((sum, transaction) => sum + Number(transaction.amount), 0);

    const selectedMonthExpenseFromTransactions = selectedMonthTransactions
      .filter((transaction) => transaction.type === 'expense')
      .reduce((sum, transaction) => sum + Number(transaction.amount), 0);

    const schoolYearIncome = filteredTransactions
      .filter((transaction) => transaction.type === 'income')
      .reduce((sum, transaction) => sum + Number(transaction.amount), 0);

    const schoolYearExpense = filteredTransactions
      .filter((transaction) => transaction.type === 'expense')
      .reduce((sum, transaction) => sum + Number(transaction.amount), 0);

    return {
      currentMonthIncome: selectedMonthStats?.total_income ?? selectedMonthIncomeFromTransactions,
      currentMonthExpense: selectedMonthStats?.total_expense ?? selectedMonthExpenseFromTransactions,
      currentMonthBalance:
        selectedMonthStats?.net_balance ?? (selectedMonthIncomeFromTransactions - selectedMonthExpenseFromTransactions),
      totalIncome: schoolYearIncome,
      totalExpense: schoolYearExpense,
      totalBalance: schoolYearIncome - schoolYearExpense,
    };
  }, [filteredStats, filteredTransactions, selectedSummaryMonth]);

  const expenseCategoryData = useMemo(() => {
    const chartTransactions = filteredTransactions.filter((transaction) => {
      if (transaction.type !== 'expense') return false;
      if (selectedChartMonth === 'all') return true;
      return getMonthKey(transaction.transaction_date) === selectedChartMonth;
    });

    const categoryTotals = chartTransactions.reduce((accumulator, transaction) => {
      const category = transaction.category?.trim() || 'Sans categorie';
      accumulator.set(category, (accumulator.get(category) || 0) + Number(transaction.amount));
      return accumulator;
    }, new Map<string, number>());

    return Array.from(categoryTotals.entries())
      .map(([category, amount], index) => ({
        category,
        amount,
        fill: expenseCategoryColors[index % expenseCategoryColors.length],
      }))
      .sort((left, right) => right.amount - left.amount);
  }, [expenseCategoryColors, filteredTransactions, selectedChartMonth]);

  const evolutionStats = useMemo(() => {
    const statsByMonth = new Map(filteredStats.map((stat) => [getMonthKey(stat.month), stat]));

    const sourceMonths = schoolYearMonths.length > 0
      ? [...schoolYearMonths].reverse()
      : filteredStats.map((stat) => ({
          value: getMonthKey(stat.month),
          label: formatMonthLabel(getMonthKey(stat.month)),
        }));

    return sourceMonths.map((month) => {
      const stat = statsByMonth.get(month.value);

      return {
        month: month.value,
        label: month.label,
        total_income: stat?.total_income || 0,
        total_expense: stat?.total_expense || 0,
        net_balance: stat?.net_balance || 0,
      };
    });
  }, [filteredStats, schoolYearMonths]);

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
      <Card className="overflow-hidden border-0 bg-transparent shadow-[0_24px_70px_-32px_rgba(15,23,42,0.75)]">
        <CardContent className="bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 p-4 sm:p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-300/70">Période analysée</p>
              <p className="mt-1 text-sm text-slate-200">
                {activeSchoolYear?.year_label || 'Année scolaire non définie'}
              </p>
            </div>

            <div className="w-full sm:w-[260px]">
              <Select value={selectedSummaryMonth} onValueChange={setSelectedSummaryMonth}>
                <SelectTrigger className="border-white/10 bg-white/5 text-white">
                  <SelectValue placeholder="Choisir un mois" />
                </SelectTrigger>
                <SelectContent>
                  {schoolYearMonths.map((month) => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-[28px] border border-emerald-400/15 bg-white/5 p-4 sm:p-5 backdrop-blur-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-200/70">Revenus</p>
                  <div className="mt-3 text-2xl font-bold text-white sm:text-3xl">
                    {formatAmount(summary.currentMonthIncome)}
                  </div>
                </div>
                <div className="rounded-full border border-emerald-300/25 bg-emerald-400/10 p-2.5 shadow-[0_0_24px_rgba(16,185,129,0.18)]">
                  <TrendingUp className="h-4 w-4 text-emerald-300" />
                </div>
              </div>
              <p className="mt-3 text-xs text-slate-300">
                {selectedSummaryMonth ? formatMonthLabel(selectedSummaryMonth) : 'Mois non sélectionné'} · Cumul année scolaire: {formatAmount(summary.totalIncome)}
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
                {selectedSummaryMonth ? formatMonthLabel(selectedSummaryMonth) : 'Mois non sélectionné'} · Solde année scolaire: {formatAmount(summary.totalBalance)}
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-[28px] border border-rose-300/15 bg-white/5 p-4 sm:p-5 backdrop-blur-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-rose-200/70">Dépenses</p>
                <div className="mt-3 text-2xl font-bold text-white sm:text-3xl">
                  {formatAmount(summary.currentMonthExpense)}
                </div>
              </div>
              <div className="rounded-full border border-rose-300/25 bg-rose-400/10 p-2.5 shadow-[0_0_24px_rgba(251,113,133,0.16)]">
                <TrendingDown className="h-4 w-4 text-rose-200" />
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-300">
              {selectedSummaryMonth ? formatMonthLabel(selectedSummaryMonth) : 'Mois non sélectionné'} · Cumul année scolaire: {formatAmount(summary.totalExpense)}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              Dépenses par catégorie
            </CardTitle>

            <div className="w-full md:w-[240px]">
              <Select value={selectedChartMonth} onValueChange={setSelectedChartMonth}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un mois" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toute l'année scolaire</SelectItem>
                  {schoolYearMonths.map((month) => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {expenseCategoryData.length === 0 ? (
            <div className="rounded-2xl border border-dashed py-10 text-center text-sm text-muted-foreground">
              Aucune dépense enregistrée pour afficher le diagramme.
            </div>
          ) : (
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,1fr)] xl:items-start">
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={expenseCategoryData}
                    margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="category"
                      tickLine={false}
                      axisLine={false}
                      interval={0}
                      angle={expenseCategoryData.length > 4 ? -18 : 0}
                      textAnchor={expenseCategoryData.length > 4 ? 'end' : 'middle'}
                      height={expenseCategoryData.length > 4 ? 64 : 40}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value: number) => new Intl.NumberFormat('fr-FR', {
                        notation: 'compact',
                        maximumFractionDigits: 1,
                      }).format(value)}
                    />
                    <Tooltip
                      formatter={(value: number) => [formatAmount(value), 'Montant']}
                      contentStyle={{ borderRadius: '12px', borderColor: 'hsl(var(--border))' }}
                    />
                    <Bar dataKey="amount" radius={[12, 12, 0, 0]}>
                      {expenseCategoryData.map((entry) => (
                        <Cell key={entry.category} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
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
            {evolutionStats.map((stat) => {
              return (
                <div key={stat.month} className="flex items-center justify-between rounded-2xl border bg-card/70 px-4 py-3">
                  <div>
                    <p className="font-medium capitalize text-foreground">{stat.label}</p>
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
