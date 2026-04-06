import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter as DialogFoot, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Crown, CheckCircle2, ArrowUpCircle, Coins, Clock, AlertTriangle, ExternalLink, FileCheck } from 'lucide-react';
import { format, parseISO, addMonths, addYears } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Plan {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price_monthly: number;
  price_yearly: number | null;
  currency: string;
  is_active: boolean;
  sort_order: number;
}

interface Payment {
  id: string;
  plan_id: string;
  payment_method: 'sc' | 'manual';
  status: 'pending' | 'paid' | 'rejected' | 'cancelled';
  amount_xof: number;
  amount_sc: number | null;
  billing_cycle: string;
  created_at: string;
  activated_at: string | null;
  expires_at: string | null;
  admin_note: string | null;
}

interface Props {
  schoolId: string;
}

export const SchoolSubscriptionPortal: React.FC<Props> = ({ schoolId }) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [features, setFeatures] = useState<{ feature_key: string; label: string }[]>([]);
  const [planFeatures, setPlanFeatures] = useState<{ plan_id: string; feature_key: string; enabled: boolean }[]>([]);
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);
  const [currentExpiry, setCurrentExpiry] = useState<string | null>(null);
  const [scBalance, setScBalance] = useState<number>(0);
  const [scToFcfa, setScToFcfa] = useState<number>(0);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [paymentMode, setPaymentMode] = useState<'sc' | 'manual'>('sc');
  const [manualNote, setManualNote] = useState('');
  const [paying, setPaying] = useState(false);

  useEffect(() => { fetchAll(); }, [schoolId, user?.id]);

  const fetchAll = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const [plansRes, featuresRes, planFeaturesRes, schoolRes, walletRes, convRes, paymentsRes] = await Promise.all([
        supabase.from('school_subscription_plans').select('*').eq('is_active', true).order('sort_order'),
        supabase.from('school_subscription_features').select('feature_key, label').order('sort_order'),
        supabase.from('school_plan_features').select('plan_id, feature_key, enabled'),
        supabase.from('schools').select('subscription_plan_id, subscription_expires_at').eq('id', schoolId).single(),
        supabase.from('user_wallets').select('soumboulah_cash').eq('user_id', user.id).single(),
        supabase.from('currency_conversion_settings').select('sc_to_fcfa_rate').single(),
        supabase.from('school_subscription_payments' as any).select('*').eq('school_id', schoolId).order('created_at', { ascending: false }).limit(10),
      ]);

      if (plansRes.data) setPlans(plansRes.data as Plan[]);
      if (featuresRes.data) setFeatures(featuresRes.data);
      if (planFeaturesRes.data) setPlanFeatures(planFeaturesRes.data);
      if (schoolRes.data) {
        setCurrentPlanId(schoolRes.data.subscription_plan_id);
        setCurrentExpiry(schoolRes.data.subscription_expires_at);
      }
      if (walletRes.data) setScBalance(walletRes.data.soumboulah_cash || 0);
      setScToFcfa(convRes.data?.sc_to_fcfa_rate ?? 0);
      if (paymentsRes.data) setPayments(paymentsRes.data as unknown as Payment[]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const currentPlan = plans.find(p => p.id === currentPlanId);
  const selectedPlan = plans.find(p => p.id === selectedPlanId);
  const isExpired = currentExpiry ? new Date(currentExpiry) < new Date() : false;

  const getPriceXof = () => {
    if (!selectedPlan) return 0;
    return billingCycle === 'yearly'
      ? (selectedPlan.price_yearly ?? selectedPlan.price_monthly * 12)
      : selectedPlan.price_monthly;
  };

  const getScCost = () => {
    if (scToFcfa <= 0) return 0;
    return Math.ceil(getPriceXof() / scToFcfa);
  };

  const getDurationMonths = () => billingCycle === 'yearly' ? 12 : 1;

  const computeExpiry = () => {
    const base = currentExpiry && new Date(currentExpiry) > new Date()
      ? parseISO(currentExpiry)
      : new Date();
    return billingCycle === 'yearly' ? addYears(base, 1) : addMonths(base, 1);
  };

  const openPayDialog = (planId?: string) => {
    setSelectedPlanId(planId || currentPlanId || plans[0]?.id || '');
    setBillingCycle('monthly');
    setPaymentMode('sc');
    setManualNote('');
    setDialogOpen(true);
  };

  const handlePayWithSC = async () => {
    if (!selectedPlanId || !user?.id) return;
    const scCost = getScCost();
    if (scCost <= 0) {
      toast({ title: 'Taux indisponible', description: 'Le taux SC admin n\'est pas encore chargé.', variant: 'destructive' });
      return;
    }
    if (scCost > scBalance) {
      toast({ title: 'SC insuffisant', description: `Il vous faut ${scCost} SC. Votre solde : ${scBalance} SC.`, variant: 'destructive' });
      return;
    }
    setPaying(true);
    try {
      const newExpiry = computeExpiry().toISOString();
      const { data, error } = await supabase.rpc('pay_school_subscription_with_sc' as any, {
        p_school_id: schoolId,
        p_plan_id: selectedPlanId,
        p_payer_user_id: user.id,
        p_amount_xof: getPriceXof(),
        p_amount_sc: scCost,
        p_billing_cycle: billingCycle,
        p_duration_months: getDurationMonths(),
        p_new_expires_at: newExpiry,
      });
      if (error) throw error;
      const result = data as any;
      if (!result.success) throw new Error(result.error);
      toast({ title: '✅ Abonnement activé !', description: `Plan ${selectedPlan?.name} actif jusqu'au ${format(computeExpiry(), 'dd MMMM yyyy', { locale: fr })}.` });
      setCurrentPlanId(selectedPlanId);
      setCurrentExpiry(newExpiry);
      setScBalance(prev => prev - scCost);
      setDialogOpen(false);
      await fetchAll();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message || "Paiement SC impossible.", variant: 'destructive' });
    } finally {
      setPaying(false);
    }
  };

  const handleManualRequest = async () => {
    if (!selectedPlanId || !user?.id) return;
    setPaying(true);
    try {
      const { error } = await supabase.from('school_subscription_payments' as any).insert({
        school_id: schoolId,
        plan_id: selectedPlanId,
        payer_user_id: user.id,
        payment_method: 'manual',
        status: 'pending',
        amount_xof: getPriceXof(),
        billing_cycle: billingCycle,
        duration_months: getDurationMonths(),
        expires_at: computeExpiry().toISOString(),
        admin_note: manualNote || null,
      });
      if (error) throw error;
      toast({ title: '📋 Demande envoyée', description: "Un administrateur va valider votre paiement externe sous peu." });
      setDialogOpen(false);
      await fetchAll();
    } catch (err: any) {
      toast({ title: 'Erreur', description: "Impossible d'envoyer la demande.", variant: 'destructive' });
    } finally {
      setPaying(false);
    }
  };

  const getPlanCardColor = (slug?: string) => {
    if (slug === 'premium') return 'bg-purple-100 text-purple-800 border-purple-200';
    if (slug === 'standard') return 'bg-blue-100 text-blue-800 border-blue-200';
    return 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      paid: { label: 'Payé', variant: 'default' },
      pending: { label: 'En attente validation', variant: 'secondary' },
      rejected: { label: 'Rejeté', variant: 'destructive' },
      cancelled: { label: 'Annulé', variant: 'outline' },
    };
    const s = map[status] || { label: status, variant: 'outline' as const };
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const getPlanFeatures = (planId: string) =>
    features.map(f => ({
      label: f.label,
      enabled: planFeatures.some(pf => pf.plan_id === planId && pf.feature_key === f.feature_key && pf.enabled),
    }));

  const hasPendingManual = payments.some(p => p.status === 'pending' && p.payment_method === 'manual');
  const hasScRate = scToFcfa > 0;

  return (
    <div className="space-y-6">
      {/* Statut actuel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-amber-500" />
            Votre abonnement actuel
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold border ${getPlanCardColor(currentPlan?.slug)}`}>
                {currentPlan?.name ?? '–'}
              </span>
              {isExpired && <Badge variant="destructive">Expiré</Badge>}
              {hasPendingManual && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Clock className="h-3 w-3" /> En attente de validation
                </Badge>
              )}
            </div>
            {currentExpiry && (
              <p className="text-sm text-muted-foreground">
                {isExpired ? 'Expiré le ' : 'Expire le '}
                <span className="font-medium text-foreground">{format(parseISO(currentExpiry), 'dd MMMM yyyy', { locale: fr })}</span>
              </p>
            )}
            <p className="text-xs text-muted-foreground flex items-center gap-1 pt-1">
              <Coins className="h-3.5 w-3.5 text-emerald-500" />
              Solde SC : <span className="font-semibold text-foreground">{scBalance.toLocaleString()} SC</span>
              <span className="text-muted-foreground">≈ {(scBalance * scToFcfa).toLocaleString()} FCFA</span>
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => openPayDialog()}>
              <ArrowUpCircle className="h-4 w-4 mr-2" />
              Changer / Renouveler
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Grille des plans */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {plans.map(plan => {
          const planFeat = getPlanFeatures(plan.id);
          const isCurrent = plan.id === currentPlanId;
          const scCostMonthly = hasScRate ? Math.ceil(plan.price_monthly / scToFcfa) : 0;
          return (
            <Card key={plan.id} className={`relative flex flex-col ${isCurrent ? 'border-primary ring-1 ring-primary' : ''}`}>
              {isCurrent && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">Plan actuel</span>
                </div>
              )}
              <CardHeader className="pb-2">
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="pt-1 space-y-0.5">
                  <div>
                    <span className="text-2xl font-bold">{plan.price_monthly.toLocaleString()}</span>
                    <span className="text-muted-foreground text-sm"> {plan.currency}/mois</span>
                  </div>
                  <p className="text-xs text-emerald-600 flex items-center gap-1">
                    <Coins className="h-3 w-3" />
                    {scCostMonthly} SC/mois
                  </p>
                  {plan.price_yearly && (
                    <p className="text-xs text-muted-foreground">ou {plan.price_yearly.toLocaleString()} {plan.currency}/an</p>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <ul className="space-y-1.5">
                  {planFeat.map(f => (
                    <li key={f.label} className={`flex items-center gap-2 text-sm ${!f.enabled ? 'text-muted-foreground line-through' : ''}`}>
                      <CheckCircle2 className={`h-4 w-4 flex-shrink-0 ${f.enabled ? 'text-green-500' : 'text-gray-300'}`} />
                      {f.label}
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button className="w-full" variant={isCurrent ? 'outline' : 'default'} onClick={() => openPayDialog(plan.id)}>
                  {isCurrent ? 'Renouveler' : 'Choisir ce plan'}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* Historique des paiements */}
      {payments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileCheck className="h-4 w-4" />
              Historique des paiements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {payments.map(p => {
                const plan = plans.find(pl => pl.id === p.plan_id);
                return (
                  <div key={p.id} className="flex items-center justify-between py-2 border-b last:border-0 text-sm gap-2 flex-wrap">
                    <div className="space-y-0.5">
                      <div className="font-medium">{plan?.name ?? '–'} · {p.billing_cycle === 'yearly' ? 'Annuel' : 'Mensuel'}</div>
                      <div className="text-muted-foreground text-xs">
                        {format(new Date(p.created_at), 'dd MMM yyyy', { locale: fr })}
                        {' · '}
                        {p.payment_method === 'sc' ? `${p.amount_sc} SC` : `Manuel · ${p.amount_xof.toLocaleString()} XOF`}
                      </div>
                      {p.admin_note && <div className="text-xs italic text-muted-foreground">Note : {p.admin_note}</div>}
                    </div>
                    <div>{statusBadge(p.status)}</div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialog Paiement */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Souscrire / Renouveler</DialogTitle>
            <DialogDescription>Choisissez un plan, la durée et le mode de paiement.</DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Plan */}
            <div className="space-y-2">
              <Label>Plan</Label>
              <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                <SelectTrigger><SelectValue placeholder="Choisir un plan" /></SelectTrigger>
                <SelectContent>
                  {plans.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name} — {p.price_monthly.toLocaleString()} {p.currency}/mois</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Cycle */}
            <div className="space-y-2">
              <Label>Cycle de facturation</Label>
              <RadioGroup value={billingCycle} onValueChange={v => setBillingCycle(v as 'monthly' | 'yearly')} className="flex gap-4">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="monthly" id="monthly" />
                  <Label htmlFor="monthly" className="cursor-pointer">Mensuel</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="yearly" id="yearly" />
                  <Label htmlFor="yearly" className="cursor-pointer">Annuel (-17%)</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Mode paiement */}
            <div className="space-y-2">
              <Label>Mode de paiement</Label>
              <RadioGroup value={paymentMode} onValueChange={v => setPaymentMode(v as 'sc' | 'manual')} className="flex gap-4">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="sc" id="pay-sc" />
                  <Label htmlFor="pay-sc" className="cursor-pointer flex items-center gap-1.5">
                    <Coins className="h-4 w-4 text-emerald-500" /> Payer en SC
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="manual" id="pay-manual" />
                  <Label htmlFor="pay-manual" className="cursor-pointer flex items-center gap-1.5">
                    <ExternalLink className="h-4 w-4 text-blue-500" /> Paiement externe (admin)
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Récapitulatif */}
            <div className="bg-muted rounded-lg p-4 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Plan</span>
                <span className="font-medium">{selectedPlan?.name ?? '–'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Durée</span>
                <span className="font-medium">{billingCycle === 'yearly' ? '12 mois' : '1 mois'}</span>
              </div>
              <div className="flex justify-between border-t pt-2 mt-1">
                <span className="font-semibold">Montant</span>
                <span className="font-bold">{getPriceXof().toLocaleString()} {selectedPlan?.currency ?? 'XOF'}</span>
              </div>
              {paymentMode === 'sc' && (
                <div className="flex justify-between text-emerald-700">
                  <span className="font-semibold flex items-center gap-1"><Coins className="h-3.5 w-3.5" /> Coût en SC</span>
                  <span className="font-bold">{getScCost().toLocaleString()} SC</span>
                </div>
              )}
              {paymentMode === 'sc' && !hasScRate && (
                <p className="text-xs text-amber-700 pt-1">
                  Taux admin non chargé : coût SC affiché à 0 temporairement.
                </p>
              )}
              <p className="text-xs text-muted-foreground pt-1">
                Actif jusqu'au : <span className="font-medium text-foreground">{format(computeExpiry(), 'dd MMMM yyyy', { locale: fr })}</span>
              </p>
            </div>

            {/* Alert SC insuffisant */}
            {paymentMode === 'sc' && getScCost() > scBalance && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Solde SC insuffisant. Il vous faut <strong>{getScCost()} SC</strong>, vous avez <strong>{scBalance} SC</strong>.
                </AlertDescription>
              </Alert>
            )}

            {/* Note pour paiement manuel */}
            {paymentMode === 'manual' && (
              <div className="space-y-2">
                <Label htmlFor="manual-note">Référence / preuve de paiement (optionnel)</Label>
                <Textarea
                  id="manual-note"
                  placeholder="Ex: Reçu Wave N°123456, virement du 04/04/2026..."
                  value={manualNote}
                  onChange={e => setManualNote(e.target.value)}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  Un administrateur validera votre demande après vérification du paiement.
                </p>
              </div>
            )}
          </div>

          <DialogFoot>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={paying}>Annuler</Button>
            {paymentMode === 'sc' ? (
              <Button
                onClick={handlePayWithSC}
                disabled={paying || !selectedPlanId || getScCost() <= 0 || getScCost() > scBalance}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {paying && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Coins className="h-4 w-4 mr-2" />
                Payer {getScCost()} SC
              </Button>
            ) : (
              <Button onClick={handleManualRequest} disabled={paying || !selectedPlanId}>
                {paying && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Clock className="h-4 w-4 mr-2" />
                Envoyer la demande
              </Button>
            )}
          </DialogFoot>
        </DialogContent>
      </Dialog>
    </div>
  );
};
