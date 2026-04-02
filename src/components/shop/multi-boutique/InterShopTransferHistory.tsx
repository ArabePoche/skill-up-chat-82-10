/**
 * Historique des transferts entre boutiques
 */
import React, { useState } from 'react';
import { ArrowRight, Package, Clock, CheckCircle, XCircle, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useInterShopTransfers, useCompleteInterShopTransfer, useCancelInterShopTransfer } from '@/hooks/shop/useInterShopTransfers';
import { useUserShops } from '@/hooks/shop/useMultiShop';
import CreateTransferDialog from './CreateTransferDialog';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const InterShopTransferHistory: React.FC = () => {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  
  const { data: transfers = [], isLoading } = useInterShopTransfers();
  const { data: shops = [] } = useUserShops();
  const completeTransfer = useCompleteInterShopTransfer();
  const cancelTransfer = useCancelInterShopTransfer();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="text-orange-600 bg-orange-50"><Clock size={12} className="mr-1" />En attente</Badge>;
      case 'completed':
        return <Badge variant="secondary" className="text-green-600 bg-green-50"><CheckCircle size={12} className="mr-1" />Terminé</Badge>;
      case 'cancelled':
        return <Badge variant="secondary" className="text-red-600 bg-red-50"><XCircle size={12} className="mr-1" />Annulé</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Transferts entre boutiques</h3>
          <p className="text-sm text-muted-foreground">
            Historique des mouvements de stock entre vos boutiques
          </p>
        </div>
        {shops.length >= 2 && (
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus size={16} className="mr-2" />
            Nouveau transfert
          </Button>
        )}
      </div>

      {/* Liste des transferts */}
      {transfers.length === 0 ? (
        <div className="text-center py-16">
          <Package size={48} className="mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground mb-4">Aucun transfert effectué</p>
          {shops.length >= 2 ? (
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus size={16} className="mr-2" />
              Créer un transfert
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">
              Vous avez besoin d'au moins 2 boutiques pour effectuer des transferts
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {transfers.map(transfer => (
            <div key={transfer.id} className="bg-card border rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {getStatusBadge(transfer.status)}
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(transfer.created_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                        <Package size={12} className="text-blue-600" />
                      </div>
                      <span className="font-medium">{transfer.from_shop?.name}</span>
                    </div>
                    
                    <ArrowRight size={16} className="text-muted-foreground" />
                    
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center">
                        <Package size={12} className="text-emerald-600" />
                      </div>
                      <span className="font-medium">{transfer.to_shop?.name}</span>
                    </div>
                  </div>
                </div>

                {transfer.status === 'pending' && (
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => cancelTransfer.mutate(transfer.id)}
                      disabled={cancelTransfer.isPending}
                    >
                      Annuler
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => completeTransfer.mutate(transfer.id)}
                      disabled={completeTransfer.isPending}
                    >
                      Confirmer
                    </Button>
                  </div>
                )}
              </div>

              <div className="bg-muted/30 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {transfer.product?.image_url && (
                      <img
                        src={transfer.product.image_url}
                        alt={transfer.product.name}
                        className="w-10 h-10 object-cover rounded"
                      />
                    )}
                    <div>
                      <p className="font-medium text-sm">{transfer.product?.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Quantité: {transfer.quantity} unité(s)
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {((transfer.product?.price || 0) * transfer.quantity).toFixed(2)}€
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {transfer.product?.price?.toFixed(2)}€ / unité
                    </p>
                  </div>
                </div>

                {transfer.delivered_by && (
                  <div className="mt-2 pt-2 border-t border-border/50 text-xs text-orange-600 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-slate-700">Livreur : </span>
                      {transfer.delivered_by}
                    </div>
                  </div>
                )}

                {transfer.notes && (
                  <div className="mt-2 pt-2 border-t border-border/50">
                    <p className="text-xs text-muted-foreground">
                      <strong>Note:</strong> {transfer.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <CreateTransferDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />
    </div>
  );
};

export default InterShopTransferHistory;