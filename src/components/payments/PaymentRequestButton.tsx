import React, { useState } from 'react';
import { CreditCard, Loader2, Check, X, Coins, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserWallet } from '@/hooks/useUserWallet';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useUserSubscription } from '@/hooks/useUserSubscription';
import { useFormationPricing } from '@/hooks/useFormationPricing';

interface PaymentRequestButtonProps {
  formationId: string;
  disabled?: boolean;
}

/**
 * Bouton pour payer une formation :
 * - Onglet Mobile Money : demande classique (admin valide manuellement)
 * - Onglet S. Cash (SC) : débite le portefeuille soumboulah_cash (si la formation l'accepte)
 * - Onglet S. Bonus (SB) : débite le portefeuille soumboulah_bonus (si la formation l'accepte)
 */
const PaymentRequestButton: React.FC<PaymentRequestButtonProps> = ({ 
  formationId, 
  disabled = false 
}) => {
  const { user } = useAuth();
  const { wallet, scToCfaRate } = useUserWallet();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [scWeeks, setScWeeks] = useState(0);
  const [scMonths, setScMonths] = useState(0);
  const [sbWeeks, setSbWeeks] = useState(0);
  const [sbMonths, setSbMonths] = useState(0);

  const { subscription } = useUserSubscription(formationId);
  const { pricingOptions } = useFormationPricing(formationId);

  const activePlan = pricingOptions?.find(p => p.plan_type === (subscription?.plan_type || 'standard') && p.is_active) || pricingOptions?.[0];
  const activePlanName = activePlan?.plan_type || 'standard';
  
  // 1 SC = scToCfaRate FCFA. Donc FCFA / scToCfaRate = montant en SC
  const hasScRate = scToCfaRate > 0;
  const scRate = hasScRate ? scToCfaRate : 0;
  const weeklyPriceFcfa = activePlan && (activePlan.price_monthly || 0) > 0
    ? Math.ceil(((activePlan.price_monthly || 0) * 7) / 30)
    : 0;
  const priceWeeklySC = weeklyPriceFcfa > 0 && hasScRate ? Math.ceil(weeklyPriceFcfa / scRate) : 0;
  const priceMonthlySC = activePlan && hasScRate ? Math.ceil((activePlan.price_monthly || 0) / scRate) : 0;
  const priceYearlySC = activePlan && hasScRate ? Math.ceil((activePlan.price_yearly || 0) / scRate) : 0;
  const scAmount = (scWeeks * priceWeeklySC) + (scMonths * priceMonthlySC);
  const sbAmount = (sbWeeks * priceWeeklySC) + (sbMonths * priceMonthlySC);

  // Récupérer les méthodes de paiement acceptées par cette formation
  const { data: formation } = useQuery({
    queryKey: ['formation-payment-methods', formationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('formations')
        .select('accepted_payment_methods')
        .eq('id', formationId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!formationId,
    staleTime: 5 * 60 * 1000,
  });

  const acceptedMethods: string[] = formation?.accepted_payment_methods || [];
  const acceptsSC = acceptedMethods.includes('soumboulah_cash');
  const acceptsSB = acceptedMethods.includes('soumboulah_bonus');

  // Demande de paiement classique (Mobile Money, etc.)
  const handlePaymentRequest = async () => {
    if (!user || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const { data: existingRequest } = await supabase
        .from('student_payment')
        .select('id, status')
        .eq('user_id', user.id)
        .eq('formation_id', formationId)
        .eq('is_request', true)
        .eq('status', 'pending')
        .maybeSingle();

      if (existingRequest) {
        toast.info('Vous avez déjà une demande de paiement en attente.');
        return;
      }

      const { error: insertError } = await supabase
        .from('student_payment')
        .insert({
          user_id: user.id,
          formation_id: formationId,
          is_request: true,
          status: 'pending',
          requested_at: new Date().toISOString(),
          created_by: user.id,
        });

      if (insertError) {
        const message = (insertError as any)?.code === '23505'
          ? 'Une demande est déjà en attente pour cette formation.'
          : "Erreur lors de l'envoi de la demande";
        toast.error(message);
        return;
      }

      toast.success('Demande de paiement envoyée avec succès !');
      setShowConfirmDialog(false);
    } catch (error) {
      console.error('Erreur lors de la demande de paiement:', error);
      toast.error("Erreur lors de l'envoi de la demande");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Paiement via portefeuille (SC ou SB) — prise en compte immédiate
  const handleWalletPayment = async (
    currency: 'soumboulah_cash' | 'soumboulah_bonus',
    amount: number,
    label: string
  ) => {
    if (!user || isSubmitting || amount <= 0) return;

    const balance = currency === 'soumboulah_cash'
      ? (wallet?.soumboulah_cash || 0)
      : (wallet?.soumboulah_bonus || 0);

    if (amount > balance) {
      toast.error(`Solde insuffisant. Vous avez ${balance} ${label}`);
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('pay-formation-with-wallet', {
        body: {
          formationId,
          currency,
          amount,
        },
      });

      if (error) {
        console.error('Erreur paiement portefeuille:', error);
        toast.error(error.message || 'Erreur lors du paiement');
        return;
      }

      const result = data as {
        success?: boolean;
        message?: string;
        days_added?: number;
        hours_added?: number;
        diagnostics?: {
          stage?: string;
          details?: string;
        };
      } | null;

      if (!result?.success) {
        console.error('Paiement portefeuille refusé:', result);
        toast.error(result?.message || 'Erreur lors du paiement');
        return;
      }

      // Rafraîchir les données immédiatement après le traitement backend
      await queryClient.invalidateQueries({ queryKey: ['user-wallet'] });
      await queryClient.invalidateQueries({ queryKey: ['wallet-transactions'] });
      await queryClient.invalidateQueries({ queryKey: ['student-payment-progress'] });
      await queryClient.invalidateQueries({ queryKey: ['student-payment-history'] });
      await queryClient.refetchQueries({ queryKey: ['student-payment-progress'] });
      await queryClient.refetchQueries({ queryKey: ['student-payment-history'] });

      const days = result?.days_added || 0;
      const hours = result?.hours_added || 0;
      const daysLabel = days > 0 ? `${days} jour${days > 1 ? 's' : ''}` : '';
      const hoursLabel = hours > 0 ? `${hours}h` : '';
      const addedLabel = [daysLabel, hoursLabel].filter(Boolean).join(' et ');
      toast.success(`Abonnement effectué, ${addedLabel} ajouté${days > 1 ? 's' : ''}`);
      setShowConfirmDialog(false);
      if (currency === 'soumboulah_cash') {
        setScWeeks(0);
        setScMonths(0);
      } else {
        setSbWeeks(0);
        setSbMonths(0);
      }
    } catch (error) {
      console.error('Erreur paiement portefeuille:', error);
      toast.error("Erreur lors du paiement");
    } finally {
      setIsSubmitting(false);
    }
  };

  const cashBalance = wallet?.soumboulah_cash || 0;
  const bonusBalance = wallet?.soumboulah_bonus || 0;

  const canUsePackages = hasScRate && priceWeeklySC > 0 && priceMonthlySC > 0;

  const updatePackageCount = (
    currentValue: number,
    pricePerUnit: number,
    balance: number,
    setValue: React.Dispatch<React.SetStateAction<number>>,
    delta: number,
    pairedUnits: number,
    pairedUnitPrice: number
  ) => {
    const nextValue = Math.max(0, currentValue + delta);
    const totalAmount = (nextValue * pricePerUnit) + (pairedUnits * pairedUnitPrice);

    if (delta > 0 && totalAmount > balance) {
      return;
    }

    setValue(nextValue);
  };

  const renderPackageSelector = (
    tone: 'emerald' | 'purple',
    balance: number,
    weeks: number,
    months: number,
    setWeeks: React.Dispatch<React.SetStateAction<number>>,
    setMonths: React.Dispatch<React.SetStateAction<number>>,
    amount: number,
    currencyLabel: string
  ) => (
    <>
      <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
        <p className={`text-sm font-medium ${tone === 'emerald' ? 'text-emerald-800' : 'text-purple-800'}`}>
          Choisissez vos forfaits
        </p>

        <div className="grid gap-3">
          <div className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-3">
            <div>
              <p className="text-sm font-semibold text-gray-900">Forfait 1 semaine</p>
              <p className="text-xs text-gray-500">7 jours pour {priceWeeklySC.toLocaleString()} {currencyLabel}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => updatePackageCount(weeks, priceWeeklySC, balance, setWeeks, -1, months, priceMonthlySC)}
              >
                -
              </Button>
              <span className="w-8 text-center text-sm font-semibold">{weeks}</span>
              <Button
                type="button"
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => updatePackageCount(weeks, priceWeeklySC, balance, setWeeks, 1, months, priceMonthlySC)}
              >
                +
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-3">
            <div>
              <p className="text-sm font-semibold text-gray-900">Forfait 1 mois</p>
              <p className="text-xs text-gray-500">30 jours pour {priceMonthlySC.toLocaleString()} {currencyLabel}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => updatePackageCount(months, priceMonthlySC, balance, setMonths, -1, weeks, priceWeeklySC)}
              >
                -
              </Button>
              <span className="w-8 text-center text-sm font-semibold">{months}</span>
              <Button
                type="button"
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => updatePackageCount(months, priceMonthlySC, balance, setMonths, 1, weeks, priceWeeklySC)}
              >
                +
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm">
        <p className="font-medium text-slate-900">Résumé</p>
        <p className="text-slate-600">{weeks} semaine(s) + {months} mois</p>
        <p className="text-slate-700">Total à payer: <span className="font-bold">{amount.toLocaleString()} {currencyLabel}</span></p>
      </div>

      <p className="text-xs text-gray-500 text-center">
        Les forfaits peuvent être cumulés. Le montant total sera débité et la durée ajoutée immédiatement.
      </p>
    </>
  );

  // Calcul du nombre d'onglets pour le grid
  const tabCount = 1 + (acceptsSC ? 1 : 0) + (acceptsSB ? 1 : 0);
  const tabGridClass = tabCount === 3 ? 'grid-cols-3' : tabCount === 2 ? 'grid-cols-2' : 'grid-cols-1';

  return (
    <>
      <Button
        onClick={() => setShowConfirmDialog(true)}
        disabled={disabled || isSubmitting}
        variant="outline"
        className="flex items-center space-x-2 w-full sm:w-auto"
      >
        {isSubmitting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <CreditCard className="h-4 w-4" />
        )}
        <span>
          {isSubmitting ? 'Envoi...' : 'Demander un paiement'}
        </span>
      </Button>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] sm:max-w-md max-h-[90dvh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-semibold text-center">
              💳 Paiement de la formation
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-sm text-muted-foreground">
              Choisissez votre méthode de paiement pour créditer immédiatement votre abonnement ou envoyer une demande manuelle.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <Tabs defaultValue="mobile_money" className="w-full">
            <TabsList className={`grid w-full ${tabGridClass} h-auto gap-1`}>
              <TabsTrigger value="mobile_money" className="px-2 py-2 text-[11px] leading-tight whitespace-normal sm:text-sm">
                <Smartphone className="h-3 w-3 mr-1" /> Mobile Money
              </TabsTrigger>
              {acceptsSC && (
                <TabsTrigger value="soumboulah_cash" className="px-2 py-2 text-[11px] leading-tight whitespace-normal sm:text-sm">
                  <Coins className="h-3 w-3 mr-1" /> S. Cash ({cashBalance})
                </TabsTrigger>
              )}
              {acceptsSB && (
                <TabsTrigger value="soumboulah_bonus" className="px-2 py-2 text-[11px] leading-tight whitespace-normal sm:text-sm">
                  <Coins className="h-3 w-3 mr-1" /> S. Bonus ({bonusBalance})
                </TabsTrigger>
              )}
            </TabsList>

            {/* Onglet paiement Mobile Money */}
            <TabsContent value="mobile_money" className="mt-4 space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="font-medium text-blue-900 mb-2">
                  Méthodes de paiement acceptées :
                </p>
                <ul className="text-blue-800 space-y-1 text-sm">
                  <li>• Mobile Money</li>
                  <li>• Western Union</li>
                  <li>• Virement bancaire</li>
                  <li>• Espèces</li>
                </ul>
              </div>
              
              <div className="text-gray-700 space-y-2 text-sm">
                <p>Un administrateur examinera votre demande et validera votre transaction.</p>
                <p className="font-medium text-gray-900">
                  Une fois validé, le crédit apparaîtra dans vos jours restants.
                </p>
              </div>

              <AlertDialogFooter className="flex gap-3">
                <AlertDialogCancel 
                  className="bg-red-500 hover:bg-red-600 text-white border-0 px-6"
                >
                  <X className="h-5 w-5" />
                </AlertDialogCancel>
                <Button
                  className="bg-green-500 hover:bg-green-600 text-white px-6"
                  disabled={isSubmitting}
                  onClick={handlePaymentRequest}
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-5 w-5" />}
                </Button>
              </AlertDialogFooter>
            </TabsContent>

            {/* Onglet Soumboulah Cash (SC) */}
            {acceptsSC && (
              <TabsContent value="soumboulah_cash" className="mt-4 space-y-4">
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-center">
                  <div className="mb-3 pb-3 border-b border-emerald-200/60">
                    <p className="text-sm font-semibold text-emerald-900 mb-2">Tarifs d'abonnement ({activePlanName})</p>
                    <p className="text-xs text-emerald-800">Hebdomadaire: {weeklyPriceFcfa.toLocaleString()} FCFA ≈ <span className="font-bold">{priceWeeklySC.toLocaleString()} S.</span></p>
                    <p className="text-xs text-emerald-800">Mensuel: {(activePlan?.price_monthly || 0).toLocaleString()} FCFA ≈ <span className="font-bold">{priceMonthlySC.toLocaleString()} S.</span></p>
                    <p className="text-xs text-emerald-800">Annuel: {(activePlan?.price_yearly || 0).toLocaleString()} FCFA ≈ <span className="font-bold">{priceYearlySC.toLocaleString()} S.</span></p>
                    {!hasScRate && <p className="mt-2 text-xs text-amber-700">Taux admin non chargé : conversion affichée à 0.</p>}
                  </div>
                  <p className="text-sm text-emerald-700 mb-1">Votre solde Soumboulah Cash</p>
                  <p className="text-2xl font-bold text-emerald-600">{cashBalance} S.</p>
                </div>

                {cashBalance > 0 ? (
                  <>
                    {canUsePackages ? renderPackageSelector(
                      'emerald',
                      cashBalance,
                      scWeeks,
                      scMonths,
                      setScWeeks,
                      setScMonths,
                      scAmount,
                      'S.'
                    ) : (
                      <p className="text-xs text-center text-amber-700">
                        Les forfaits ne sont pas encore disponibles car le tarif mensuel ou le taux de conversion n'est pas chargé.
                      </p>
                    )}

                    <AlertDialogFooter className="flex gap-3">
                      <AlertDialogCancel 
                        className="bg-red-500 hover:bg-red-600 text-white border-0 px-6"
                      >
                        <X className="h-5 w-5" />
                      </AlertDialogCancel>
                      <Button
                        className="bg-emerald-500 hover:bg-emerald-600 text-white px-6"
                        disabled={isSubmitting || scAmount <= 0 || !canUsePackages}
                        onClick={() => handleWalletPayment('soumboulah_cash', scAmount, 'S. Cash')}
                      >
                        {isSubmitting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Coins className="h-4 w-4 mr-1" />
                            Payer {scAmount > 0 ? `${scAmount} S.` : ''}
                          </>
                        )}
                      </Button>
                    </AlertDialogFooter>
                  </>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-500">Vous n'avez pas de Soumboulah Cash.</p>
                    <p className="text-xs text-gray-400 mt-1">Gagnez des Habbah et convertissez-les en Soumboulah !</p>
                  </div>
                )}
              </TabsContent>
            )}

            {/* Onglet Soumboulah Bonus (SB) */}
            {acceptsSB && (
              <TabsContent value="soumboulah_bonus" className="mt-4 space-y-4">
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
                  <div className="mb-3 pb-3 border-b border-purple-200/60">
                    <p className="text-sm font-semibold text-purple-900 mb-2">Tarifs d'abonnement ({activePlanName})</p>
                    <p className="text-xs text-purple-800">Hebdomadaire: {weeklyPriceFcfa.toLocaleString()} FCFA ≈ <span className="font-bold">{priceWeeklySC.toLocaleString()} S.</span></p>
                    <p className="text-xs text-purple-800">Mensuel: {(activePlan?.price_monthly || 0).toLocaleString()} FCFA ≈ <span className="font-bold">{priceMonthlySC.toLocaleString()} S.</span></p>
                    <p className="text-xs text-purple-800">Annuel: {(activePlan?.price_yearly || 0).toLocaleString()} FCFA ≈ <span className="font-bold">{priceYearlySC.toLocaleString()} S.</span></p>
                    {!hasScRate && <p className="mt-2 text-xs text-amber-700">Taux admin non chargé : conversion affichée à 0.</p>}
                  </div>
                  <p className="text-sm text-purple-700 mb-1">Votre solde Soumboulah Bonus</p>
                  <p className="text-2xl font-bold text-purple-600">{bonusBalance} S.</p>
                </div>

                {bonusBalance > 0 ? (
                  <>
                    {canUsePackages ? renderPackageSelector(
                      'purple',
                      bonusBalance,
                      sbWeeks,
                      sbMonths,
                      setSbWeeks,
                      setSbMonths,
                      sbAmount,
                      'SB'
                    ) : (
                      <p className="text-xs text-center text-amber-700">
                        Les forfaits ne sont pas encore disponibles car le tarif mensuel ou le taux de conversion n'est pas chargé.
                      </p>
                    )}

                    <AlertDialogFooter className="flex gap-3">
                      <AlertDialogCancel 
                        className="bg-red-500 hover:bg-red-600 text-white border-0 px-6"
                      >
                        <X className="h-5 w-5" />
                      </AlertDialogCancel>
                      <Button
                        className="bg-purple-500 hover:bg-purple-600 text-white px-6"
                        disabled={isSubmitting || sbAmount <= 0 || !canUsePackages}
                        onClick={() => handleWalletPayment('soumboulah_bonus', sbAmount, 'SB')}
                      >
                        {isSubmitting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Coins className="h-4 w-4 mr-1" />
                            Payer {sbAmount > 0 ? `${sbAmount} SB` : ''}
                          </>
                        )}
                      </Button>
                    </AlertDialogFooter>
                  </>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-500">Vous n'avez pas de Soumboulah Bonus.</p>
                    <p className="text-xs text-gray-400 mt-1">Gagnez des Habbah et convertissez-les en Soumboulah Bonus !</p>
                  </div>
                )}
              </TabsContent>
            )}
          </Tabs>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default PaymentRequestButton;