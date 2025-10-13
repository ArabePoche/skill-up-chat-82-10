import React, { useState } from 'react';
import { CreditCard, Loader2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface PaymentRequestButtonProps {
  formationId: string;
  disabled?: boolean;
}

/**
 * Bouton pour demander un paiement manuel
 * Crée une demande dans student_payment avec is_request=true
 */
const PaymentRequestButton: React.FC<PaymentRequestButtonProps> = ({ 
  formationId, 
  disabled = false 
}) => {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const handlePaymentRequest = async () => {
    if (!user || isSubmitting) return;

    setIsSubmitting(true);
    try {
      // Vérifier s'il existe déjà une demande en attente pour cette formation
      const { data: existingRequest, error: checkError } = await supabase
        .from('student_payment')
        .select('id, status, requested_at')
        .eq('user_id', user.id)
        .eq('formation_id', formationId)
        .eq('is_request', true)
        .order('requested_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (checkError) {
        console.error('Erreur lors de la vérification de la demande existante:', checkError);
      }

      if (existingRequest && existingRequest.status === 'pending') {
        toast.info('Vous avez déjà une demande de paiement en attente.');
        return;
      }

      // Créer une nouvelle demande de paiement
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
        // Gérer un éventuel doublon (contrainte unique côté DB)
        const message = (insertError as any)?.code === '23505'
          ? 'Une demande est déjà en attente pour cette formation.'
          : "Erreur lors de l'envoi de la demande";
        console.error('Erreur lors de la création de la demande:', insertError);
        toast.error(message);
        return;
      }

      // La notification aux admins est gérée côté base via un trigger sécurisé
      toast.success('Demande de paiement envoyée avec succès !');
      
    } catch (error) {
      console.error('Erreur lors de la demande de paiement:', error);
      toast.error("Erreur lors de l'envoi de la demande");
    } finally {
      setIsSubmitting(false);
    }
  };
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
              Demande de paiement
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4 text-base pt-4">
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
              
              <div className="text-gray-700 space-y-2">
                <p>
                  Un administrateur examinera votre demande de paiement et validera votre transaction.
                </p>
                <p className="font-medium text-gray-900">
                  Une fois validé, le crédit apparaîtra dans vos jours restants.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-3 sm:gap-3">
            <AlertDialogCancel 
              className="bg-red-500 hover:bg-red-600 text-white border-0 px-6"
              onClick={() => setShowConfirmDialog(false)}
            >
              <X className="h-5 w-5" />
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-green-500 hover:bg-green-600 text-white px-6"
              onClick={() => {
                setShowConfirmDialog(false);
                handlePaymentRequest();
              }}
            >
              <Check className="h-5 w-5" />
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default PaymentRequestButton;