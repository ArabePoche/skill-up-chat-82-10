// Carte de notification pour traiter une demande de paiement manuel
// Affichée pour les administrateurs dans la page Notifications
import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, CreditCard, CheckCircle, User, BookOpen } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useUserSubscription } from '@/hooks/useUserSubscription';
import { useFormationPricing } from '@/hooks/useFormationPricing';

interface PaymentRequestNotificationCardProps {
  notification: {
    id: string;
    user_id: string;
    formation_id: string;
    created_at: string;
    order_id?: string; // Id de la demande dans student_payment (stocké dans notifications.order_id)
    user_info?: {
      first_name?: string;
      last_name?: string;
      phone?: string;
    } | null;
    formation_info?: {
      title?: string;
    } | null;
    approved_by_admin?: {
      first_name: string;
      last_name: string;
    } | null;
  };
}

const PaymentRequestNotificationCard: React.FC<PaymentRequestNotificationCardProps> = ({ notification }) => {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState<string>('');

  // Récupérer l'abonnement réel de l'élève et les options de tarification
  const { subscription } = useUserSubscription(notification.formation_id, notification.user_id);
  const { pricingOptions } = useFormationPricing(notification.formation_id);

  // Charger le titre de la formation
  const { data: formation } = useQuery({
    queryKey: ['formation-price', notification.formation_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('formations')
        .select('id, title')
        .eq('id', notification.formation_id)
        .single();
      if (error) throw error;
      return data as { id: string; title?: string };
    },
    enabled: !!notification.formation_id,
  });

  // Charger les détails du paiement si traité
  const { data: paymentDetails } = useQuery({
    queryKey: ['payment-details', notification.order_id],
    queryFn: async () => {
      if (!notification.order_id) return null;
      const { data, error } = await supabase
        .from('student_payment')
        .select('amount, payment_method, payment_date, comment, days_added, hours_added')
        .eq('id', notification.order_id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!notification.order_id && !!notification.approved_by_admin,
  });

  // Calculer le prix par jour basé sur l'abonnement réel de l'élève
  const pricePerDay = useMemo(() => {
    if (!subscription || !pricingOptions) return 1; // Fallback à 1F par jour
    
    // Trouver le plan de tarification correspondant à l'abonnement de l'élève
    const userPlan = pricingOptions.find(
      option => option.plan_type === subscription.plan_type && option.is_active
    );
    
    if (userPlan?.price_monthly) {
      return userPlan.price_monthly / 30;
    }
    
    return 1; // Fallback à 1F par jour
  }, [subscription, pricingOptions]);

  const { daysAdded, hoursAdded } = useMemo(() => {
    const amt = Number(amount || 0);
    if (!amt || pricePerDay <= 0) return { daysAdded: 0, hoursAdded: 0 };
    
    const totalDays = amt / pricePerDay;
    const wholeDays = Math.floor(totalDays);
    const fractionalDay = totalDays - wholeDays;
    const hoursToAdd = Math.round(fractionalDay * 24);
    
    return { daysAdded: wholeDays, hoursAdded: hoursToAdd };
  }, [pricePerDay, amount]);

  const processMutation = useMutation({
    mutationFn: async () => {
      // Trouver l'id de la demande de paiement si non fourni
      let paymentId = notification.order_id;
      if (!paymentId) {
        const { data: paymentRow, error: findErr } = await supabase
          .from('student_payment')
          .select('id')
          .eq('user_id', notification.user_id)
          .eq('formation_id', notification.formation_id)
          .eq('is_request', true)
          .eq('status', 'pending')
          .order('requested_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (findErr) throw findErr;
        if (!paymentRow) throw new Error('Aucune demande associée trouvée');
        paymentId = paymentRow.id;
      }

      // Mettre à jour la ligne student_payment
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      const { error: updErr } = await supabase
        .from('student_payment')
        .update({
          amount: Number(amount || 0),
          payment_method: paymentMethod,
          payment_date: paymentDate,
          comment: reference || null,
          days_added: daysAdded,
          hours_added: hoursAdded,
          status: 'processed',
          created_by: user.id, // Enregistrer l'admin qui a traité la demande
          updated_at: new Date().toISOString(),
        })
        .eq('id', paymentId);

      if (updErr) throw updErr;

      // Marquer la notification comme lue ET enregistrer l'admin qui a confirmé
      const { error: notifErr } = await supabase
        .from('notifications')
        .update({ 
          is_read: true,
          confirmed_by: user.id // Enregistrer l'admin qui a traité
        })
        .eq('id', notification.id);
      if (notifErr) throw notifErr;

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['student-payment-progress'] });
      toast.success('Paiement traité et jours ajoutés');
    },
    onError: (e: any) => {
      console.error(e);
      toast.error(e?.message || 'Erreur lors du traitement');
    }
  });

  const userName = `${notification.user_info?.first_name || ''} ${notification.user_info?.last_name || ''}`.trim() || 'Élève';
  const formationTitle = notification.formation_info?.title || formation?.title || 'Formation';

  // Vérifier si la demande a été traitée (utiliser approved_by_admin directement)
  const isProcessed = !!notification.approved_by_admin;
  const confirmedByAdmin = notification.approved_by_admin;

  return (
    <Card className={`border-2 ${isProcessed ? 'border-green-200 bg-green-50' : 'border-blue-200 bg-blue-50'}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className={`text-lg font-semibold flex items-center gap-2 ${isProcessed ? 'text-green-800' : 'text-blue-800'}`}>
            <CreditCard className="w-5 h-5" />
            {isProcessed ? 'Paiement traité' : 'Demande de paiement'}
          </CardTitle>
          {confirmedByAdmin && (
            <Badge className="bg-green-100 text-green-700 border-green-300">
              Traité par {confirmedByAdmin.first_name} {confirmedByAdmin.last_name}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Contexte */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-white rounded-lg">
          <div className="flex items-center gap-3">
            <User className="w-4 h-4 text-gray-500" />
            <div>
              <p className="font-medium">{userName}</p>
              {notification.user_info?.phone && (
                <p className="text-sm text-gray-600">{notification.user_info.phone}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <BookOpen className="w-4 h-4 text-gray-500" />
            <div>
              <p className="font-medium">{formationTitle}</p>
              <p className="text-xs text-gray-500">Demande: {new Date(notification.created_at).toLocaleDateString('fr-FR')}</p>
            </div>
          </div>
        </div>

        {/* Si traité, afficher les détails du paiement au lieu du formulaire */}
        {isProcessed ? (
          <div className="space-y-4">
            <div className="p-4 bg-white rounded-lg">
              <div className="flex items-center gap-2 text-green-700 mb-3">
                <CheckCircle className="w-5 h-5" />
                <p className="font-medium">Cette demande a été traitée avec succès</p>
              </div>
              
              {paymentDetails && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <p className="text-sm text-gray-500">Montant payé</p>
                    <p className="font-semibold text-lg">{paymentDetails.amount?.toLocaleString()} F</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Crédité</p>
                    <p className="font-semibold text-lg">
                      {paymentDetails.days_added} jour(s)
                      {paymentDetails.hours_added > 0 && ` + ${paymentDetails.hours_added}h`}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Méthode de paiement</p>
                    <p className="font-medium">
                      {paymentDetails.payment_method === 'cash' && 'Espèces'}
                      {paymentDetails.payment_method === 'mobile_money' && 'Mobile Money'}
                      {paymentDetails.payment_method === 'bank_transfer' && 'Virement'}
                      {paymentDetails.payment_method === 'other' && 'Autre'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Date du paiement</p>
                    <p className="font-medium">
                      {paymentDetails.payment_date && new Date(paymentDetails.payment_date).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  {paymentDetails.comment && (
                    <div className="md:col-span-2">
                      <p className="text-sm text-gray-500">Référence / Note</p>
                      <p className="font-medium">{paymentDetails.comment}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Formulaire de traitement */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-white rounded-lg">
              <div className="space-y-2">
                <Label htmlFor="amount">Montant payé</Label>
                <Input id="amount" type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Ex: 10000" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment_date">Date du paiement</Label>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <Input id="payment_date" type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Méthode de paiement</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir une méthode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Espèces</SelectItem>
                    <SelectItem value="mobile_money">Mobile Money</SelectItem>
                    <SelectItem value="bank_transfer">Virement</SelectItem>
                    <SelectItem value="other">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Référence / justificatif (facultatif)</Label>
                <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="N° référence ou note" />
              </div>
            </div>

            {/* Calcul automatique */}
            <div className="p-4 bg-white rounded-lg text-sm text-gray-700">
              <p>
                Plan de l'élève: <span className="font-medium">{subscription?.plan_type || 'Non défini'}</span>
              </p>
              <p>
                Tarif par jour: <span className="font-medium">{pricePerDay.toFixed(0)} F</span>
              </p>
              <p className="mt-1">
                Crédité: <span className="font-semibold">{daysAdded} jour(s)</span>
                {hoursAdded > 0 && <span className="font-semibold"> + {hoursAdded} heure(s)</span>}
              </p>
            </div>

            <div className="flex gap-3">
              <Button 
                onClick={() => processMutation.mutate()} 
                disabled={processMutation.isPending || !amount || (daysAdded <= 0 && hoursAdded <= 0)}
                className="bg-green-600 hover:bg-green-700 text-white flex-1"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Valider le paiement
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default PaymentRequestNotificationCard;