import React, { useState } from 'react';
import { CreditCard, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

  const handlePaymentRequest = async () => {
    if (!user || isSubmitting) return;

    setIsSubmitting(true);
    try {
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
        console.error('Erreur lors de la création de la demande:', insertError);
        throw insertError;
      }

      // La notification aux admins est gérée côté base via un trigger sécurisé

      toast.success('Demande de paiement envoyée avec succès !');
      
    } catch (error) {
      console.error('Erreur lors de la demande de paiement:', error);
      toast.error('Erreur lors de l\'envoi de la demande');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Button
      onClick={handlePaymentRequest}
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
  );
};

export default PaymentRequestButton;