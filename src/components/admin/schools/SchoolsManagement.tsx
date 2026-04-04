import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSchoolSubscriptions } from '@/hooks/admin/useSchoolSubscriptions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, RefreshCw, Building, CalendarClock, CheckCircle2, XCircle, Clock, Coins, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, addMonths, addYears, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

interface SchoolWithSubscription {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  school_type: string;
  owner_id: string;
  subscription_plan_id: string | null;
  subscription_expires_at: string | null;
  plan_name?: string;
  plan_slug?: string;
}

interface SubscriptionPayment {
  id: string;
  school_id: string;
  plan_id: string;
  payment_method: 'sc' | 'manual';
  status: 'pending' | 'paid' | 'rejected' | 'cancelled';
  amount_xof: number;
  amount_sc: number | null;
  billing_cycle: string;
  duration_months: number;
  expires_at: string | null;
  admin_note: string | null;
  created_at: string;
  school_name?: string;
  plan_name?: string;
  payer_name?: string;
}

export default function SchoolsManagement() {
  const [schools, setSchools] = useState<SchoolWithSubscription[]>([]);
  const [payments, setPayments] = useState<SubscriptionPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPayments, setLoadingPayments] = useState(true);

  // Dialog : changer/renouveler abonnement manuellement
  const [selectedSchool, setSelectedSchool] = useState<SchoolWithSubscription | null>(null);
  const [renewDialogOpen, setRenewDialogOpen] = useState(false);
  const [newPlanId, setNewPlanId] = useState('');
  const [durationMonths, setDurationMonths] = useState(1);
  const [saving, setSaving] = useState(false);

  // Dialog : valider/rejeter paiement manuel
  const [selectedPayment, setSelectedPayment] = useState<SubscriptionPayment | null>(null);
  const [validateDialogOpen, setValidateDialogOpen] = useState(false);
  const [adminNote, setAdminNote] = useState('');
  const [validating, setValidating] = useState(false);

  const { plans } = useSchoolSubscriptions();
  const { toast } = useToast();

  const fetchSchools = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('schools')
        .select('id, name, city, country, school_type, owner_id, subscription_plan_id, subscription_expires_at')
        .order('name', { ascending: true });
      if (error) throw error;
      const enriched = (data || []).map(school => {
        const plan = plans.find(p => p.id === school.subscription_plan_id);
        return { ...school, plan_name: plan?.name ?? '–', plan_slug: plan?.slug ?? 'free' };
      });
      setSchools(enriched);
    } catch (err: any) {
      toast({ title: 'Erreur', description: "Impossible de charger les écoles.", variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const fetchPayments = async () => {
    try {
      setLoadingPayments(true);
      // Fetch pending manual payments enriched
      const { data, error } = await supabase
        .from('school_subscription_payments' as any)
        .select('*')
        .order('created_at', { ascending: false }) as any;
      if (error) throw error;

      // Enrich with school and plan names
      const enriched: SubscriptionPayment[] = (data || []).map((p: any) => {
        const school = schools.find(s => s.id === p.school_id);
        const plan = plans.find(pl => pl.id === p.plan_id);
        return { ...p, school_name: school?.name ?? p.school_id, plan_name: plan?.name ?? '–' };
      });
      setPayments(enriched);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingPayments(false);
    }
  };

  useEffect(() => {
    if (plans.length > 0) fetchSchools();
  }, [plans]);

  useEffect(() => {
    if (schools.length > 0) fetchPayments();
  }, [schools]);

  // ─── Renouvellement manuel par l'admin ───────────────────────────────────────
  const openRenewDialog = (school: SchoolWithSubscription) => {
    setSelectedSchool(school);
    setNewPlanId(school.subscription_plan_id || plans[0]?.id || '');
    setDurationMonths(1);
    setRenewDialogOpen(true);
  };

  const computeNewExpiry = (): string => {
    const base = selectedSchool?.subscription_expires_at
      ? parseISO(selectedSchool.subscription_expires_at)
      : new Date();
    const isExpired = base < new Date();
    const from = isExpired ? new Date() : base;
    return addMonths(from, durationMonths).toISOString();
  };

  const handleAdminRenew = async () => {
    if (!selectedSchool || !newPlanId) return;
    setSaving(true);
    try {
      const newExpiry = computeNewExpiry();
      const { error } = await supabase.from('schools').update({
        subscription_plan_id: newPlanId,
        subscription_expires_at: newExpiry,
      }).eq('id', selectedSchool.id);
      if (error) throw error;

      // Log a manual payment record (admin override)
      await supabase.from('school_subscription_payments' as any).insert({
        school_id: selectedSchool.id,
        plan_id: newPlanId,
        payer_user_id: (await supabase.auth.getUser()).data.user?.id,
        payment_method: 'manual',
        status: 'paid',
        amount_xof: 0,
        billing_cycle: durationMonths > 1 ? 'yearly' : 'monthly',
        duration_months: durationMonths,
        activated_at: new Date().toISOString(),
        expires_at: newExpiry,
        admin_note: 'Activation manuelle par admin plateforme',
      });

      toast({ title: 'Succès', description: 'Abonnement mis à jour.' });
      setRenewDialogOpen(false);
      await fetchSchools();
    } catch (err: any) {
      toast({ title: 'Erreur', description: "Impossible de mettre à jour.", variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // ─── Validation paiement manuel ──────────────────────────────────────────────
  const openValidate = (payment: SubscriptionPayment) => {
    setSelectedPayment(payment);
    setAdminNote(payment.admin_note || '');
    setValidateDialogOpen(true);
  };

  const handleValidate = async (approve: boolean) => {
    if (!selectedPayment) return;
    setValidating(true);
    try {
      const updates: any = {
        status: approve ? 'paid' : 'rejected',
        admin_note: adminNote || null,
        validated_by: (await supabase.auth.getUser()).data.user?.id,
      };
      if (approve) {
        updates.activated_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('school_subscription_payments' as any)
        .update(updates)
        .eq('id', selectedPayment.id);
      if (error) throw error;

      // Si approuvé → activer l'abonnement sur l'école
      if (approve && selectedPayment.expires_at) {
        const { error: schoolError } = await supabase.from('schools').update({
          subscription_plan_id: selectedPayment.plan_id,
          subscription_expires_at: selectedPayment.expires_at,
        }).eq('id', selectedPayment.school_id);
        if (schoolError) throw schoolError;
      }

      toast({ title: approve ? '✅ Paiement validé' : '❌ Paiement rejeté', description: approve ? "L'abonnement de l'école a été activé." : "La demande a été rejetée." });
      setValidateDialogOpen(false);
      await fetchPayments();
      await fetchSchools();
    } catch (err: any) {
      toast({ title: 'Erreur', description: "Impossible de traiter la demande.", variant: 'destructive' });
    } finally {
      setValidating(false);
    }
  };

  const getPlanColor = (slug?: string) => {
    if (slug === 'premium') return 'bg-purple-100 text-purple-800 border-purple-200';
    if (slug === 'standard') return 'bg-blue-100 text-blue-800 border-blue-200';
    return 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const isExpired = (expiresAt: string | null) => expiresAt ? new Date(expiresAt) < new Date() : false;

  const pendingPayments = payments.filter(p => p.status === 'pending' && p.payment_method === 'manual');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Gestion des Écoles</h2>
          <p className="text-muted-foreground mt-1">{schools.length} école{schools.length > 1 ? 's' : ''}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { fetchSchools(); fetchPayments(); }}>
          <RefreshCw className="h-4 w-4 mr-2" />Actualiser
        </Button>
      </div>

      <Tabs defaultValue="schools">
        <TabsList>
          <TabsTrigger value="schools">
            <Building className="h-4 w-4 mr-2" />
            Écoles
          </TabsTrigger>
          <TabsTrigger value="payments" className="relative">
            <Clock className="h-4 w-4 mr-2" />
            Paiements
            {pendingPayments.length > 0 && (
              <span className="ml-2 bg-destructive text-destructive-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {pendingPayments.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Tab : liste des écoles ── */}
        <TabsContent value="schools" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Building className="h-5 w-5" />Abonnements par École</CardTitle>
              <CardDescription>Gérez et renouvelez les abonnements de chaque école.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {loading ? (
                <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>École</TableHead>
                      <TableHead>Localisation</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Expiration</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schools.map(school => (
                      <TableRow key={school.id}>
                        <TableCell className="font-medium">{school.name}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {[school.city, school.country].filter(Boolean).join(', ') || '–'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {school.school_type === 'virtual' ? 'Virtuelle' : school.school_type === 'physical' ? 'Physique' : 'Les deux'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPlanColor(school.plan_slug)}`}>
                            {school.plan_name}
                          </span>
                        </TableCell>
                        <TableCell>
                          {school.subscription_expires_at ? (
                            <span className={`text-sm flex items-center gap-1.5 ${isExpired(school.subscription_expires_at) ? 'text-destructive' : 'text-muted-foreground'}`}>
                              <CalendarClock className="h-3.5 w-3.5" />
                              {format(parseISO(school.subscription_expires_at), 'dd MMM yyyy', { locale: fr })}
                              {isExpired(school.subscription_expires_at) && <Badge variant="destructive" className="text-[10px] py-0">Expiré</Badge>}
                            </span>
                          ) : '–'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" onClick={() => openRenewDialog(school)}>
                            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />Gérer
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {schools.length === 0 && (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-10">Aucune école.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab : paiements ── */}
        <TabsContent value="payments" className="mt-4 space-y-4">

          {/* Paiements en attente */}
          {pendingPayments.length > 0 && (
            <Card className="border-amber-200 bg-amber-50/50">
              <CardHeader>
                <CardTitle className="text-amber-800 flex items-center gap-2 text-base">
                  <Clock className="h-5 w-5" />
                  Paiements manuels en attente ({pendingPayments.length})
                </CardTitle>
                <CardDescription>Ces écoles ont déclaré un paiement externe. Validez après vérification.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {pendingPayments.map(p => {
                    const school = schools.find(s => s.id === p.school_id);
                    return (
                      <div key={p.id} className="flex items-center justify-between bg-white rounded-lg border p-3 gap-3 flex-wrap">
                        <div className="space-y-0.5">
                          <div className="font-semibold">{school?.name ?? p.school_id}</div>
                          <div className="text-sm text-muted-foreground">
                            Plan <strong>{p.plan_name}</strong> · {p.billing_cycle === 'yearly' ? 'Annuel' : 'Mensuel'} · {p.amount_xof.toLocaleString()} XOF
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Demandé le {format(new Date(p.created_at), 'dd MMM yyyy HH:mm', { locale: fr })}
                          </div>
                          {p.admin_note && (
                            <div className="text-xs italic bg-muted rounded px-2 py-1 mt-1">
                              <ExternalLink className="h-3 w-3 inline mr-1" />
                              {p.admin_note}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="destructive" onClick={() => openValidate(p)}>
                            <XCircle className="h-3.5 w-3.5 mr-1" />Traiter
                          </Button>
                          <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => {
                            setSelectedPayment(p);
                            setAdminNote('');
                            setValidateDialogOpen(true);
                          }}>
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />Valider
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Historique complet */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Historique de tous les paiements</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {loadingPayments ? (
                <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>École</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Méthode</TableHead>
                      <TableHead>Montant</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map(p => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.school_name}</TableCell>
                        <TableCell>{p.plan_name}</TableCell>
                        <TableCell>
                          {p.payment_method === 'sc' ? (
                            <span className="flex items-center gap-1 text-emerald-700 text-sm"><Coins className="h-3.5 w-3.5" />SC</span>
                          ) : (
                            <span className="flex items-center gap-1 text-blue-700 text-sm"><ExternalLink className="h-3.5 w-3.5" />Manuel</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {p.amount_xof.toLocaleString()} XOF
                          {p.amount_sc && <span className="text-muted-foreground ml-1">({p.amount_sc} SC)</span>}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(p.created_at), 'dd MMM yyyy', { locale: fr })}
                        </TableCell>
                        <TableCell>
                          {p.status === 'paid' && <Badge className="bg-green-100 text-green-800 border-green-200">Payé</Badge>}
                          {p.status === 'pending' && <Badge variant="secondary">En attente</Badge>}
                          {p.status === 'rejected' && <Badge variant="destructive">Rejeté</Badge>}
                          {p.status === 'cancelled' && <Badge variant="outline">Annulé</Badge>}
                        </TableCell>
                      </TableRow>
                    ))}
                    {payments.length === 0 && (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Aucun paiement enregistré.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog : Gérer abonnement (admin override) */}
      <Dialog open={renewDialogOpen} onOpenChange={setRenewDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Gérer l'abonnement</DialogTitle>
            <DialogDescription><span className="font-medium">{selectedSchool?.name}</span></DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Plan d'abonnement</Label>
              <Select value={newPlanId} onValueChange={setNewPlanId}>
                <SelectTrigger><SelectValue placeholder="Choisir un plan" /></SelectTrigger>
                <SelectContent>
                  {plans.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} — {p.price_monthly.toLocaleString()} {p.currency}/mois
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">Durée à accorder (mois)</Label>
              <Input id="duration" type="number" min={1} max={60} value={durationMonths}
                onChange={e => setDurationMonths(Number(e.target.value))} />
              <p className="text-xs text-muted-foreground">
                Nouvelle expiration : <span className="font-medium text-foreground">
                  {selectedSchool ? format(new Date(computeNewExpiry()), 'dd MMMM yyyy', { locale: fr }) : '–'}
                </span>
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenewDialogOpen(false)} disabled={saving}>Annuler</Button>
            <Button onClick={handleAdminRenew} disabled={saving || !newPlanId}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog : Valider/Rejeter paiement manuel */}
      <Dialog open={validateDialogOpen} onOpenChange={setValidateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Validation du paiement</DialogTitle>
            <DialogDescription>
              {selectedPayment?.school_name} — Plan {selectedPayment?.plan_name} · {selectedPayment?.amount_xof.toLocaleString()} XOF
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {selectedPayment?.admin_note && (
              <div className="bg-muted rounded-lg p-3 text-sm">
                <p className="font-medium mb-1 text-xs uppercase text-muted-foreground">Référence fournie par l'école :</p>
                <p>{selectedPayment.admin_note}</p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="admin-note">Note admin (optionnel)</Label>
              <Textarea id="admin-note" placeholder="Commentaire sur la validation ou le rejet..."
                value={adminNote} onChange={e => setAdminNote(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setValidateDialogOpen(false)} disabled={validating}>Fermer</Button>
            <Button variant="destructive" onClick={() => handleValidate(false)} disabled={validating}>
              {validating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <XCircle className="h-4 w-4 mr-2" />Rejeter
            </Button>
            <Button className="bg-green-600 hover:bg-green-700" onClick={() => handleValidate(true)} disabled={validating}>
              {validating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <CheckCircle2 className="h-4 w-4 mr-2" />Valider & Activer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
