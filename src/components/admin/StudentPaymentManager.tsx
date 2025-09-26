import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, CreditCard, Plus, Eye, EyeOff } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useStudentPaymentProgress } from '@/hooks/useStudentPaymentProgress';
import { useFormationPricing } from '@/hooks/useFormationPricing';
import { useUserSubscription } from '@/hooks/useUserSubscription';

interface StudentPaymentManagerProps {
  studentId: string;
  formationId: string;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

/**
 * Composant pour gérer les paiements d'un étudiant depuis l'interface admin
 */
export const StudentPaymentManager: React.FC<StudentPaymentManagerProps> = ({
  studentId,
  formationId,
  isExpanded = false,
  onToggleExpand
}) => {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [comment, setComment] = useState<string>('');
  const [reference, setReference] = useState<string>('');
  
  // Récupérer la tarification et l'abonnement de l'étudiant
  const { pricingOptions } = useFormationPricing(formationId);
  const { subscription } = useUserSubscription(formationId, studentId);
  
  // Calculer le prix par jour basé sur l'abonnement réel de l'étudiant
  const getUserPricePerDay = () => {
    if (!subscription || !pricingOptions) return 1; // Fallback à 1€ par jour si pas de données
    
    // Utiliser le vrai plan de l'étudiant
    const userPlan = pricingOptions.find(
      option => option.plan_type === subscription.plan_type && option.is_active
    );
    
    if (userPlan?.price_monthly) {
      return userPlan.price_monthly / 30;
    }
    
    return 1; // Fallback à 1€ par jour
  };

  const pricePerDay = getUserPricePerDay();
  
  // Récupérer le progrès de paiement actuel
  const { data: paymentProgress } = useQuery({
    queryKey: ['student-payment-progress', studentId, formationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_payment_progress')
        .select('*')
        .eq('user_id', studentId)
        .eq('formation_id', formationId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: isExpanded
  });

  // Récupérer l'historique des paiements
  const { data: paymentHistory } = useQuery({
    queryKey: ['student-payment-history', studentId, formationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_payment')
        .select('*')
        .eq('user_id', studentId)
        .eq('formation_id', formationId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data || [];
    },
    enabled: isExpanded
  });

  // Ajouter un paiement
  const addPaymentMutation = useMutation({
    mutationFn: async () => {
      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        throw new Error('Montant invalide');
      }

      // Calculer les jours et heures à ajouter en fonction du prix par jour
      const totalDaysToAdd = amountNum / pricePerDay;
      const daysToAdd = Math.floor(totalDaysToAdd);
      const fractionalDays = totalDaysToAdd - daysToAdd;
      const hoursToAdd = Math.round(fractionalDays * 24); // Convertir la fraction en heures

      // Insérer le paiement
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      const { error: paymentError } = await supabase
        .from('student_payment')
        .insert({
          user_id: studentId,
          formation_id: formationId,
          amount: amountNum,
          payment_method: paymentMethod,
          comment: comment.trim() || null,
          reference: reference.trim() || null,
          days_added: daysToAdd,
          hours_added: hoursToAdd,
          status: 'confirmed',
          is_request: false,
          created_by: user.id
        });

      if (paymentError) throw paymentError;

      // Mettre à jour ou créer le progrès de paiement
      const currentDays = paymentProgress?.total_days_remaining || 0;
      const currentHours = paymentProgress?.hours_remaining || 0;
      
      // Ajouter les nouvelles heures et convertir en jours si nécessaire
      const totalHours = currentHours + hoursToAdd;
      const additionalDaysFromHours = Math.floor(totalHours / 24);
      const remainingHours = totalHours % 24;
      const newTotalDays = currentDays + daysToAdd + additionalDaysFromHours;

      const { error: progressError } = await supabase
        .from('student_payment_progress')
        .upsert({
          user_id: studentId,
          formation_id: formationId,
          total_days_remaining: newTotalDays,
          hours_remaining: remainingHours,
          last_payment_date: new Date().toISOString()
        });

      if (progressError) throw progressError;
    },
    onSuccess: () => {
      toast.success('Paiement ajouté avec succès');
      setAmount('');
      setComment('');
      setReference('');
      // Invalider les caches
      queryClient.invalidateQueries({ queryKey: ['student-payment-progress'] });
      queryClient.invalidateQueries({ queryKey: ['student-payment-history'] });
    },
    onError: (error) => {
      console.error('Erreur lors de l\'ajout du paiement:', error);
      toast.error('Erreur lors de l\'ajout du paiement');
    }
  });

  const totalDaysRemaining = paymentProgress?.total_days_remaining || 0;
  const totalHoursRemaining = paymentProgress?.hours_remaining || 0;
  const lastPaymentDate = paymentProgress?.last_payment_date;

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center">
            <CreditCard className="w-5 h-5 mr-2 text-blue-600" />
            Gestion des paiements
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleExpand}
            className="flex items-center gap-1"
          >
            {isExpanded ? <EyeOff size={16} /> : <Eye size={16} />}
            {isExpanded ? 'Masquer' : 'Voir'}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Résumé rapide toujours visible */}
        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
          <div className="flex items-center">
            <Clock className="w-4 h-4 mr-2 text-blue-600" />
            <span className="text-sm text-blue-800">
              <strong>
                {totalDaysRemaining} jour{totalDaysRemaining > 1 ? 's' : ''}
                {totalHoursRemaining > 0 && ` + ${totalHoursRemaining}h`} restant{totalDaysRemaining > 1 || totalHoursRemaining > 0 ? 's' : ''}
              </strong>
            </span>
          </div>
          {lastPaymentDate && (
            <span className="text-xs text-blue-600">
              Dernier: {new Date(lastPaymentDate).toLocaleDateString('fr-FR')}
            </span>
          )}
        </div>

        {isExpanded && (
          <>
            {/* Formulaire d'ajout de paiement */}
            <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900">Ajouter un paiement</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Montant (€)</Label>
                  <Input
                    id="amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="50.00"
                  />
                   {amount && !isNaN(parseFloat(amount)) && pricePerDay > 0 && (
                     <p className="text-xs text-gray-600">
                       {(() => {
                         const totalDays = parseFloat(amount) / pricePerDay;
                         const days = Math.floor(totalDays);
                         const hours = Math.round((totalDays - days) * 24);
                         return `= ${days} jour${days > 1 ? 's' : ''} ${hours > 0 ? `+ ${hours}h` : ''} (à ${pricePerDay.toFixed(2)}€/jour)`;
                       })()}
                     </p>
                   )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payment-method">Méthode de paiement</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="cash">Espèces</SelectItem>
                       <SelectItem value="bank_transfer">Virement bancaire</SelectItem>
                       <SelectItem value="credit_card">Carte bancaire</SelectItem>
                       <SelectItem value="mobile_money">Mobile Money</SelectItem>
                       <SelectItem value="other">Autre</SelectItem>
                     </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="comment">Commentaire (optionnel)</Label>
                <Textarea
                  id="comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Notes sur ce paiement..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reference">Référence/Justification (optionnel)</Label>
                <Input
                  id="reference"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Numéro de transaction, référence..."
                />
              </div>

              <Button
                onClick={() => addPaymentMutation.mutate()}
                disabled={!amount || addPaymentMutation.isPending}
                className="w-full"
              >
                <Plus size={16} className="mr-2" />
                {addPaymentMutation.isPending ? 'Ajout...' : 'Ajouter le paiement'}
              </Button>
            </div>

            {/* Historique des paiements */}
            {paymentHistory && paymentHistory.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">Historique récent</h4>
                <div className="space-y-2">
                  {paymentHistory.map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between p-3 bg-white border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{payment.amount}€</span>
                          <span className="text-sm text-gray-500">
                            {new Date(payment.created_at).toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-sm text-gray-600">
                            {payment.payment_method === 'cash' && 'Espèces'}
                            {payment.payment_method === 'bank_transfer' && 'Virement'}
                            {payment.payment_method === 'credit_card' && 'Carte'}
                            {payment.payment_method === 'mobile_money' && 'Mobile Money'}
                            {payment.payment_method === 'other' && 'Autre'}
                          </span>
                           <span className="text-sm text-green-600">
                             +{payment.days_added} jour{payment.days_added > 1 ? 's' : ''}
                             {payment.hours_added > 0 && ` + ${payment.hours_added}h`}
                           </span>
                        </div>
                        {payment.comment && (
                          <p className="text-xs text-gray-500 mt-1">{payment.comment}</p>
                        )}
                        {/* TODO: Ajouter la colonne 'reference' à la table student_payment */}
                        {/* {payment.reference && (
                          <p className="text-xs text-blue-500 mt-1">Réf: {payment.reference}</p>
                        )} */}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};