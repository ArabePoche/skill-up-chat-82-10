// Importation des dépendances React et utilitaires
import React, { useState } from 'react';
import { CreditCard, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

// Définition des props du composant
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
  // Récupération de l'utilisateur connecté
  const { user } = useAuth();
  // Gestion de l'état d'envoi
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fonction pour gérer la demande de paiement
  const handlePaymentRequest = async () => {
    if (!user || isSubmitting) return;

    setIsSubmitting(true);
    try {
      // Création de la demande de paiement dans la table student_payment
      const { error: insertError } = await supabase
        .from('student_payment')
        .insert({
          user_id: user.id,
          formation_id: formationId,
          is_request: true,
          status: 'pending',
          requested_at: new Date().toISOString(),
          created_by: user.id
        });

      if (insertError) {
        console.error('Erreur lors de la création de la demande:', insertError);
        throw insertError;
      }

      // Notifier tous les administrateurs (optionnel, dépend du backend)
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          title: 'Nouvelle demande de paiement',
          message: `Un étudiant a fait une demande de paiement pour validation.`,
          type: 'payment_request',
          is_for_all_admins: true,
          user_id: null, // null car c'est pour tous les admins
          formation_id: formationId
        });

      if (notificationError) {
        console.error('Erreur lors de la création de la notification:', notificationError);
        // On continue même si la notification échoue
      }

      toast.success('Demande de paiement envoyée avec succès !');
      
    } catch (error) {
      console.error('Erreur lors de la demande de paiement:', error);
      toast.error('Erreur lors de l\'envoi de la demande');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Rendu du bouton avec loader et icône
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

// Export du composant
export default PaymentRequestButton;