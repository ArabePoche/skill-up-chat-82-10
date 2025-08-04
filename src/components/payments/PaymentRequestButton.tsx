// Bouton de demande de paiement pour les élèves
import React from 'react';
import { Button } from '@/components/ui/button';
import { CreditCard } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface PaymentRequestButtonProps {
  formationId: string;
  className?: string;
}

export const PaymentRequestButton: React.FC<PaymentRequestButtonProps> = ({
  formationId,
  className = ''
}) => {
  const { user } = useAuth();

  const requestPaymentMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) {
        throw new Error('Utilisateur non connecté');
      }

      // Créer une demande de paiement
      const { data, error } = await supabase
        .from('student_payment')
        .insert({
          user_id: user.id,
          formation_id: formationId,
          created_by: user.id,
          is_request: true,
          status: 'pending',
          requested_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Créer une notification pour tous les admins
      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
          title: 'Nouvelle demande de paiement',
          message: `Un élève a fait une demande de paiement pour une formation`,
          type: 'payment_request',
          is_for_all_admins: true
        });

      if (notifError) {
        console.warn('Erreur lors de la création de la notification:', notifError);
      }

      return data;
    },
    onSuccess: () => {
      toast.success('Demande de paiement envoyée aux administrateurs');
    },
    onError: (error) => {
      console.error('Erreur lors de la demande de paiement:', error);
      toast.error('Erreur lors de l\'envoi de la demande de paiement');
    }
  });

  return (
    <Button
      onClick={() => requestPaymentMutation.mutate()}
      disabled={requestPaymentMutation.isPending}
      className={`bg-blue-600 hover:bg-blue-700 text-white ${className}`}
      variant="default"
    >
      <CreditCard className="w-4 h-4 mr-2" />
      {requestPaymentMutation.isPending ? 'Envoi...' : 'Demander un paiement'}
    </Button>
  );
};