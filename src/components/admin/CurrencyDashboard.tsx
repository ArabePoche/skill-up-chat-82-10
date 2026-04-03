/**
 * Tableau de bord complet des monnaies virtuelles (PIB, masse monétaire, vélocité, etc.)
 * Affiche des indicateurs macro-économiques du système SC/SB/Habbah
 */
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  TrendingUp, TrendingDown, Coins, Wallet, Users, ArrowUpDown,
  Activity, Globe, BarChart3, PieChart, RefreshCw, DollarSign,
  Banknote, Gem, Sparkles, ShieldCheck
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart as RechartPie, Pie, Cell, CartesianGrid, Legend, Area, AreaChart } from 'recharts';

// Couleurs du design system
const COLORS = {
  sc: 'hsl(var(--primary))',
  sb: 'hsl(142 76% 36%)',
  habbah: 'hsl(45 93% 47%)',
  chart: ['hsl(var(--primary))', 'hsl(142 76% 36%)', 'hsl(45 93% 47%)', 'hsl(280 67% 55%)']
};

const CurrencyDashboard: React.FC = () => {
  // 1. Masse monétaire totale (tous les wallets)
  const { data: moneySupply, isLoading: loadingSupply } = useQuery({
    queryKey: ['currency-money-supply'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_wallets')
        .select('soumboulah_cash, soumboulah_bonus, habbah');
      if (error) throw error;

      const totals = (data || []).reduce(
        (acc, w) => ({
          totalSC: acc.totalSC + (w.soumboulah_cash || 0),
          totalSB: acc.totalSB + (w.soumboulah_bonus || 0),
          totalHabbah: acc.totalHabbah + (w.habbah || 0),
          walletCount: acc.walletCount + 1,
          activeSC: acc.activeSC + (w.soumboulah_cash > 0 ? 1 : 0),
          activeSB: acc.activeSB + (w.soumboulah_bonus > 0 ? 1 : 0),
          activeHabbah: acc.activeHabbah + (w.habbah > 0 ? 1 : 0),
        }),
        { totalSC: 0, totalSB: 0, totalHabbah: 0, walletCount: 0, activeSC: 0, activeSB: 0, activeHabbah: 0 }
      );

      return totals;
    },
    refetchInterval: 30000,
  });

  // 2. Volume de transactions (30 derniers jours)
  const { data: txVolume, isLoading: loadingTx } = useQuery({
    queryKey: ['currency-tx-volume'],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('currency, amount, transaction_type, created_at')
        .gte('created_at', thirtyDaysAgo.toISOString());
      if (error) throw error;

      const txs = data || [];
      
      // Volume par devise
      const volumeByCurrency = { sc: 0, sb: 0, habbah: 0 };
      const creditsByType: Record<string, number> = {};
      const debitsByType: Record<string, number> = {};
      
      // Données par jour pour le graphique
      const dailyMap = new Map<string, { date: string; sc: number; sb: number; habbah: number; count: number }>();

      txs.forEach(tx => {
        const absAmount = Math.abs(tx.amount);
        const day = tx.created_at.slice(0, 10);

        if (tx.currency === 'soumboulah_cash') volumeByCurrency.sc += absAmount;
        else if (tx.currency === 'soumboulah_bonus') volumeByCurrency.sb += absAmount;
        else if (tx.currency === 'habbah') volumeByCurrency.habbah += absAmount;

        // Crédits vs débits
        if (tx.amount > 0) {
          creditsByType[tx.transaction_type] = (creditsByType[tx.transaction_type] || 0) + absAmount;
        } else {
          debitsByType[tx.transaction_type] = (debitsByType[tx.transaction_type] || 0) + absAmount;
        }

        // Par jour
        if (!dailyMap.has(day)) {
          dailyMap.set(day, { date: day, sc: 0, sb: 0, habbah: 0, count: 0 });
        }
        const d = dailyMap.get(day)!;
        d.count++;
        if (tx.currency === 'soumboulah_cash') d.sc += absAmount;
        else if (tx.currency === 'soumboulah_bonus') d.sb += absAmount;
        else if (tx.currency === 'habbah') d.habbah += absAmount;
      });

      const dailyData = Array.from(dailyMap.values())
        .sort((a, b) => a.date.localeCompare(b.date))
        .map(d => ({
          ...d,
          date: new Date(d.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
        }));

      return {
        volumeByCurrency,
        totalTransactions: txs.length,
        creditsByType,
        debitsByType,
        dailyData,
        totalVolume: volumeByCurrency.sc + volumeByCurrency.sb + volumeByCurrency.habbah,
      };
    },
    refetchInterval: 60000,
  });

  // 3. Taux de conversion SC/FCFA
  const { data: convSettings } = useQuery({
    queryKey: ['currency-conv-settings-dash'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('currency_conversion_settings')
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
  });

  // 4. Top holders
  const { data: topHolders } = useQuery({
    queryKey: ['currency-top-holders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_wallets')
        .select('user_id, soumboulah_cash, soumboulah_bonus, habbah')
        .order('soumboulah_cash', { ascending: false })
        .limit(10);
      if (error) throw error;

      // Récupérer les profils
      const userIds = (data || []).map(w => w.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', userIds);

      const profileMap = new Map((profiles || []).map(p => [p.id, p]));

      return (data || []).map(w => ({
        ...w,
        name: profileMap.has(w.user_id)
          ? `${profileMap.get(w.user_id)!.first_name || ''} ${profileMap.get(w.user_id)!.last_name || ''}`.trim()
          : 'Inconnu',
        total: w.soumboulah_cash + w.soumboulah_bonus + w.habbah
      }));
    },
  });

  // 5. Marketplace escrow stats
  const { data: escrowStats } = useQuery({
    queryKey: ['currency-escrow-stats'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('marketplace_orders')
        .select('status, sc_amount, commission_amount, seller_amount');
      if (error) throw error;

      const orders = data || [];
      return {
        totalOrders: orders.length,
        inEscrow: orders.filter((o: any) => ['paid', 'shipped'].includes(o.status)).reduce((s: number, o: any) => s + (o.sc_amount || 0), 0),
        released: orders.filter((o: any) => o.status === 'confirmed').reduce((s: number, o: any) => s + (o.seller_amount || 0), 0),
        commissions: orders.reduce((s: number, o: any) => s + (o.commission_amount || 0), 0),
        refunded: orders.filter((o: any) => o.status === 'refunded').reduce((s: number, o: any) => s + (o.sc_amount || 0), 0),
      };
    },
  });

  const isLoading = loadingSupply || loadingTx;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Chargement du tableau de bord...</span>
      </div>
    );
  }

  const scToFcfa = convSettings?.sc_to_fcfa_rate || 10;
  const gdp = (moneySupply?.totalSC || 0) * scToFcfa; // PIB en FCFA
  const velocity = moneySupply?.totalSC ? (txVolume?.volumeByCurrency.sc || 0) / moneySupply.totalSC : 0;

  // Données pour le pie chart de répartition
  const supplyPieData = [
    { name: 'SC', value: moneySupply?.totalSC || 0, fill: COLORS.chart[0] },
    { name: 'SB', value: moneySupply?.totalSB || 0, fill: COLORS.chart[1] },
    { name: 'Habbah', value: moneySupply?.totalHabbah || 0, fill: COLORS.chart[2] },
  ];

  // Top transaction types
  const txTypeData = Object.entries(txVolume?.creditsByType || {})
    .map(([type, amount]) => ({ type: type.replace(/_/g, ' '), credits: amount, debits: txVolume?.debitsByType[type] || 0 }))
    .sort((a, b) => (b.credits + b.debits) - (a.credits + a.debits))
    .slice(0, 8);

  const formatNumber = (n: number) => new Intl.NumberFormat('fr-FR').format(Math.round(n));
  const formatCurrency = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', minimumFractionDigits: 0 }).format(n);

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Globe className="h-6 w-6 text-primary" />
          Économie Virtuelle — Tableau de Bord
        </h2>
        <p className="text-muted-foreground mt-1">
          Vue macro-économique du système monétaire Soumboulah
        </p>
      </div>

      {/* KPIs principaux */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="PIB Virtuel"
          value={formatCurrency(gdp)}
          subtitle={`${formatNumber(moneySupply?.totalSC || 0)} SC × ${scToFcfa} FCFA`}
          icon={<Globe className="h-5 w-5" />}
          trend="primary"
        />
        <StatCard
          title="Masse Monétaire SC"
          value={`${formatNumber(moneySupply?.totalSC || 0)} SC`}
          subtitle={`${moneySupply?.activeSC || 0} portefeuilles actifs`}
          icon={<Banknote className="h-5 w-5" />}
          trend="primary"
        />
        <StatCard
          title="Masse SB"
          value={`${formatNumber(moneySupply?.totalSB || 0)} SB`}
          subtitle={`${moneySupply?.activeSB || 0} porteurs`}
          icon={<Gem className="h-5 w-5" />}
          trend="success"
        />
        <StatCard
          title="Habbah en Circulation"
          value={`${formatNumber(moneySupply?.totalHabbah || 0)} H`}
          subtitle={`${moneySupply?.activeHabbah || 0} utilisateurs`}
          icon={<Sparkles className="h-5 w-5" />}
          trend="warning"
        />
      </div>

      {/* KPIs secondaires */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Vélocité SC"
          value={velocity.toFixed(2)}
          subtitle="Rotations / 30j"
          icon={<Activity className="h-5 w-5" />}
          trend="neutral"
        />
        <StatCard
          title="Transactions (30j)"
          value={formatNumber(txVolume?.totalTransactions || 0)}
          subtitle={`Volume: ${formatNumber(txVolume?.totalVolume || 0)}`}
          icon={<ArrowUpDown className="h-5 w-5" />}
          trend="neutral"
        />
        <StatCard
          title="SC en Séquestre"
          value={`${formatNumber(escrowStats?.inEscrow || 0)} SC`}
          subtitle={`${escrowStats?.totalOrders || 0} commandes`}
          icon={<ShieldCheck className="h-5 w-5" />}
          trend="primary"
        />
        <StatCard
          title="Commissions Marketplace"
          value={`${formatNumber(escrowStats?.commissions || 0)} SC`}
          subtitle={`Libéré: ${formatNumber(escrowStats?.released || 0)} SC`}
          icon={<DollarSign className="h-5 w-5" />}
          trend="success"
        />
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full max-w-lg">
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="flows">Flux</TabsTrigger>
          <TabsTrigger value="holders">Top Holders</TabsTrigger>
          <TabsTrigger value="escrow">Séquestre</TabsTrigger>
        </TabsList>

        {/* Vue d'ensemble */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Répartition de la masse monétaire */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <PieChart className="h-4 w-4" />
                  Répartition de la Masse Monétaire
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartPie>
                      <Pie
                        data={supplyPieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={90}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {supplyPieData.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => formatNumber(v)} />
                      <Legend />
                    </RechartPie>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Portefeuilles */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Wallet className="h-4 w-4" />
                  Statistiques Portefeuilles
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <WalletStat
                    label="Portefeuilles créés"
                    value={moneySupply?.walletCount || 0}
                    icon={<Users className="h-4 w-4 text-muted-foreground" />}
                  />
                  <WalletStat
                    label="SC moyen / portefeuille"
                    value={moneySupply?.walletCount ? Math.round((moneySupply.totalSC || 0) / moneySupply.walletCount) : 0}
                    suffix="SC"
                    icon={<Banknote className="h-4 w-4 text-primary" />}
                  />
                  <WalletStat
                    label="SB moyen / portefeuille"
                    value={moneySupply?.walletCount ? Math.round((moneySupply.totalSB || 0) / moneySupply.walletCount) : 0}
                    suffix="SB"
                    icon={<Gem className="h-4 w-4 text-green-600" />}
                  />
                  <WalletStat
                    label="Habbah moyen / utilisateur"
                    value={moneySupply?.walletCount ? Math.round((moneySupply.totalHabbah || 0) / moneySupply.walletCount) : 0}
                    suffix="H"
                    icon={<Sparkles className="h-4 w-4 text-amber-500" />}
                  />
                  <WalletStat
                    label="Taux de conversion"
                    value={scToFcfa}
                    suffix="FCFA/SC"
                    icon={<ArrowUpDown className="h-4 w-4 text-muted-foreground" />}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Flux de transactions */}
        <TabsContent value="flows" className="space-y-4">
          {/* Graphique d'activité quotidienne */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Activité Quotidienne (30 jours)</CardTitle>
              <CardDescription>Volume de transactions par devise</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={txVolume?.dailyData || []}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" fontSize={11} />
                    <YAxis fontSize={11} />
                    <Tooltip formatter={(v: number) => formatNumber(v)} />
                    <Legend />
                    <Area type="monotone" dataKey="sc" name="SC" stackId="1" fill="hsl(var(--primary))" stroke="hsl(var(--primary))" fillOpacity={0.6} />
                    <Area type="monotone" dataKey="sb" name="SB" stackId="1" fill="hsl(142 76% 36%)" stroke="hsl(142 76% 36%)" fillOpacity={0.6} />
                    <Area type="monotone" dataKey="habbah" name="Habbah" stackId="1" fill="hsl(45 93% 47%)" stroke="hsl(45 93% 47%)" fillOpacity={0.6} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Types de transactions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Types de Transactions</CardTitle>
              <CardDescription>Crédits vs débits par type</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={txTypeData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" fontSize={11} />
                    <YAxis dataKey="type" type="category" width={120} fontSize={11} />
                    <Tooltip formatter={(v: number) => formatNumber(v)} />
                    <Legend />
                    <Bar dataKey="credits" name="Crédits" fill="hsl(142 76% 36%)" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="debits" name="Débits" fill="hsl(0 84% 60%)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Top Holders */}
        <TabsContent value="holders">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" />
                Top 10 — Plus gros portefeuilles
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {(topHolders || []).map((holder, i) => (
                  <div key={holder.user_id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${i < 3 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                        {i + 1}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{holder.name}</p>
                        <p className="text-xs text-muted-foreground">Total: {formatNumber(holder.total)}</p>
                      </div>
                    </div>
                    <div className="flex gap-3 text-xs">
                      <Badge variant="outline" className="font-mono">{formatNumber(holder.soumboulah_cash)} SC</Badge>
                      <Badge variant="secondary" className="font-mono">{formatNumber(holder.soumboulah_bonus)} SB</Badge>
                      <Badge className="bg-amber-100 text-amber-800 font-mono">{formatNumber(holder.habbah)} H</Badge>
                    </div>
                  </div>
                ))}
                {(!topHolders || topHolders.length === 0) && (
                  <p className="text-center text-muted-foreground py-8">Aucun portefeuille trouvé</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Séquestre */}
        <TabsContent value="escrow">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Fonds en Séquestre</CardTitle>
                <CardDescription>Marketplace - montants bloqués</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <WalletStat label="En attente (séquestre)" value={escrowStats?.inEscrow || 0} suffix="SC" icon={<ShieldCheck className="h-4 w-4 text-blue-500" />} />
                <WalletStat label="Libérés (vendeurs)" value={escrowStats?.released || 0} suffix="SC" icon={<TrendingUp className="h-4 w-4 text-green-600" />} />
                <WalletStat label="Remboursés" value={escrowStats?.refunded || 0} suffix="SC" icon={<TrendingDown className="h-4 w-4 text-red-500" />} />
                <WalletStat label="Commissions perçues" value={escrowStats?.commissions || 0} suffix="SC" icon={<DollarSign className="h-4 w-4 text-primary" />} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Santé Économique</CardTitle>
                <CardDescription>Indicateurs clés</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <HealthIndicator
                    label="Vélocité monétaire"
                    value={velocity}
                    status={velocity > 0.5 ? 'good' : velocity > 0.1 ? 'moderate' : 'low'}
                    description={velocity > 0.5 ? 'Circulation active' : velocity > 0.1 ? 'Circulation modérée' : 'Faible circulation'}
                  />
                  <HealthIndicator
                    label="Taux d'adoption SC"
                    value={moneySupply?.walletCount ? Math.round((moneySupply.activeSC / moneySupply.walletCount) * 100) : 0}
                    suffix="%"
                    status={(moneySupply?.activeSC || 0) / (moneySupply?.walletCount || 1) > 0.5 ? 'good' : 'moderate'}
                    description="Portefeuilles avec SC > 0"
                  />
                  <HealthIndicator
                    label="Indice de concentration"
                    value={topHolders?.length ? Math.round(((topHolders[0]?.soumboulah_cash || 0) / (moneySupply?.totalSC || 1)) * 100) : 0}
                    suffix="%"
                    status={(topHolders?.[0]?.soumboulah_cash || 0) / (moneySupply?.totalSC || 1) < 0.3 ? 'good' : 'moderate'}
                    description="Part du top 1 holder"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Composant stat card
const StatCard: React.FC<{
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  trend: 'primary' | 'success' | 'warning' | 'neutral';
}> = ({ title, value, subtitle, icon, trend }) => {
  const trendColors = {
    primary: 'text-primary',
    success: 'text-green-600',
    warning: 'text-amber-500',
    neutral: 'text-muted-foreground',
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</span>
          <div className={trendColors[trend]}>{icon}</div>
        </div>
        <p className="text-xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
      </CardContent>
    </Card>
  );
};

// Composant wallet stat
const WalletStat: React.FC<{
  label: string;
  value: number;
  suffix?: string;
  icon: React.ReactNode;
}> = ({ label, value, suffix, icon }) => (
  <div className="flex items-center justify-between py-2 border-b last:border-0">
    <div className="flex items-center gap-2">
      {icon}
      <span className="text-sm">{label}</span>
    </div>
    <span className="font-semibold text-sm">
      {new Intl.NumberFormat('fr-FR').format(value)} {suffix || ''}
    </span>
  </div>
);

// Composant indicateur de santé
const HealthIndicator: React.FC<{
  label: string;
  value: number;
  suffix?: string;
  status: 'good' | 'moderate' | 'low';
  description: string;
}> = ({ label, value, suffix, status, description }) => {
  const statusConfig = {
    good: { color: 'bg-green-500', badge: 'Bon', badgeClass: 'bg-green-100 text-green-800' },
    moderate: { color: 'bg-amber-500', badge: 'Modéré', badgeClass: 'bg-amber-100 text-amber-800' },
    low: { color: 'bg-red-500', badge: 'Faible', badgeClass: 'bg-red-100 text-red-800' },
  };
  const cfg = statusConfig[status];

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm">{typeof value === 'number' && value % 1 !== 0 ? value.toFixed(2) : value}{suffix}</span>
          <Badge className={cfg.badgeClass}>{cfg.badge}</Badge>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
};

export default CurrencyDashboard;
