/**
 * Panneau admin pour gérer les commandes marketplace, litiges et commission
 */
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Settings, ShieldCheck, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  useAdminMarketplaceOrders,
  useMarketplaceCommissionSettings,
  useUpdateMarketplaceCommission,
  useResolveDispute,
} from '../hooks/useMarketplaceOrders';

const AdminMarketplaceManagement: React.FC = () => {
  const { data: orders = [], isLoading } = useAdminMarketplaceOrders();
  const { data: settings } = useMarketplaceCommissionSettings();
  const { mutate: updateSettings, isPending: saving } = useUpdateMarketplaceCommission();
  const { mutate: resolveDispute, isPending: resolving } = useResolveDispute();

  const [commissionRate, setCommissionRate] = useState(5);
  const [autoReleaseDays, setAutoReleaseDays] = useState(7);
  const [minOrderAmount, setMinOrderAmount] = useState(100);

  const [resolveDialog, setResolveDialog] = useState<any>(null);
  const [adminNotes, setAdminNotes] = useState('');

  useEffect(() => {
    if (settings) {
      setCommissionRate(settings.commission_rate);
      setAutoReleaseDays(settings.auto_release_days);
      setMinOrderAmount(settings.min_order_amount);
    }
  }, [settings]);

  const disputedOrders = orders.filter((o: any) => o.status === 'disputed');
  const resolvedDisputeOrders = orders.filter((o: any) =>
    ['refunded', 'completed'].includes(o.status) && o.disputes?.some((d: any) => d.admin_decision),
  );
  const totalRevenue = orders
    .filter((o: any) => o.status === 'completed')
    .reduce((sum: number, o: any) => sum + Number(o.commission_amount || 0), 0);

  const handleSave = () => {
    updateSettings({ commission_rate: commissionRate, auto_release_days: autoReleaseDays, min_order_amount: minOrderAmount });
  };

  const handleResolve = (resolution: 'refund' | 'release') => {
    if (!resolveDialog) return;
    const dispute = resolveDialog.disputes?.[0];
    if (!dispute) return;
    resolveDispute({
      disputeId: dispute.id,
      orderId: resolveDialog.id,
      resolution,
      adminNotes: adminNotes.trim() || undefined,
    }, {
      onSuccess: () => {
        setResolveDialog(null);
        setAdminNotes('');
      },
    });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Marketplace — Commissions & Litiges</h2>

      {/* Config */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Settings size={18} /> Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Commission (%)</Label>
              <Input type="number" min={0} max={50} value={commissionRate} onChange={(e) => setCommissionRate(Number(e.target.value))} />
            </div>
            <div>
              <Label>Libération auto (jours)</Label>
              <Input type="number" min={1} max={30} value={autoReleaseDays} onChange={(e) => setAutoReleaseDays(Number(e.target.value))} />
            </div>
            <div>
              <Label>Montant min commande (FCFA)</Label>
              <Input type="number" min={0} value={minOrderAmount} onChange={(e) => setMinOrderAmount(Number(e.target.value))} />
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Enregistrement...' : 'Enregistrer'}</Button>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{orders.length}</p>
            <p className="text-sm text-muted-foreground">Commandes totales</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{disputedOrders.length}</p>
            <p className="text-sm text-muted-foreground">Litiges en cours</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{totalRevenue} SC</p>
            <p className="text-sm text-muted-foreground">Commissions gagnées</p>
          </CardContent>
        </Card>
      </div>

      {/* Litiges */}
      {disputedOrders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-red-600">
              <AlertTriangle size={18} /> Litiges à résoudre ({disputedOrders.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {disputedOrders.map((order: any) => (
              <div key={order.id} className="border rounded-lg p-4 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{order.product?.title}</p>
                    <p className="text-sm text-muted-foreground">
                      Acheteur: {order.buyer?.first_name} {order.buyer?.last_name} · 
                      Vendeur: {order.seller?.first_name} {order.seller?.last_name}
                    </p>
                    <p className="text-sm font-bold text-emerald-700">{order.sc_amount} SC</p>
                    {order.disputes?.[0] && (
                      <p className="text-sm text-red-600 mt-1">
                        Raison: {order.disputes[0].reason}
                      </p>
                    )}
                  </div>
                  <Button size="sm" onClick={() => setResolveDialog(order)}>Résoudre</Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Historique des litiges résolus */}
      {resolvedDisputeOrders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-muted-foreground">
              <ShieldCheck size={18} /> Litiges résolus ({resolvedDisputeOrders.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {resolvedDisputeOrders.map((order: any) => {
              const dispute = order.disputes?.find((d: any) => d.admin_decision);
              const isRefund = dispute?.admin_decision === 'refund';
              return (
                <div key={order.id} className="border rounded-lg p-4 space-y-1 opacity-80">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-sm">{order.product?.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Acheteur: {order.buyer?.first_name} {order.buyer?.last_name} · 
                        Vendeur: {order.seller?.first_name} {order.seller?.last_name}
                      </p>
                      <p className="text-sm font-bold text-emerald-700">{order.sc_amount} SC</p>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${isRefund ? 'bg-gray-100 text-gray-700' : 'bg-green-100 text-green-700'}`}>
                      {isRefund ? 'Remboursé' : 'Payé vendeur'}
                    </span>
                  </div>
                  {dispute?.admin_notes && (
                    <p className="text-xs text-muted-foreground mt-1">
                      <span className="font-medium">Note admin :</span> {dispute.admin_notes}
                    </p>
                  )}
                  {dispute?.resolved_at && (
                    <p className="text-xs text-muted-foreground">
                      Résolu le {new Date(dispute.resolved_at).toLocaleDateString('fr-FR')}
                    </p>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Dialog résolution */}
      <Dialog open={!!resolveDialog} onOpenChange={(open) => !open && setResolveDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Résoudre le litige</DialogTitle>
          </DialogHeader>
          {resolveDialog && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
                <p><strong>Produit :</strong> {resolveDialog.product?.title}</p>
                <p><strong>Montant :</strong> {resolveDialog.sc_amount} SC</p>
                <p><strong>Raison :</strong> {resolveDialog.disputes?.[0]?.reason}</p>
                {resolveDialog.disputes?.[0]?.description && (
                  <p><strong>Description :</strong> {resolveDialog.disputes[0].description}</p>
                )}
              </div>
              <div>
                <Label>Notes de l'administrateur</Label>
                <Textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} rows={2} />
              </div>
              <div className="flex gap-3">
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => handleResolve('refund')}
                  disabled={resolving}
                >
                  <XCircle size={16} className="mr-1" /> Rembourser l'acheteur
                </Button>
                <Button
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => handleResolve('release')}
                  disabled={resolving}
                >
                  <CheckCircle size={16} className="mr-1" /> Payer le vendeur
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminMarketplaceManagement;
