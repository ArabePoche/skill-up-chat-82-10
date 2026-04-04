import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, TrendingUp, Building2, Coins, BadgeCheck, Clock, XCircle } from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';

interface RevenueStats {
  total_xof: number;
  total_sc: number;
  mrr: number;
  arr: number;
  count_paid: number;
  count_pending: number;
  count_rejected: number;
  by_plan: { plan_name: string; count: number; total_xof: number }[];
  by_method: { method: string; count: number; total_xof: number }[];
  recent_paid: {
    id: string;
    school_name: string;
    plan_name: string;
    amount_xof: number;
    amount_sc: number | null;
    payment_method: string;
    billing_cycle: string;
    created_at: string;
  }[];
}

interface PlanDist {
  slug: string;
  name: string;
  count: number;
  active: number;
  expired: number;
}

export default function SchoolRevenueDashboard() {
  const [stats, setStats] = useState<RevenueStats | null>(null);
  const [planDist, setPlanDist] = useState<PlanDist[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'all' | '1m' | '3m' | '6m' | '12m'>('all');

  const fetchStats = async () => {
    try {
      setLoading(true);

      // Date filter
      let fromDate: string | null = null;
      if (period !== 'all') {
        const months = parseInt(period);
        fromDate = startOfMonth(subMonths(new Date(), months - 1)).toISOString();
      }

      // Fetch all payments
      let query = supabase
        .from('school_subscription_payments' as any)
        .select(`
          id, school_id, plan_id, payment_method, status,
          amount_xof, amount_sc, billing_cycle, created_at
        `) as any;

      if (fromDate) query = query.gte('created_at', fromDate);
      const { data: payments, error: pe } = await query;
      if (pe) throw pe;

      // Fetch plans for names and prices
      const { data: plans } = await supabase.from('school_subscription_plans').select('id, name, slug, price_monthly, price_yearly');
      // Fetch schools for names
      const { data: schools } = await supabase.from('schools').select('id, name, subscription_plan_id, subscription_expires_at');

      const planMap: Record<string, string> = {};
      const planSlugMap: Record<string, string> = {};
      (plans || []).forEach((p: any) => { planMap[p.id] = p.name; planSlugMap[p.id] = p.slug; });
      const schoolMap: Record<string, string> = {};
      (schools || []).forEach((s: any) => { schoolMap[s.id] = s.name; });

      const paid = (payments || []).filter((p: any) => p.status === 'paid');
      const pending = (payments || []).filter((p: any) => p.status === 'pending');
      const rejected = (payments || []).filter((p: any) => p.status === 'rejected');

      const totalXof = paid.reduce((sum: number, p: any) => sum + Number(p.amount_xof), 0);
      const totalSc = paid.reduce((sum: number, p: any) => sum + Number(p.amount_sc || 0), 0);

      // By plan
      const byPlanMap: Record<string, { count: number; total_xof: number }> = {};
      paid.forEach((p: any) => {
        const name = planMap[p.plan_id] || '–';
        if (!byPlanMap[name]) byPlanMap[name] = { count: 0, total_xof: 0 };
        byPlanMap[name].count++;
        byPlanMap[name].total_xof += Number(p.amount_xof);
      });
      const by_plan = Object.entries(byPlanMap).map(([plan_name, v]) => ({ plan_name, ...v }));

      // By method
      const byMethodMap: Record<string, { count: number; total_xof: number }> = {};
      paid.forEach((p: any) => {
        const method = p.payment_method;
        if (!byMethodMap[method]) byMethodMap[method] = { count: 0, total_xof: 0 };
        byMethodMap[method].count++;
        byMethodMap[method].total_xof += Number(p.amount_xof);
      });
      const by_method = Object.entries(byMethodMap).map(([method, v]) => ({ method, ...v }));

      // Recent paid
      const recent_paid = paid
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 10)
        .map((p: any) => ({
          id: p.id,
          school_name: schoolMap[p.school_id] || p.school_id,
          plan_name: planMap[p.plan_id] || '–',
          amount_xof: Number(p.amount_xof),
          amount_sc: p.amount_sc ? Number(p.amount_sc) : null,
          payment_method: p.payment_method,
          billing_cycle: p.billing_cycle,
          created_at: p.created_at,
        }));

      // Plan distribution from schools
      const planCounts: Record<string, PlanDist> = {};
      const planPrices: Record<string, { m: number, y: number }> = {};
      (plans || []).forEach((p: any) => {
        planCounts[p.id] = { slug: p.slug, name: p.name, count: 0, active: 0, expired: 0 };
        planPrices[p.id] = { m: Number(p.price_monthly || 0), y: Number(p.price_yearly || (p.price_monthly || 0) * 12) };
      });
      
      let current_mrr = 0;
      let current_arr = 0;

      (schools || []).forEach((s: any) => {
        const pid = s.subscription_plan_id;
        if (pid && planCounts[pid]) {
          planCounts[pid].count++;
          const expired = s.subscription_expires_at && new Date(s.subscription_expires_at) < new Date();
          if (expired) {
            planCounts[pid].expired++;
          } else {
            planCounts[pid].active++;
             // Compute MRR and ARR from active plans (estimation)
            current_mrr += planPrices[pid].m;
            current_arr += planPrices[pid].y;
          }
        }
      });
      setPlanDist(Object.values(planCounts).sort((a, b) => b.count - a.count));

      setStats({ 
        total_xof: totalXof, 
        total_sc: totalSc, 
        mrr: current_mrr,
        arr: current_arr,
        count_paid: paid.length, 
        count_pending: pending.length, 
        count_rejected: rejected.length, 
        by_plan, 
        by_method, 
        recent_paid 
      });

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStats(); }, [period]);

  const planBadge = (slug: string) => {
    if (slug === 'premium') return 'bg-purple-100 text-purple-800';
    if (slug === 'standard') return 'bg-blue-100 text-blue-800';
    return 'bg-gray-100 text-gray-600';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Revenus des Abonnements Écoles</h2>
          <p className="text-muted-foreground mt-1">Vue globale des paiements, plans actifs et revenus</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={v => setPeriod(v as any)}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toute la période</SelectItem>
              <SelectItem value="1">Ce mois</SelectItem>
              <SelectItem value="3">3 derniers mois</SelectItem>
              <SelectItem value="6">6 derniers mois</SelectItem>
              <SelectItem value="12">12 derniers mois</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={fetchStats}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {loading || !stats ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1.5"><TrendingUp className="h-4 w-4 text-green-500" />Revenus totaux</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold">{stats.total_xof.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">XOF encaissés</p>
                {stats.total_sc > 0 && (
                  <p className="text-xs text-emerald-600 flex items-center gap-1 mt-0.5">
                    <Coins className="h-3 w-3" />{stats.total_sc.toLocaleString()} SC déduits
                  </p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1.5"><TrendingUp className="h-4 w-4 text-blue-500" />MRR (Mensuel)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-blue-700">{stats.mrr.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">revenu récurrent / mois</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1.5"><TrendingUp className="h-4 w-4 text-purple-500" />ARR (Annuel)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-purple-700">{stats.arr.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">revenu récurrent / an</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1.5"><BadgeCheck className="h-4 w-4 text-green-500" />Paiements validés</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-700">{stats.count_paid}</div>
                <p className="text-xs text-muted-foreground">abonnements activés</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1.5"><Clock className="h-4 w-4 text-amber-500" />En attente</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-700">{stats.count_pending}</div>
                <p className="text-xs text-muted-foreground">paiements manuels</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1.5"><XCircle className="h-4 w-4 text-red-400" />Rejetés</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{stats.count_rejected}</div>
                <p className="text-xs text-muted-foreground">paiements non validés</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Distribution par plan */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Building2 className="h-5 w-5" />
                  Distribution des écoles par plan
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {planDist.map(p => (
                    <div key={p.slug}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${planBadge(p.slug)}`}>{p.name}</span>
                        <span className="text-muted-foreground">{p.count} école{p.count > 1 ? 's' : ''}</span>
                      </div>
                      <div className="flex gap-2 text-xs text-muted-foreground">
                        <span className="text-green-600">✓ {p.active} actives</span>
                        {p.expired > 0 && <span className="text-red-500">⚠ {p.expired} expirées</span>}
                      </div>
                      <div className="mt-1 h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-2 rounded-full ${p.slug === 'premium' ? 'bg-purple-500' : p.slug === 'standard' ? 'bg-blue-500' : 'bg-gray-400'}`}
                          style={{ width: planDist.reduce((s, x) => s + x.count, 0) > 0 ? `${(p.count / planDist.reduce((s, x) => s + x.count, 0)) * 100}%` : '0%' }}
                        />
                      </div>
                    </div>
                  ))}
                  {planDist.every(p => p.count === 0) && (
                    <p className="text-muted-foreground text-sm text-center py-4">Aucune école enregistrée.</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Répartition par méthode et par plan */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2"><Coins className="h-4 w-4" />Revenus par plan</CardTitle>
                </CardHeader>
                <CardContent>
                  {stats.by_plan.length === 0 ? (
                    <p className="text-muted-foreground text-sm text-center py-4">Aucun paiement.</p>
                  ) : (
                    <div className="space-y-2">
                      {stats.by_plan.map(b => (
                        <div key={b.plan_name} className="flex justify-between text-sm py-1 border-b last:border-0">
                          <span className="font-medium">{b.plan_name}</span>
                          <div className="text-right">
                            <div className="font-bold">{b.total_xof.toLocaleString()} XOF</div>
                            <div className="text-xs text-muted-foreground">{b.count} paiement{b.count > 1 ? 's' : ''}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Par méthode de paiement</CardTitle>
                </CardHeader>
                <CardContent>
                  {stats.by_method.length === 0 ? (
                    <p className="text-muted-foreground text-sm text-center py-4">Aucun paiement.</p>
                  ) : (
                    <div className="space-y-2">
                      {stats.by_method.map(b => (
                        <div key={b.method} className="flex justify-between text-sm py-1 border-b last:border-0">
                          <span className="flex items-center gap-1.5 font-medium">
                            {b.method === 'sc' ? <><Coins className="h-3.5 w-3.5 text-emerald-500" />SC (Soumboulah Cash)</> : <>🏦 Manuel / externe</>}
                          </span>
                          <div className="text-right">
                            <div className="font-bold">{b.total_xof.toLocaleString()} XOF</div>
                            <div className="text-xs text-muted-foreground">{b.count} paiement{b.count > 1 ? 's' : ''}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Derniers paiements */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Derniers paiements validés</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>École</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Méthode</TableHead>
                    <TableHead>Cycle</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.recent_paid.map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.school_name}</TableCell>
                      <TableCell>{p.plan_name}</TableCell>
                      <TableCell>
                        {p.payment_method === 'sc'
                          ? <span className="flex items-center gap-1 text-emerald-700 text-sm"><Coins className="h-3.5 w-3.5" />SC</span>
                          : <span className="text-blue-700 text-sm">🏦 Manuel</span>}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{p.billing_cycle === 'yearly' ? 'Annuel' : 'Mensuel'}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold">{p.amount_xof.toLocaleString()} XOF</div>
                        {p.amount_sc && <div className="text-xs text-emerald-600">{p.amount_sc} SC</div>}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(p.created_at), 'dd MMM yyyy', { locale: fr })}
                      </TableCell>
                    </TableRow>
                  ))}
                  {stats.recent_paid.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">Aucun paiement pour cette période.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
