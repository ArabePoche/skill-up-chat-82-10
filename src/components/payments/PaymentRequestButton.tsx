/**
 * Composant bouton pour demander un paiement dans une formation
 */
import React from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface PaymentRequestButtonProps {
  formationId: string;
  className?: string;
}

export const PaymentRequestButton: React.FC<PaymentRequestButtonProps> = ({ 
  formationId, 
  className 
}) => {
  const handlePaymentRequest = () => {
    // TODO: Implémenter la logique de demande de paiement
    toast.info('Fonctionnalité de demande de paiement à implémenter');
  };

  return (
    <Button 
      onClick={handlePaymentRequest}
      className={className}
      variant="default"
    >
      💰 Demander un paiement
    </Button>
  );
};