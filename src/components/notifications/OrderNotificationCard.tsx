// Carte de notification pour traiter une commande
// Affichée pour les administrateurs/vendeurs dans la page Notifications
import React, { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShoppingCart, CheckCircle, XCircle, User, Package } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface OrderNotificationCardProps {
  notification: {
    id: string;
    shop_order_id?: string;
    created_at: string;
    is_read: boolean;
    title: string;
    message: string;
  };
}

const OrderNotificationCard: React.FC<OrderNotificationCardProps> = ({ notification }) => {
  const queryClient = useQueryClient();

  // Marquer automatiquement comme lue à l'affichage
  useEffect(() => {
    const markAsRead = async () => {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notification.id);
      
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-counts'] });
    };

    const timer = setTimeout(markAsRead, 500);
    return () => clearTimeout(timer);
  }, [notification.id, queryClient]);

  // Récupérer les détails de la commande
  const { data: order } = useQuery({
    queryKey: ['order-details', notification.shop_order_id],
    queryFn: async () => {
      if (!notification.shop_order_id) return null;
      
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('id, total_amount, status, created_at, user_id')
        .eq('id', notification.shop_order_id)
        .single();
      
      if (orderError) throw orderError;
      
      // Récupérer le profil de l'acheteur séparément
      const { data: buyerProfile, error: buyerError } = await supabase
        .from('profiles')
        .select('first_name, last_name, phone')
        .eq('id', orderData.user_id)
        .single();
      
      return {
        ...orderData,
        buyer: buyerError ? null : buyerProfile
      };
    },
    enabled: !!notification.shop_order_id,
  });

  // Récupérer les articles de la commande
  const { data: orderItems } = useQuery({
    queryKey: ['order-items', notification.shop_order_id],
    queryFn: async () => {
      if (!notification.shop_order_id) return [];
      
      const { data: items, error } = await supabase
        .from('order_items')
        .select('id, quantity, unit_price')
        .eq('order_id', notification.shop_order_id);
      
      if (error) throw error;
      
      return items || [];
    },
    enabled: !!notification.shop_order_id,
  });

  const updateOrderMutation = useMutation({
    mutationFn: async (status: 'approved' | 'rejected') => {
      if (!notification.shop_order_id) throw new Error('Commande introuvable');
      
      const { error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', notification.shop_order_id);
      
      if (error) throw error;
    },
    onSuccess: (_, status) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-counts'] });
      queryClient.invalidateQueries({ queryKey: ['order-details'] });
      toast.success(status === 'approved' ? 'Commande approuvée' : 'Commande rejetée');
    },
    onError: (error) => {
      console.error('Error updating order:', error);
      toast.error('Erreur lors du traitement de la commande');
    }
  });

  if (!order) return null;

  const userName = order.buyer 
    ? `${order.buyer.first_name || ''} ${order.buyer.last_name || ''}`.trim() 
    : 'Client';
  const isProcessed = order.status !== 'pending';

  return (
    <Card className={`border-2 ${
      order.status === 'approved' ? 'border-green-200 bg-green-50' :
      order.status === 'rejected' ? 'border-red-200 bg-red-50' :
      'border-orange-200 bg-orange-50'
    }`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className={`text-lg font-semibold flex items-center gap-2 ${
            order.status === 'approved' ? 'text-green-800' :
            order.status === 'rejected' ? 'text-red-800' :
            'text-orange-800'
          }`}>
            <ShoppingCart className="w-5 h-5" />
            {order.status === 'approved' ? 'Commande approuvée' :
             order.status === 'rejected' ? 'Commande rejetée' :
             'Nouvelle commande'}
          </CardTitle>
          {isProcessed && (
            <Badge className={
              order.status === 'approved' 
                ? 'bg-green-100 text-green-700 border-green-300'
                : 'bg-red-100 text-red-700 border-red-300'
            }>
              {order.status === 'approved' ? 'Approuvée' : 'Rejetée'}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Informations client */}
        <div className="p-4 bg-white rounded-lg">
          <div className="flex items-center gap-3 mb-3">
            <User className="w-4 h-4 text-gray-500" />
            <div>
              <p className="font-medium">{userName}</p>
              {order.buyer?.phone && (
                <p className="text-sm text-gray-600">{order.buyer.phone}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Package className="w-4 h-4 text-gray-500" />
            <div>
              <p className="text-sm text-gray-500">Date de commande</p>
              <p className="font-medium">{new Date(order.created_at).toLocaleDateString('fr-FR')}</p>
            </div>
          </div>
        </div>

        {/* Articles commandés */}
        {orderItems && orderItems.length > 0 && (
          <div className="p-4 bg-white rounded-lg">
            <p className="font-medium mb-3">Détails de la commande :</p>
            <div className="space-y-2">
              {orderItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between py-2 border-b last:border-b-0">
                  <div>
                    <p className="font-medium">Article</p>
                    <p className="text-sm text-gray-500">Quantité: {item.quantity}</p>
                  </div>
                  <p className="font-semibold">{(item.unit_price * item.quantity).toLocaleString()} F</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Montant total */}
        <div className="p-4 bg-white rounded-lg">
          <div className="flex items-center justify-between">
            <p className="text-lg font-medium">Montant total :</p>
            <p className="text-2xl font-bold text-primary">{order.total_amount.toLocaleString()} F</p>
          </div>
        </div>

        {/* Boutons d'action */}
        {!isProcessed && (
          <div className="flex gap-3">
            <Button 
              onClick={() => updateOrderMutation.mutate('approved')} 
              disabled={updateOrderMutation.isPending}
              className="bg-green-600 hover:bg-green-700 text-white flex-1"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Approuver
            </Button>
            <Button 
              onClick={() => updateOrderMutation.mutate('rejected')} 
              disabled={updateOrderMutation.isPending}
              variant="destructive"
              className="flex-1"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Rejeter
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default OrderNotificationCard;
