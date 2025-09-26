// Carte de traitement des demandes de paiement pour les admins
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PaymentRequest {
  id: string;
  user_id: string;
  formation_id: string;
  is_request: boolean;
  status: string;
  requested_at: string;
  profiles?: {
    first_name?: string;
    last_name?: string;
    username?: string;
  };
  formations?: {
    title?: string;
  };
}

interface PaymentProcessingCardProps {
  paymentRequest: PaymentRequest;
}

export const PaymentProcessingCard: React.FC<PaymentProcessingCardProps> = ({
  paymentRequest
}) => {
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [calculatedDays, setCalculatedDays] = useState(0);
  const [calculatedHours, setCalculatedHours] = useState(0);
  const queryClient = useQueryClient();

  // Calcul automatique des jours et heures selon le montant (30 000 F = 30 jours)
  const calculateDaysAndHours = (amountValue: string) => {
    const numAmount = parseFloat(amountValue) || 0;
    const totalDays = numAmount / 1000; // 1000 F = 1 jour
    const wholeDays = Math.floor(totalDays);
    const fractionalDay = totalDays - wholeDays;
    const hoursToAdd = Math.round(fractionalDay * 24);
    
    setCalculatedDays(wholeDays);
    setCalculatedHours(hoursToAdd);
  };

  const processPaymentMutation = useMutation({
    mutationFn: async () => {
      if (!amount || !paymentMethod || !paymentDate) {
        throw new Error('Veuillez remplir tous les champs obligatoires');
      }

      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        throw new Error('Le montant doit être un nombre valide');
      }

      // Mettre à jour la demande de paiement
      const { error: updateError } = await supabase
        .from('student_payment')
        .update({
          amount: amountNum,
          days_added: calculatedDays,
          hours_added: calculatedHours,
          payment_method: paymentMethod,
          payment_date: paymentDate,
          reference_number: referenceNumber || null,
          status: 'processed',
          processed_at: new Date().toISOString()
        })
        .eq('id', paymentRequest.id);

      if (updateError) throw updateError;

      // Les jours restants seront mis à jour automatiquement par le trigger SQL
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-payment-requests'] });
      queryClient.invalidateQueries({ queryKey: ['student-payment-progress'] });
      toast.success('Paiement traité avec succès');
    },
    onError: (error) => {
      console.error('Erreur lors du traitement du paiement:', error);
      toast.error('Erreur lors du traitement du paiement');
    }
  });

  const studentName = paymentRequest.profiles?.first_name && paymentRequest.profiles?.last_name
    ? `${paymentRequest.profiles.first_name} ${paymentRequest.profiles.last_name}`
    : paymentRequest.profiles?.username || 'Élève';

  const formationTitle = paymentRequest.formations?.title || 'Formation';

  return (
    <Card className="mb-4 border-l-4 border-l-blue-500">
      <CardHeader>
        <CardTitle className="text-lg">
          Demande de paiement - {studentName}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Formation: {formationTitle}
        </p>
        <p className="text-xs text-muted-foreground">
          Demandé le: {new Date(paymentRequest.requested_at).toLocaleDateString('fr-FR')}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Montant payé (F CFA) *
            </label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                calculateDaysAndHours(e.target.value);
              }}
              placeholder="ex: 15000"
              required
            />
            {(calculatedDays > 0 || calculatedHours > 0) && (
              <p className="text-sm text-green-600 mt-1">
                = {calculatedDays} jour{calculatedDays > 1 ? 's' : ''}
                {calculatedHours > 0 && ` + ${calculatedHours} heure${calculatedHours > 1 ? 's' : ''}`}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Date du paiement *
            </label>
            <Input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Méthode de paiement *
            </label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner une méthode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mobile_money">Mobile Money</SelectItem>
                <SelectItem value="bank_transfer">Virement bancaire</SelectItem>
                <SelectItem value="cash">Espèces</SelectItem>
                <SelectItem value="other">Autre</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Référence / Numéro de transaction
            </label>
            <Input
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder="ex: TXN123456"
            />
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button
            onClick={() => processPaymentMutation.mutate()}
            disabled={processPaymentMutation.isPending || !amount || !paymentMethod || !paymentDate}
            className="bg-green-600 hover:bg-green-700"
          >
            {processPaymentMutation.isPending ? 'Traitement...' : 'Valider le paiement'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};