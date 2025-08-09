import React, { useState } from 'react';
import { DollarSign, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PaymentRequestButtonProps {
  formationId: string;
  className?: string;
}

const PaymentRequestButton: React.FC<PaymentRequestButtonProps> = ({ 
  formationId, 
  className 
}) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmitRequest = async () => {
    if (!user || !amount || !description) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error('Montant invalide');
      return;
    }

    setIsSubmitting(true);

    try {
      // Créer une notification pour les admins
      const { error } = await supabase
        .from('notifications')
        .insert({
          title: 'Demande de paiement',
          message: `${user.email} demande un paiement de ${amountNum}€ pour la formation`,
          type: 'payment_request',
          formation_id: formationId,
          user_id: user.id,
          is_for_all_admins: true,
          // Stockage des détails dans le message
          description: JSON.stringify({
            amount: amountNum,
            description,
            requested_by: user.email,
            formation_id: formationId,
            created_at: new Date().toISOString()
          })
        });

      if (error) throw error;

      toast.success('Demande de paiement envoyée avec succès');
      setIsOpen(false);
      setAmount('');
      setDescription('');
    } catch (error) {
      console.error('Erreur lors de l\'envoi de la demande:', error);
      toast.error('Erreur lors de l\'envoi de la demande');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        className={className}
        variant="outline"
      >
        <DollarSign size={16} className="mr-2" />
        Demander un paiement
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Demande de paiement</DialogTitle>
            <DialogDescription>
              Remplissez les informations pour votre demande de paiement
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Montant (€)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="ex: 50.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Décrivez le motif de votre demande de paiement..."
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isSubmitting}
            >
              Annuler
            </Button>
            <Button
              onClick={handleSubmitRequest}
              disabled={isSubmitting || !amount || !description}
            >
              {isSubmitting && <Loader2 size={16} className="mr-2 animate-spin" />}
              Envoyer la demande
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PaymentRequestButton;