/**
 * Écran de suivi des commandes marketplace
 * Permet à l'acheteur de confirmer la réception ou ouvrir un litige,
 * et au vendeur de marquer l'expédition ou consulter l'état de ses ventes.
 */
import React, { useState } from 'react';
import { ArrowLeft, Package, CheckCircle, AlertTriangle, Clock, XCircle, ShieldCheck, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';
import { useMyMarketplaceOrders, useConfirmReception, useOpenDispute, useMarkOrderShipped } from '../hooks/useMarketplaceOrders';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  paid: { label: 'Payé (en séquestre)', color: 'bg-blue-100 text-blue-800', icon: ShieldCheck },
  shipped: { label: 'Expédié', color: 'bg-indigo-100 text-indigo-800', icon: Package },
  delivered: { label: 'Livré', color: 'bg-purple-100 text-purple-800', icon: Package },
  confirmed: { label: 'Confirmé', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  completed: { label: 'Terminé', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  disputed: { label: 'Litige', color: 'bg-red-100 text-red-800', icon: AlertTriangle },
  refunded: { label: 'Remboursé', color: 'bg-gray-100 text-gray-800', icon: XCircle },
};

const MyOrdersScreen: React.FC = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState('buyer');
  const { data: buyerOrders = [], isLoading: buyerLoading } = useMyMarketplaceOrders('buyer');
  const { data: sellerOrders = [], isLoading: sellerLoading } = useMyMarketplaceOrders('seller');
  const { mutate: confirmReception, isPending: confirming } = useConfirmReception();
  const { mutate: openDispute, isPending: disputing } = useOpenDispute();
  const { mutate: markShipped, isPending: shipping } = useMarkOrderShipped();

  const [disputeDialog, setDisputeDialog] = useState<{ orderId: string } | null>(null);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeDescription, setDisputeDescription] = useState('');

  const [shippingDialog, setShippingDialog] = useState<{ orderId: string } | null>(null);
  const [trackingNumber, setTrackingNumber] = useState('');

  const handleDispute = () => {
    if (!disputeDialog || !disputeReason.trim()) return;
    openDispute({
      orderId: disputeDialog.orderId,
      reason: disputeReason.trim(),
      description: disputeDescription.trim() || undefined,
    }, {
      onSuccess: () => {
        setDisputeDialog(null);
        setDisputeReason('');
        setDisputeDescription('');
      },
    });
  };

  const handleMarkShipped = () => {
    if (!shippingDialog || !trackingNumber.trim()) return;
    markShipped({ orderId: shippingDialog.orderId, trackingNumber }, {
      onSuccess: () => {
        setShippingDialog(null);
        setTrackingNumber('');
      },
    });
  };

  const orders = tab === 'buyer' ? buyerOrders : sellerOrders;
  const loading = tab === 'buyer' ? buyerLoading : sellerLoading;

  const renderOrder = (order: any) => {
    const config = statusConfig[order.status] || statusConfig.pending;
    const StatusIcon = config.icon;
    const canConfirm = tab === 'buyer' && ['paid', 'shipped', 'delivered'].includes(order.status);
    const canDispute = tab === 'buyer' && ['paid', 'shipped', 'delivered'].includes(order.status);
    const canMarkShipped = tab === 'seller' && ['paid', 'shipped'].includes(order.status);
    const sellerHasDispute = tab === 'seller' && order.status === 'disputed';

    return (
      <Card key={order.id} className="mb-3">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
              {order.product?.image_url ? (
                <img src={order.product.image_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">Image</div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm line-clamp-1">{order.product?.title || 'Produit'}</p>
              <p className="text-xs text-muted-foreground">
                {tab === 'buyer' ? `Vendeur: ${order.seller?.first_name || ''} ${order.seller?.last_name || ''}` : `Acheteur: ${order.buyer?.first_name || ''} ${order.buyer?.last_name || ''}`}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={`${config.color} text-xs`}>
                  <StatusIcon size={12} className="mr-1" />
                  {config.label}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(order.created_at), 'dd MMM yyyy', { locale: fr })}
                </span>
              </div>
              <p className="text-sm font-bold text-emerald-700 mt-1">{order.sc_amount} SC</p>
              {tab === 'seller' && ['paid', 'shipped', 'delivered'].includes(order.status) && (
                <p className="text-xs text-amber-600 mt-1">
                  <span aria-hidden="true">🔒</span>
                  <span className="sr-only">Séquestre :</span>
                  {' '}{order.seller_amount} SC en attente de confirmation
                </p>
              )}
              {order.tracking_number && (
                <p className="text-xs text-muted-foreground mt-1">
                  Suivi : {order.tracking_number}
                </p>
              )}
            </div>
          </div>

          {canConfirm && (
            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                onClick={() => confirmReception(order.id)}
                disabled={confirming}
              >
                <CheckCircle size={14} className="mr-1" />
                Confirmer réception
              </Button>
              {canDispute && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setDisputeDialog({ orderId: order.id })}
                >
                  <AlertTriangle size={14} className="mr-1" />
                  Litige
                </Button>
              )}
            </div>
          )}

          {canMarkShipped && (
            <div className="mt-3">
              <Button
                size="sm"
                className="w-full bg-indigo-600 hover:bg-indigo-700"
                onClick={() => setShippingDialog({ orderId: order.id })}
                disabled={shipping}
              >
                <Truck size={14} className="mr-1" />
                {order.status === 'shipped' ? 'Mettre à jour le suivi' : 'Marquer comme expédié'}
              </Button>
            </div>
          )}

          {sellerHasDispute && (
            <div className="mt-3 bg-red-50 rounded-lg p-3 text-xs text-red-800">
              <p className="font-semibold flex items-center gap-1">
                <AlertTriangle size={12} /> Litige en cours
              </p>
              <p className="mt-1">Un administrateur examine ce litige. Vous serez contacté.</p>
            </div>
          )}

          {/* Résultat d'un litige résolu (acheteur ou vendeur) */}
          {(() => {
            const resolvedDispute = order.disputes?.find(
              (d: any) => d.status === 'resolved_refund' || d.status === 'resolved_release',
            );
            if (!resolvedDispute) return null;
            const isRefund = resolvedDispute.status === 'resolved_refund';
            return (
              <div className={`mt-3 rounded-lg p-3 text-xs ${isRefund ? 'bg-gray-50 text-gray-800' : 'bg-green-50 text-green-800'}`}>
                <p className="font-semibold flex items-center gap-1">
                  {isRefund ? <XCircle size={12} /> : <CheckCircle size={12} />}
                  {isRefund ? 'Litige résolu — remboursement' : 'Litige résolu — paiement libéré'}
                </p>
                {resolvedDispute.admin_notes && (
                  <p className="mt-1"><span className="font-medium">Note admin :</span> {resolvedDispute.admin_notes}</p>
                )}
              </div>
            );
          })()}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background border-b px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
        </Button>
        <h1 className="font-bold text-lg">Mes Commandes</h1>
      </div>

      <div className="p-4">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full">
            <TabsTrigger value="buyer" className="flex-1">Mes achats</TabsTrigger>
            <TabsTrigger value="seller" className="flex-1">Mes ventes</TabsTrigger>
          </TabsList>

          <TabsContent value={tab} className="mt-4">
            {loading ? (
              <div className="text-center text-muted-foreground py-8">Chargement...</div>
            ) : orders.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <Package size={48} className="mx-auto mb-3 opacity-30" />
                <p>Aucune commande</p>
              </div>
            ) : (
              orders.map(renderOrder)
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialog expédition */}
      <Dialog open={!!shippingDialog} onOpenChange={(open) => !open && setShippingDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Marquer comme expédié</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Numéro de suivi *</Label>
              <Input
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="Ex: 1Z999AA10123456784"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShippingDialog(null)}>Annuler</Button>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700"
              onClick={handleMarkShipped}
              disabled={shipping || !trackingNumber.trim()}
            >
              {shipping ? 'Envoi...' : 'Confirmer expédition'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog litige */}
      <Dialog open={!!disputeDialog} onOpenChange={(open) => !open && setDisputeDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ouvrir un litige</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Raison du litige *</Label>
              <Input
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                placeholder="Ex: Produit non conforme, non reçu..."
              />
            </div>
            <div>
              <Label>Description détaillée</Label>
              <Textarea
                value={disputeDescription}
                onChange={(e) => setDisputeDescription(e.target.value)}
                placeholder="Décrivez le problème en détail..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisputeDialog(null)}>Annuler</Button>
            <Button variant="destructive" onClick={handleDispute} disabled={disputing || !disputeReason.trim()}>
              {disputing ? 'Envoi...' : 'Ouvrir le litige'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyOrdersScreen;
