import React, { useState } from 'react';
import { CreditCard, Loader2, Check, X, Coins, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
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
import { calculateRemainingDays } from '@/utils/paymentCalculations';

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
  const [scAmount, setScAmount] = useState<number>(0);
  const [sbAmount, setSbAmount] = useState<number>(0);

  const { subscription } = useUserSubscription(formationId);
  const { pricingOptions } = useFormationPricing(formationId);

  const activePlan = pricingOptions?.find(p => p.plan_type === (subscription?.plan_type || 'standard') && p.is_active) || pricingOptions?.[0];
  const activePlanName = activePlan?.plan_type || 'standard';
  
  // 1 SC = scToCfaRate FCFA. Donc FCFA / scToCfaRate = montant en SC
  const hasScRate = scToCfaRate > 0;
  const scRate = hasScRate ? scToCfaRate : 0;
  const priceMonthlySC = activePlan && hasScRate ? Math.ceil((activePlan.price_monthly || 0) / scRate) : 0;
  const priceYearlySC = activePlan && hasScRate ? Math.ceil((activePlan.price_yearly || 0) / scRate) : 0;

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

  // Calcul des jours et heures : montant journalier = frais mensuels / 30
  const calculateDaysAndHours = (amountFCFA: number) => {
    const monthlyFee = activePlan?.price_monthly || 0;
    const dailyRate = monthlyFee > 0 ? monthlyFee / 30 : 0;
    if (dailyRate <= 0) return { days: 0, hours: 0 };
    const totalDays = amountFCFA / dailyRate;
    const wholeDays = Math.floor(totalDays);
    const fractionalDay = totalDays - wholeDays;
    const hours = Math.round(fractionalDay * 24);
    return { days: wholeDays, hours };
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
      const newBalance = balance - amount;
      const walletDebit = currency === 'soumboulah_cash'
        ? { soumboulah_cash: newBalance, updated_at: new Date().toISOString() }
        : { soumboulah_bonus: newBalance, updated_at: new Date().toISOString() };

      // Convertir le montant SC/SB en FCFA pour calculer les jours
      const amountFCFA = amount * scRate;
      const { days, hours } = calculateDaysAndHours(amountFCFA);

      // 1. Débiter le wallet
      const { error: walletError } = await supabase
        .from('user_wallets')
        .update(walletDebit)
        .eq('user_id', user.id);

      if (walletError) {
        console.error('Erreur débit wallet:', walletError);
        toast.error('Erreur lors du débit du portefeuille');
        return;
      }

      // 2. Enregistrer la transaction wallet
      await supabase
        .from('wallet_transactions')
        .insert({
          user_id: user.id,
          currency,
          amount: -amount,
          transaction_type: 'formation_payment',
          description: `Paiement formation (${amount} ${label})`,
          reference_id: formationId,
          reference_type: 'formation',
        });

      // 3. Créer le paiement dans student_payment — STATUS PROCESSED immédiatement
      const today = new Date().toISOString().split('T')[0];
      const { error: paymentError } = await supabase
        .from('student_payment')
        .insert({
          user_id: user.id,
          formation_id: formationId,
          amount,
          payment_method: currency,
          is_request: false, // Pas une demande, c'est un paiement direct
          status: 'processed',
          payment_date: today,
          days_added: days,
          hours_added: hours,
          requested_at: new Date().toISOString(),
          created_by: user.id,
          comment: `Paiement automatique via ${label}: ${amount} (≈ ${amountFCFA.toLocaleString()} FCFA)`,
        });

      if (paymentError) {
        console.error('Erreur création paiement:', paymentError);
        // Rembourser le wallet en cas d'erreur
        const walletRefund = currency === 'soumboulah_cash'
          ? { soumboulah_cash: balance }
          : { soumboulah_bonus: balance };
        await supabase
          .from('user_wallets')
          .update(walletRefund)
          .eq('user_id', user.id);
        toast.error("Erreur lors de la création du paiement");
        return;
      }

      // 4. Mettre à jour student_payment_progress immédiatement
      const { data: existingProgress } = await supabase
        .from('student_payment_progress')
        .select('total_days_remaining, hours_remaining')
        .eq('user_id', user.id)
        .eq('formation_id', formationId)
        .maybeSingle();

      const currentDays = existingProgress?.total_days_remaining || 0;
      const currentHours = existingProgress?.hours_remaining || 0;
      let newHours = currentHours + hours;
      let newDays = currentDays + days;
      // Convertir les heures excédentaires en jours
      if (newHours >= 24) {
        newDays += Math.floor(newHours / 24);
        newHours = newHours % 24;
      }

      const { error: progressError } = await supabase
        .from('student_payment_progress')
        .upsert({
          user_id: user.id,
          formation_id: formationId,
          total_days_remaining: newDays,
          hours_remaining: newHours,
          last_payment_date: today,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,formation_id' });

      if (progressError) {
        console.error('Erreur mise à jour progress:', progressError);
      }

      // Rafraîchir les données
      await queryClient.invalidateQueries({ queryKey: ['user-wallet'] });
      await queryClient.invalidateQueries({ queryKey: ['wallet-transactions'] });
      await queryClient.invalidateQueries({ queryKey: ['student-payment-progress'] });
      await queryClient.invalidateQueries({ queryKey: ['student-payment-history'] });

      const daysLabel = days > 0 ? `${days} jour${days > 1 ? 's' : ''}` : '';
      const hoursLabel = hours > 0 ? `${hours}h` : '';
      const addedLabel = [daysLabel, hoursLabel].filter(Boolean).join(' et ');
      toast.success(`Abonnement effectué, ${addedLabel} ajouté${days > 1 ? 's' : ''}`);
      setShowConfirmDialog(false);
      if (currency === 'soumboulah_cash') {
        setScAmount(0);
      } else {
        setSbAmount(0);
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

    const baseScQuickAmounts = [priceMonthlySC, priceYearlySC, cashBalance].filter(
      (a, i, arr) => a && a > 0 && a <= cashBalance && arr.indexOf(a) === i
    ).sort((a, b) => a - b);
    const scQuickAmounts = baseScQuickAmounts.length > 0 ? baseScQuickAmounts : [cashBalance].filter(a => a > 0);

    const baseSbQuickAmounts = [priceMonthlySC, priceYearlySC, bonusBalance].filter(
      (a, i, arr) => a && a > 0 && a <= bonusBalance && arr.indexOf(a) === i
    ).sort((a, b) => a - b);
    const sbQuickAmounts = baseSbQuickAmounts.length > 0 ? baseSbQuickAmounts : [bonusBalance].filter(a => a > 0);

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
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-semibold text-center">
              💳 Paiement de la formation
            </AlertDialogTitle>
          </AlertDialogHeader>

          <Tabs defaultValue="mobile_money" className="w-full">
            <TabsList className={`grid w-full ${tabGridClass}`}>
              <TabsTrigger value="mobile_money" className="text-xs sm:text-sm">
                <Smartphone className="h-3 w-3 mr-1" /> Mobile Money
              </TabsTrigger>
              {acceptsSC && (
                <TabsTrigger value="soumboulah_cash" className="text-xs sm:text-sm">
                  <Coins className="h-3 w-3 mr-1" /> S. Cash ({cashBalance})
                </TabsTrigger>
              )}
              {acceptsSB && (
                <TabsTrigger value="soumboulah_bonus" className="text-xs sm:text-sm">
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
                    <p className="text-xs text-emerald-800">Mensuel: {(activePlan?.price_monthly || 0).toLocaleString()} FCFA ≈ <span className="font-bold">{priceMonthlySC.toLocaleString()} S.</span></p>
                    <p className="text-xs text-emerald-800">Annuel: {(activePlan?.price_yearly || 0).toLocaleString()} FCFA ≈ <span className="font-bold">{priceYearlySC.toLocaleString()} S.</span></p>
                    {!hasScRate && <p className="mt-2 text-xs text-amber-700">Taux admin non chargé : conversion affichée à 0.</p>}
                  </div>
                  <p className="text-sm text-emerald-700 mb-1">Votre solde Soumboulah Cash</p>
                  <p className="text-2xl font-bold text-emerald-600">{cashBalance} S.</p>
                </div>

                {cashBalance > 0 ? (
                  <>
                    <p className="text-xs text-center text-emerald-700">
                      Si votre solde est insuffisant, vous pouvez envoyer votre solde actuel pour obtenir les jours correspondants.
                    </p>
                    {scQuickAmounts.length > 0 && (
                      <div className="flex flex-wrap gap-2 justify-center">
                        {scQuickAmounts.map((amt) => (
                          <button
                            key={amt}
                            onClick={() => setScAmount(amt)}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                              scAmount === amt 
                                ? 'bg-emerald-500 text-white border-emerald-500' 
                                : 'bg-white text-emerald-700 border-emerald-300 hover:border-emerald-500'
                            }`}
                          >
                            {amt} S.
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        max={cashBalance}
                        value={scAmount || ''}
                        onChange={(e) => setScAmount(Math.min(Number(e.target.value), cashBalance))}
                        placeholder="Montant personnalisé"
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <span className="text-sm text-gray-500 font-medium">S.</span>
                    </div>

                    <p className="text-xs text-gray-500 text-center">
                      Le montant sera débité et vos jours seront ajoutés immédiatement.
                    </p>

                    <AlertDialogFooter className="flex gap-3">
                      <AlertDialogCancel 
                        className="bg-red-500 hover:bg-red-600 text-white border-0 px-6"
                      >
                        <X className="h-5 w-5" />
                      </AlertDialogCancel>
                      <Button
                        className="bg-emerald-500 hover:bg-emerald-600 text-white px-6"
                        disabled={isSubmitting || scAmount <= 0 || !hasScRate}
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
                    <p className="text-xs text-purple-800">Mensuel: {(activePlan?.price_monthly || 0).toLocaleString()} FCFA ≈ <span className="font-bold">{priceMonthlySC.toLocaleString()} S.</span></p>
                    <p className="text-xs text-purple-800">Annuel: {(activePlan?.price_yearly || 0).toLocaleString()} FCFA ≈ <span className="font-bold">{priceYearlySC.toLocaleString()} S.</span></p>
                    {!hasScRate && <p className="mt-2 text-xs text-amber-700">Taux admin non chargé : conversion affichée à 0.</p>}
                  </div>
                  <p className="text-sm text-purple-700 mb-1">Votre solde Soumboulah Bonus</p>
                  <p className="text-2xl font-bold text-purple-600">{bonusBalance} S.</p>
                </div>

                {bonusBalance > 0 ? (
                  <>
                    <p className="text-xs text-center text-purple-700">
                      Si votre solde est insuffisant, vous pouvez envoyer votre solde actuel pour obtenir les jours correspondants.
                    </p>
                    {sbQuickAmounts.length > 0 && (
                      <div className="flex flex-wrap gap-2 justify-center">
                        {sbQuickAmounts.map((amt) => (
                          <button
                            key={amt}
                            onClick={() => setSbAmount(amt)}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                              sbAmount === amt 
                                ? 'bg-purple-500 text-white border-purple-500' 
                                : 'bg-white text-purple-700 border-purple-300 hover:border-purple-500'
                            }`}
                          >
                            {amt} SB
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        max={bonusBalance}
                        value={sbAmount || ''}
                        onChange={(e) => setSbAmount(Math.min(Number(e.target.value), bonusBalance))}
                        placeholder="Montant personnalisé"
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                      <span className="text-sm text-gray-500 font-medium">SB</span>
                    </div>

                    <p className="text-xs text-gray-500 text-center">
                      Le montant sera débité et vos jours seront ajoutés immédiatement.
                    </p>

                    <AlertDialogFooter className="flex gap-3">
                      <AlertDialogCancel 
                        className="bg-red-500 hover:bg-red-600 text-white border-0 px-6"
                      >
                        <X className="h-5 w-5" />
                      </AlertDialogCancel>
                      <Button
                        className="bg-purple-500 hover:bg-purple-600 text-white px-6"
                        disabled={isSubmitting || sbAmount <= 0}
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