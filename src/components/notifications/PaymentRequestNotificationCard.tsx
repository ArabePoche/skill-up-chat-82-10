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

  // Charger le prix de la formation pour calculer les jours
  const { data: formation } = useQuery({
    queryKey: ['formation-price', notification.formation_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('formations')
        .select('id, price, title')
        .eq('id', notification.formation_id)
        .single();
      if (error) throw error;
      return data as { id: string; price: number | null; title?: string };
    },
    enabled: !!notification.formation_id,
  });

  const daysAdded = useMemo(() => {
    const price = Number(formation?.price || 0);
    const amt = Number(amount || 0);
    if (!price || !amt) return 0;
    const perDay = price / 30; // tarif/jour
    return Math.floor(amt / perDay);
  }, [formation?.price, amount]);

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
          status: 'processed',
          created_by: user.id, // Enregistrer l'admin qui a traité la demande
          updated_at: new Date().toISOString(),
        })
        .eq('id', paymentId);

      if (updErr) throw updErr;

      // Marquer la notif comme lue
      const { error: notifErr } = await supabase
        .from('notifications')
        .update({ is_read: true })
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

  return (
    <Card className="border-2 border-blue-200 bg-blue-50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-blue-800 flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Demande de paiement
          </CardTitle>
          {notification.approved_by_admin && (
            <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
              Traité par {notification.approved_by_admin.first_name} {notification.approved_by_admin.last_name}
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
            Tarif mensuel: <span className="font-medium">{formation?.price ? `${formation.price} F` : 'N/A'}</span> →
            <span className="ml-2">1 jour = {formation?.price ? `${Math.round((formation.price / 30))} F` : 'N/A'}</span>
          </p>
          <p className="mt-1">Jours ajoutés: <span className="font-semibold">{daysAdded} jour(s)</span></p>
        </div>

        <div className="flex gap-3">
          <Button 
            onClick={() => processMutation.mutate()} 
            disabled={processMutation.isPending || !amount || daysAdded <= 0}
            className="bg-green-600 hover:bg-green-700 text-white flex-1"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Valider le paiement
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default PaymentRequestNotificationCard;