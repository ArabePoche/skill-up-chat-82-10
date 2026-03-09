/**
 * Panneau des commandes marketplace reçues par la boutique
 * Permet au vendeur de voir, accepter ou refuser les commandes
 */
import React, { useState } from 'react';
import { Check, X, Package, Clock, ChevronDown, ChevronUp, MapPin, Phone, MessageSquare, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useShopOrders, type OrderWithDetails } from '@/hooks/shop/useShopOrders';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'En attente', variant: 'outline' },
  accepted: { label: 'Acceptée', variant: 'default' },
  rejected: { label: 'Refusée', variant: 'destructive' },
};

const ShopOrdersPanel: React.FC = () => {
  const { orders, isLoading, acceptOrder, rejectOrder, isAccepting, isRejecting } = useShopOrders();
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [rejectingOrderId, setRejectingOrderId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const handleReject = () => {
    if (!rejectingOrderId) return;
    rejectOrder({ orderId: rejectingOrderId, reason: rejectReason || undefined });
    setRejectingOrderId(null);
    setRejectReason('');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-16 px-4">
        <Package size={48} className="mx-auto text-muted-foreground/30 mb-4" />
        <p className="text-muted-foreground">Aucune commande reçue pour le moment</p>
        <p className="text-xs text-muted-foreground/60 mt-1">
          Les commandes de vos produits marketplace apparaîtront ici
        </p>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 space-y-3">
      {orders.map(order => {
        const isExpanded = expandedOrder === order.id;
        const config = statusConfig[order.status || 'pending'] || statusConfig.pending;
        const buyerName = order.buyer
          ? `${order.buyer.first_name || ''} ${order.buyer.last_name || ''}`.trim() || 'Client'
          : 'Client';

        return (
          <div
            key={order.id}
            className="border rounded-xl overflow-hidden bg-card shadow-sm"
          >
            {/* Header commande */}
            <button
              onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
              className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                <User size={18} className="text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm truncate">{buyerName}</span>
                  <Badge variant={config.variant} className="text-[10px] px-1.5 py-0">
                    {config.label}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                  <span className="font-semibold text-foreground">{Math.round(order.total_amount)}€</span>
                  <span>·</span>
                  <span>{order.items.length} article{order.items.length > 1 ? 's' : ''}</span>
                  <span>·</span>
                  <span>{order.created_at ? new Date(order.created_at).toLocaleDateString('fr-FR') : ''}</span>
                </div>
              </div>
              {isExpanded ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
            </button>

            {/* Détails de la commande */}
            {isExpanded && (
              <div className="border-t px-3 pb-3 space-y-3">
                {/* Articles */}
                <div className="pt-3 space-y-2">
                  {order.items.map(item => (
                    <div key={item.id} className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden shrink-0">
                        {item.product?.image_url ? (
                          <img src={item.product.image_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package size={16} className="text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.product?.name || 'Produit'}</p>
                        <div className="flex gap-2 text-xs text-muted-foreground">
                          <span>Qté: {item.quantity}</span>
                          <span>{Math.round(item.price)}€</span>
                          {item.selected_size && <span>Taille: {item.selected_size}</span>}
                          {item.selected_color && <span>Couleur: {item.selected_color}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Infos livraison */}
                {(order.delivery_address || order.delivery_phone || order.buyer_notes) && (
                  <div className="bg-muted/50 rounded-lg p-2.5 space-y-1.5 text-xs">
                    {order.delivery_address && (
                      <div className="flex items-start gap-1.5">
                        <MapPin size={12} className="text-muted-foreground mt-0.5 shrink-0" />
                        <span>{order.delivery_address}{order.delivery_city ? `, ${order.delivery_city}` : ''}</span>
                      </div>
                    )}
                    {order.delivery_phone && (
                      <div className="flex items-center gap-1.5">
                        <Phone size={12} className="text-muted-foreground shrink-0" />
                        <span>{order.delivery_phone}</span>
                      </div>
                    )}
                    {order.buyer_notes && order.status === 'pending' && (
                      <div className="flex items-start gap-1.5">
                        <MessageSquare size={12} className="text-muted-foreground mt-0.5 shrink-0" />
                        <span className="italic">{order.buyer_notes}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                {order.status === 'pending' && (
                  <div className="flex gap-2 pt-1">
                    <Button
                      onClick={() => acceptOrder(order.id)}
                      disabled={isAccepting}
                      size="sm"
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                    >
                      <Check size={14} />
                      Accepter
                    </Button>
                    <Button
                      onClick={() => setRejectingOrderId(order.id)}
                      disabled={isRejecting}
                      size="sm"
                      variant="destructive"
                      className="flex-1 gap-1.5"
                    >
                      <X size={14} />
                      Refuser
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Dialog de refus avec raison */}
      <AlertDialog open={!!rejectingOrderId} onOpenChange={(open) => !open && setRejectingOrderId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Refuser la commande</AlertDialogTitle>
            <AlertDialogDescription>
              Vous pouvez indiquer une raison de refus (optionnel).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Raison du refus (optionnel)..."
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              className="bg-destructive hover:bg-destructive/90"
            >
              Confirmer le refus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ShopOrdersPanel;
