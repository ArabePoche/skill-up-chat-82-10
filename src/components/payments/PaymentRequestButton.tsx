import React, { useState } from 'react';
import { CreditCard, Loader2, Check, X, Coins } from 'lucide-react';
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
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface PaymentRequestButtonProps {
  formationId: string;
  disabled?: boolean;
}

/**
 * Bouton pour demander un paiement manuel OU payer avec Soumboulah Cash
 * - Onglet classique : crée une demande dans student_payment avec is_request=true
 * - Onglet Soumboulah : débite le wallet et crée un paiement auto-validé
 */
const PaymentRequestButton: React.FC<PaymentRequestButtonProps> = ({ 
  formationId, 
  disabled = false 
}) => {
  const { user } = useAuth();
  const { wallet } = useUserWallet();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [scAmount, setScAmount] = useState<number>(0);

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

  // Paiement via Soumboulah Cash
  const handleSoumboulahPayment = async () => {
    if (!user || isSubmitting || scAmount <= 0) return;

    const balance = wallet?.soumboulah_cash || 0;
    if (scAmount > balance) {
      toast.error(`Solde insuffisant. Vous avez ${balance} S. Cash`);
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Débiter le wallet
      const { error: walletError } = await supabase
        .from('user_wallets')
        .update({ 
          soumboulah_cash: balance - scAmount,
          updated_at: new Date().toISOString()
        })
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
          currency: 'soumboulah_cash',
          amount: -scAmount,
          transaction_type: 'formation_payment',
          description: `Paiement formation (${scAmount} S. Cash)`,
          reference_id: formationId,
          reference_type: 'formation',
        });

      // 3. Créer le paiement dans student_payment (status pending pour validation admin)
      const { error: paymentError } = await supabase
        .from('student_payment')
        .insert({
          user_id: user.id,
          formation_id: formationId,
          amount: scAmount,
          payment_method: 'soumboulah_cash',
          is_request: true,
          status: 'pending',
          requested_at: new Date().toISOString(),
          created_by: user.id,
          comment: `Paiement via Soumboulah Cash: ${scAmount} S.`,
        });

      if (paymentError) {
        console.error('Erreur création paiement:', paymentError);
        // Rembourser le wallet en cas d'erreur
        await supabase
          .from('user_wallets')
          .update({ soumboulah_cash: balance })
          .eq('user_id', user.id);
        toast.error("Erreur lors de la création du paiement");
        return;
      }

      // Rafraîchir les données
      queryClient.invalidateQueries({ queryKey: ['user-wallet'] });
      queryClient.invalidateQueries({ queryKey: ['wallet-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['student-payment-progress'] });

      toast.success(`${scAmount} S. Cash débités avec succès ! Votre paiement sera validé par un administrateur.`);
      setShowConfirmDialog(false);
      setScAmount(0);
    } catch (error) {
      console.error('Erreur paiement Soumboulah:', error);
      toast.error("Erreur lors du paiement");
    } finally {
      setIsSubmitting(false);
    }
  };

  const cashBalance = wallet?.soumboulah_cash || 0;
  const quickAmounts = [500, 1000, 2000, 5000, 10000].filter(a => a <= cashBalance);

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

          <Tabs defaultValue="classic" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="classic" className="text-xs sm:text-sm">
                <CreditCard className="h-3 w-3 mr-1" /> Classique
              </TabsTrigger>
              <TabsTrigger value="soumboulah" className="text-xs sm:text-sm">
                <Coins className="h-3 w-3 mr-1" /> S. Cash ({cashBalance})
              </TabsTrigger>
            </TabsList>

            {/* Onglet paiement classique */}
            <TabsContent value="classic" className="mt-4 space-y-4">
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

            {/* Onglet Soumboulah Cash */}
            <TabsContent value="soumboulah" className="mt-4 space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-center">
                <p className="text-sm text-emerald-700 mb-1">Votre solde Soumboulah Cash</p>
                <p className="text-2xl font-bold text-emerald-600">{cashBalance} S.</p>
              </div>

              {cashBalance > 0 ? (
                <>
                  {/* Montants rapides */}
                  {quickAmounts.length > 0 && (
                    <div className="flex flex-wrap gap-2 justify-center">
                      {quickAmounts.map((amt) => (
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

                  {/* Montant personnalisé */}
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
                    Le montant sera débité de votre portefeuille et soumis à validation admin.
                  </p>

                  <AlertDialogFooter className="flex gap-3">
                    <AlertDialogCancel 
                      className="bg-red-500 hover:bg-red-600 text-white border-0 px-6"
                    >
                      <X className="h-5 w-5" />
                    </AlertDialogCancel>
                    <Button
                      className="bg-emerald-500 hover:bg-emerald-600 text-white px-6"
                      disabled={isSubmitting || scAmount <= 0}
                      onClick={handleSoumboulahPayment}
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
          </Tabs>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default PaymentRequestButton;