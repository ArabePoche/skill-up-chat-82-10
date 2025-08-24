import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { User, BookOpen, Phone, MessageSquare, CheckCircle, XCircle } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PlanChangeNotificationCardProps {
  notification: {
    id: string;
    user_id: string;
    formation_id: string;
    title: string;
    message: string;
    requested_plan_type: string;
    created_at: string;
    user_info?: {
      first_name: string;
      last_name: string;
      phone?: string;
    };
    formation_info?: {
      title: string;
    };
  };
}

const PlanChangeNotificationCard: React.FC<PlanChangeNotificationCardProps> = ({ notification }) => {
  const [selectedPlan, setSelectedPlan] = useState(notification.requested_plan_type);
  const [selectedPromotion, setSelectedPromotion] = useState<string>('');
  const [showRejectField, setShowRejectField] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const queryClient = useQueryClient();

  // Hook pour récupérer les promotions si le plan groupe est sélectionné
  const { data: promotions = [] } = useQuery({
    queryKey: ['promotions', notification.formation_id],
    queryFn: async () => {
      if (!notification.formation_id) return [];

      const { data, error } = await supabase
        .from('promotions')
        .select('*')
        .eq('formation_id', notification.formation_id)
        .eq('is_active', true)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching promotions:', error);
        return [];
      }

      return data || [];
    },
    enabled: selectedPlan === 'groupe' && !!notification.formation_id,
  });

  const handlePlanChangeMutation = useMutation({
    mutationFn: async ({ action, planType, reason, promotionId }: {
      action: 'approved' | 'rejected';
      planType?: string;
      reason?: string;
      promotionId?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      if (action === 'approved' && planType) {
        // Mettre à jour enrollment_requests
        const { error: enrollmentError } = await supabase
          .from('enrollment_requests')
          .update({ plan_type: planType })
          .eq('user_id', notification.user_id)
          .eq('formation_id', notification.formation_id);

        if (enrollmentError) throw enrollmentError;

        // Mettre à jour user_subscriptions
        const { error: subscriptionError } = await supabase
          .from('user_subscriptions')
          .update({ plan_type: planType })
          .eq('user_id', notification.user_id)
          .eq('formation_id', notification.formation_id);

        if (subscriptionError) throw subscriptionError;

        // Si c'est un plan groupe et qu'une promotion est sélectionnée, assigner l'étudiant
        if (planType === 'groupe' && promotionId) {
          const { error: promotionError } = await supabase
            .from('student_promotions')
            .upsert({
              student_id: notification.user_id,
              promotion_id: promotionId,
              is_active: true
            });

          if (promotionError) {
            console.error('Error assigning student to promotion:', promotionError);
            throw promotionError;
          }
        }

        // Marquer la notification comme lue et approuvée
        const { error: notificationError } = await supabase
          .from('notifications')
          .update({ 
            is_read: true,
            subscription_approved_by: user.id,
            subscription_plan_changed_by: user.id
          })
          .eq('id', notification.id);

        if (notificationError) throw notificationError;

        // Créer une notification pour l'élève
        const { error: studentNotificationError } = await supabase
          .from('notifications')
          .insert({
            user_id: notification.user_id,
            formation_id: notification.formation_id,
            type: 'plan_change_approved',
            title: 'Changement de plan approuvé 🎉',
            message: `Votre demande de changement de plan a été acceptée. Vous êtes maintenant abonné au plan "${planType}" pour la formation "${notification.formation_info?.title || 'cette formation'}".`,
            is_read: false
          });

        if (studentNotificationError) throw studentNotificationError;

      } else if (action === 'rejected') {
        // Marquer la notification comme lue et rejetée
        const { error: notificationError } = await supabase
          .from('notifications')
          .update({ 
            is_read: true,
            message: notification.message + `\n\n❌ REJETÉE : ${reason || 'Aucune raison spécifiée'}`
          })
          .eq('id', notification.id);

        if (notificationError) throw notificationError;

        // Créer une notification pour l'élève
        const { error: studentNotificationError } = await supabase
          .from('notifications')
          .insert({
            user_id: notification.user_id,
            formation_id: notification.formation_id,
            type: 'plan_change_rejected',
            title: 'Changement de plan rejeté',
            message: `Votre demande de changement de plan pour la formation "${notification.formation_info?.title || 'cette formation'}" a été rejetée.${reason ? `\n\nRaison : ${reason}` : ''}`,
            is_read: false
          });

        if (studentNotificationError) throw studentNotificationError;
      }

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['user-subscription'] });
      toast.success('Demande de changement traitée avec succès');
    },
    onError: (error) => {
      console.error('Erreur lors du traitement:', error);
      toast.error('Erreur lors du traitement de la demande');
    }
  });

  const getPlanLabel = (plan: string) => {
    switch (plan) {
      case 'free': return 'Gratuit';
      case 'standard': return 'Standard';
      case 'premium': return 'Premium';
      case 'groupe': return 'Groupe';
      default: return plan;
    }
  };

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'free': return 'bg-green-100 text-green-800';
      case 'standard': return 'bg-blue-100 text-blue-800';
      case 'premium': return 'bg-purple-100 text-purple-800';
      case 'groupe': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const userName = notification.user_info 
    ? `${notification.user_info.first_name || ''} ${notification.user_info.last_name || ''}`.trim()
    : 'Utilisateur inconnu';

  return (
    <Card className="border-2 border-orange-200 bg-orange-50">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-orange-800 flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Demande de changement de plan
          </CardTitle>
          <Badge className={getPlanColor(notification.requested_plan_type)}>
            {getPlanLabel(notification.requested_plan_type)}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Informations utilisateur et formation */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-white rounded-lg">
          <div className="flex items-center gap-3">
            <User className="w-5 h-5 text-gray-500" />
            <div>
              <p className="font-medium">{userName}</p>
              {notification.user_info?.phone && (
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <Phone className="w-3 h-3" />
                  {notification.user_info.phone}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <BookOpen className="w-5 h-5 text-gray-500" />
            <div>
              <p className="font-medium">{notification.formation_info?.title || 'Formation'}</p>
              <p className="text-sm text-gray-600">
                {new Date(notification.created_at).toLocaleDateString('fr-FR')}
              </p>
            </div>
          </div>
        </div>

        {/* Message de la demande */}
        <div className="p-4 bg-white rounded-lg">
          <p className="text-sm whitespace-pre-line">{notification.message}</p>
        </div>

        {/* Sélecteur de plan à approuver */}
        <div className="space-y-2">
          <Label htmlFor="plan-selector">Plan à approuver :</Label>
          <Select value={selectedPlan} onValueChange={setSelectedPlan}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="free">Gratuit</SelectItem>
              <SelectItem value="standard">Standard</SelectItem>
              <SelectItem value="premium">Premium</SelectItem>
              <SelectItem value="groupe">Groupe</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Sélecteur de promotion pour le plan groupe */}
        {selectedPlan === 'groupe' && (
          <div className="space-y-2">
            <Label htmlFor="promotion-selector">Assigner à la promotion :</Label>
            <Select value={selectedPromotion} onValueChange={setSelectedPromotion}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner une promotion" />
              </SelectTrigger>
              <SelectContent>
                {promotions.map((promotion) => (
                  <SelectItem key={promotion.id} value={promotion.id}>
                    {promotion.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {promotions.length === 0 && (
              <p className="text-sm text-gray-500">
                Aucune promotion disponible pour cette formation
              </p>
            )}
          </div>
        )}

        {/* Champ de justification du rejet (affiché seulement après avoir cliqué sur rejeter) */}
        {showRejectField && (
          <div className="space-y-2">
            <Label htmlFor="rejection-reason">Justification du rejet :</Label>
            <Textarea
              id="rejection-reason"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Expliquez pourquoi cette demande est rejetée..."
              rows={3}
            />
          </div>
        )}

        {/* Boutons d'action */}
        <div className="flex gap-3 pt-4">
          {!showRejectField ? (
            <>
              <Button
                onClick={() => handlePlanChangeMutation.mutate({ 
                  action: 'approved', 
                  planType: selectedPlan,
                  promotionId: selectedPlan === 'groupe' ? selectedPromotion : undefined
                })}
                disabled={handlePlanChangeMutation.isPending || (selectedPlan === 'groupe' && !selectedPromotion)}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Approuver
              </Button>
              
              <Button
                onClick={() => setShowRejectField(true)}
                variant="destructive"
                className="flex-1"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Rejeter
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={() => handlePlanChangeMutation.mutate({ 
                  action: 'rejected', 
                  reason: rejectionReason 
                })}
                disabled={handlePlanChangeMutation.isPending}
                variant="destructive"
                className="flex-1"
              >
                Confirmer le rejet
              </Button>
              
              <Button
                onClick={() => {
                  setShowRejectField(false);
                  setRejectionReason('');
                }}
                variant="outline"
                className="flex-1"
              >
                Annuler
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PlanChangeNotificationCard;
