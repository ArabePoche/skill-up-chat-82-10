// Carte de notification pour traiter une commande
// Affichée pour les administrateurs/vendeurs dans la page Notifications
import React, { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShoppingCart, CheckCircle, XCircle, User, Package, MapPin, Phone } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
        .select('id, total_amount, status, created_at, user_id, delivery_address, delivery_city, delivery_postal_code, delivery_phone, buyer_notes')
        .eq('id', notification.shop_order_id)
        .single();
      
      if (orderError) throw orderError;
      
      // Récupérer le profil de l'acheteur séparément
      const { data: buyerProfile, error: buyerError } = await supabase
        .from('profiles')
        .select('first_name, last_name, phone, avatar_url')
        .eq('id', orderData.user_id)
        .single();
      
      return {
        ...orderData,
        buyer: buyerError ? null : buyerProfile
      };
    },
    enabled: !!notification.shop_order_id,
  });

  // Récupérer les articles de la commande avec les infos des produits
  const { data: orderItems } = useQuery({
    queryKey: ['order-items', notification.shop_order_id],
    queryFn: async () => {
      if (!notification.shop_order_id) return [];
      
      const { data: items, error } = await supabase
        .from('order_items')
        .select('id, quantity, unit_price, product_id, selected_size, selected_color')
        .eq('order_id', notification.shop_order_id);
      
      if (error) throw error;
      
      if (!items || items.length === 0) return [];
      
      // Enrichir avec les infos des produits
      const enrichedItems = await Promise.all(
        items.map(async (item) => {
          if (!item.product_id) return item;
          
          const { data: product } = await supabase
            .from('products')
            .select('name, images')
            .eq('id', item.product_id)
            .single();
          
          return {
            ...item,
            product: product || null
          };
        })
      );
      
      return enrichedItems;
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
    <Card className={`overflow-hidden ${
      order.status === 'approved' ? 'border-l-4 border-l-green-500 bg-green-50/50' :
      order.status === 'rejected' ? 'border-l-4 border-l-red-500 bg-red-50/50' :
      'border-l-4 border-l-primary bg-card'
    }`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              order.status === 'approved' ? 'bg-green-100' :
              order.status === 'rejected' ? 'bg-red-100' :
              'bg-primary/10'
            }`}>
              <ShoppingCart className={`w-6 h-6 ${
                order.status === 'approved' ? 'text-green-600' :
                order.status === 'rejected' ? 'text-red-600' :
                'text-primary'
              }`} />
            </div>
            <span>
              {order.status === 'approved' ? 'Commande approuvée' :
               order.status === 'rejected' ? 'Commande rejetée' :
               'Nouvelle commande'}
            </span>
          </CardTitle>
          {isProcessed && (
            <Badge variant={order.status === 'approved' ? 'default' : 'destructive'}>
              {order.status === 'approved' ? 'Approuvée' : 'Rejetée'}
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Informations client */}
        <div className="p-4 bg-background rounded-xl border shadow-sm">
          <div className="flex items-start gap-4">
            <Avatar className="w-14 h-14 border-2 border-primary/20">
              <AvatarImage src={order.buyer?.avatar_url || ''} alt={userName} />
              <AvatarFallback className="bg-primary/10">
                <User className="w-7 h-7 text-primary" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-3">
              <div>
                <p className="font-semibold text-lg">{userName}</p>
                {order.buyer?.phone && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                    <Phone className="w-3.5 h-3.5" />
                    {order.buyer.phone}
                  </p>
                )}
              </div>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Package className="w-4 h-4" />
                <span>Commandé le {new Date(order.created_at).toLocaleDateString('fr-FR', { 
                  day: 'numeric', 
                  month: 'long', 
                  year: 'numeric' 
                })}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Informations de livraison */}
        {(order.delivery_address || order.delivery_city || order.delivery_phone) && (
          <div className="p-4 bg-background rounded-xl border shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="w-5 h-5 text-primary" />
              <p className="font-semibold text-base">Adresse de livraison</p>
            </div>
            <div className="space-y-1 text-sm pl-7">
              {order.delivery_address && <p>{order.delivery_address}</p>}
              {(order.delivery_city || order.delivery_postal_code) && (
                <p>{order.delivery_postal_code} {order.delivery_city}</p>
              )}
              {order.delivery_phone && (
                <p className="flex items-center gap-1 mt-2 text-muted-foreground">
                  <Phone className="w-3.5 h-3.5" />
                  {order.delivery_phone}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Articles commandés */}
        {orderItems && orderItems.length > 0 && (
          <div className="p-4 bg-background rounded-xl border shadow-sm">
            <p className="font-semibold text-base mb-4">Articles commandés</p>
            <div className="space-y-4">
              {orderItems.map((item: any) => (
                <div key={item.id} className="flex items-start gap-4 pb-4 border-b last:border-b-0 last:pb-0">
                  {/* Image du produit */}
                  <div className="w-20 h-20 rounded-lg overflow-hidden border bg-muted flex-shrink-0">
                    {item.product?.images?.[0] ? (
                      <img 
                        src={item.product.images[0]} 
                        alt={item.product?.name || 'Produit'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  
                  {/* Détails du produit */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-base mb-1">{item.product?.name || 'Produit'}</p>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
                      <span className="font-medium">Qté: {item.quantity}</span>
                      {item.selected_size && <span>• Taille: {item.selected_size}</span>}
                      {item.selected_color && <span>• Couleur: {item.selected_color}</span>}
                    </div>
                  </div>
                  
                  {/* Prix */}
                  <p className="font-bold text-lg text-primary whitespace-nowrap">{(item.unit_price * item.quantity).toLocaleString()} F</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Note de l'acheteur */}
        {order.buyer_notes && (
          <div className="p-4 bg-muted/50 rounded-xl border-l-4 border-l-primary">
            <p className="font-semibold text-sm mb-1">Note du client :</p>
            <p className="text-sm text-muted-foreground italic">{order.buyer_notes}</p>
          </div>
        )}

        {/* Montant total */}
        <div className="p-5 bg-primary/5 rounded-xl border-2 border-primary/20">
          <div className="flex items-center justify-between">
            <p className="text-lg font-semibold">Montant total</p>
            <p className="text-3xl font-bold text-primary">{order.total_amount.toLocaleString()} F</p>
          </div>
        </div>

        {/* Boutons d'action */}
        {!isProcessed && (
          <div className="flex gap-3 pt-2">
            <Button 
              onClick={() => updateOrderMutation.mutate('approved')} 
              disabled={updateOrderMutation.isPending}
              className="flex-1 h-12 text-base font-semibold"
              size="lg"
            >
              <CheckCircle className="w-5 h-5 mr-2" />
              Approuver la commande
            </Button>
            <Button 
              onClick={() => updateOrderMutation.mutate('rejected')} 
              disabled={updateOrderMutation.isPending}
              variant="destructive"
              className="flex-1 h-12 text-base font-semibold"
              size="lg"
            >
              <XCircle className="w-5 h-5 mr-2" />
              Rejeter
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default OrderNotificationCard;
