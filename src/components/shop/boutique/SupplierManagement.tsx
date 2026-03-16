/**
 * Gestion des fournisseurs : liste, ajout, commandes, historique d'approvisionnement
 * Intégré dans l'onglet "Fournisseurs" de BoutiqueManagement
 */
import React, { useState, useMemo } from 'react';
import { Plus, Truck, Package, Phone, Mail, MapPin, ChevronRight, Search, X, Check, Clock, XCircle, FileText, Edit2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useSuppliers, useSupplierOrders, type Supplier, type SupplierOrder } from '@/hooks/shop/useSuppliers';
import { useBoutiqueProducts, type BoutiqueProduct } from '@/hooks/shop/useBoutiqueProducts';

interface SupplierManagementProps {
  shopId: string;
}

const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  draft: { label: 'Brouillon', color: 'bg-muted text-muted-foreground', icon: <FileText size={12} /> },
  ordered: { label: 'Commandée', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300', icon: <Clock size={12} /> },
  received: { label: 'Reçue', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300', icon: <Check size={12} /> },
  cancelled: { label: 'Annulée', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300', icon: <XCircle size={12} /> },
};

const SupplierManagement: React.FC<SupplierManagementProps> = ({ shopId }) => {
  const { suppliers, isLoading, createSupplier, updateSupplier, deleteSupplier } = useSuppliers(shopId);
  const { orders, isLoading: ordersLoading, createOrder, receiveOrder, cancelOrder } = useSupplierOrders(shopId);
  const { data: products } = useBoutiqueProducts(shopId);

  // UI States
  const [activeTab, setActiveTab] = useState<'suppliers' | 'orders'>('suppliers');
  const [search, setSearch] = useState('');
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<SupplierOrder | null>(null);

  // Supplier form
  const [formName, setFormName] = useState('');
  const [formContact, setFormContact] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // Order form
  const [orderSupplierId, setOrderSupplierId] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [orderItems, setOrderItems] = useState<Array<{ product_id?: string; product_name: string; quantity: number; unit_price: number }>>([]);

  const filteredSuppliers = useMemo(() => {
    if (!search) return suppliers;
    const q = search.toLowerCase();
    return suppliers.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.contact_name?.toLowerCase().includes(q) ||
      s.phone?.includes(q)
    );
  }, [suppliers, search]);

  const resetSupplierForm = () => {
    setFormName(''); setFormContact(''); setFormPhone(''); setFormEmail('');
    setFormAddress(''); setFormNotes(''); setEditingSupplier(null);
  };

  const openEditSupplier = (s: Supplier) => {
    setEditingSupplier(s);
    setFormName(s.name);
    setFormContact(s.contact_name || '');
    setFormPhone(s.phone || '');
    setFormEmail(s.email || '');
    setFormAddress(s.address || '');
    setFormNotes(s.notes || '');
    setShowSupplierForm(true);
  };

  const handleSaveSupplier = async () => {
    if (!formName.trim()) return;
    const payload = {
      name: formName.trim(),
      contact_name: formContact.trim() || undefined,
      phone: formPhone.trim() || undefined,
      email: formEmail.trim() || undefined,
      address: formAddress.trim() || undefined,
      notes: formNotes.trim() || undefined,
    };
    if (editingSupplier) {
      await updateSupplier.mutateAsync({ id: editingSupplier.id, ...payload });
    } else {
      await createSupplier.mutateAsync(payload);
    }
    setShowSupplierForm(false);
    resetSupplierForm();
  };

  const handleDeleteSupplier = async () => {
    if (!deletingId) return;
    await deleteSupplier.mutateAsync(deletingId);
    setDeletingId(null);
  };

  // ─── Order form helpers ────────────────────────────────────────
  const resetOrderForm = () => {
    setOrderSupplierId(''); setOrderNotes(''); setOrderItems([]);
  };

  const addOrderItem = () => {
    setOrderItems(prev => [...prev, { product_name: '', quantity: 1, unit_price: 0 }]);
  };

  const updateOrderItem = (idx: number, field: string, value: any) => {
    setOrderItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const removeOrderItem = (idx: number) => {
    setOrderItems(prev => prev.filter((_, i) => i !== idx));
  };

  const selectProduct = (idx: number, productId: string) => {
    const product = products?.find(p => p.id === productId);
    if (product) {
      updateOrderItem(idx, 'product_id', productId);
      updateOrderItem(idx, 'product_name', product.name);
      updateOrderItem(idx, 'unit_price', product.cost_price || product.price);
    }
  };

  const handleCreateOrder = async () => {
    if (!orderSupplierId || orderItems.length === 0) return;
    const validItems = orderItems.filter(i => i.product_name.trim() && i.quantity > 0);
    if (validItems.length === 0) return;
    await createOrder.mutateAsync({
      supplier_id: orderSupplierId,
      notes: orderNotes.trim() || undefined,
      items: validItems,
    });
    setShowOrderForm(false);
    resetOrderForm();
  };

  const handleReceiveOrder = async (order: SupplierOrder) => {
    if (!order.items) return;
    await receiveOrder.mutateAsync({
      orderId: order.id,
      receivedItems: order.items.map(i => ({
        itemId: i.id,
        receivedQuantity: i.quantity,
        productId: i.product_id,
      })),
    });
    setSelectedOrder(null);
  };

  const orderTotal = useMemo(() =>
    orderItems.reduce((sum, i) => sum + i.quantity * i.unit_price, 0),
    [orderItems]
  );

  return (
    <div className="pb-20">
      {/* Tabs */}
      <div className="flex bg-muted/50 border-b border-border">
        <button
          onClick={() => setActiveTab('suppliers')}
          className={`flex-1 py-3 text-sm font-medium text-center transition-colors ${activeTab === 'suppliers' ? 'bg-background text-foreground border-b-2 border-primary' : 'text-muted-foreground'}`}
        >
          <Truck size={14} className="inline mr-1.5" />
          Fournisseurs ({suppliers.length})
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`flex-1 py-3 text-sm font-medium text-center transition-colors ${activeTab === 'orders' ? 'bg-background text-foreground border-b-2 border-primary' : 'text-muted-foreground'}`}
        >
          <Package size={14} className="inline mr-1.5" />
          Commandes ({orders.length})
        </button>
      </div>

      {/* ─── TAB: Fournisseurs ──────────────────────────────────── */}
      {activeTab === 'suppliers' && (
        <div className="p-3 space-y-3">
          {/* Search + Add */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..." className="pl-9 h-9" />
            </div>
            <Button size="sm" onClick={() => { resetSupplierForm(); setShowSupplierForm(true); }} className="gap-1">
              <Plus size={14} /> Ajouter
            </Button>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>
          ) : filteredSuppliers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Truck size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">Aucun fournisseur</p>
              <p className="text-xs mt-1">Ajoutez vos fournisseurs pour gérer vos approvisionnements</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredSuppliers.map(supplier => (
                <div key={supplier.id} className="bg-card border border-border rounded-xl p-3 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-sm text-foreground">{supplier.name}</h3>
                      {supplier.contact_name && <p className="text-xs text-muted-foreground">{supplier.contact_name}</p>}
                    </div>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEditSupplier(supplier)}>
                        <Edit2 size={13} />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeletingId(supplier.id)}>
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {supplier.phone && <span className="flex items-center gap-1"><Phone size={11} />{supplier.phone}</span>}
                    {supplier.email && <span className="flex items-center gap-1"><Mail size={11} />{supplier.email}</span>}
                    {supplier.address && <span className="flex items-center gap-1"><MapPin size={11} />{supplier.address}</span>}
                  </div>
                  {supplier.notes && <p className="text-xs text-muted-foreground italic">{supplier.notes}</p>}
                  {/* Résumé des commandes pour ce fournisseur */}
                  {(() => {
                    const supplierOrders = orders.filter(o => o.supplier_id === supplier.id);
                    if (supplierOrders.length === 0) return null;
                    return (
                      <div className="flex gap-2 text-xs pt-1">
                        <span className="text-muted-foreground">{supplierOrders.length} commande(s)</span>
                        <span className="text-emerald-600 font-medium">
                          {Math.round(supplierOrders.reduce((s, o) => s + o.total_amount, 0)).toLocaleString()} FCFA
                        </span>
                      </div>
                    );
                  })()}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB: Commandes ─────────────────────────────────────── */}
      {activeTab === 'orders' && (
        <div className="p-3 space-y-3">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => { resetOrderForm(); addOrderItem(); setShowOrderForm(true); }} className="gap-1" disabled={suppliers.length === 0}>
              <Plus size={14} /> Nouvelle commande
            </Button>
          </div>

          {suppliers.length === 0 && (
            <div className="text-center py-6 text-muted-foreground text-sm">
              Ajoutez d'abord un fournisseur dans l'onglet "Fournisseurs"
            </div>
          )}

          {ordersLoading ? (
            <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">Aucune commande</p>
              <p className="text-xs mt-1">Créez votre première commande fournisseur</p>
            </div>
          ) : (
            <div className="space-y-2">
              {orders.map(order => {
                const st = STATUS_MAP[order.status] || STATUS_MAP.draft;
                return (
                  <div
                    key={order.id}
                    className="bg-card border border-border rounded-xl p-3 cursor-pointer hover:border-primary/30 transition-colors"
                    onClick={() => setSelectedOrder(order)}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div>
                        <span className="text-xs font-mono text-muted-foreground">{order.order_number}</span>
                        <h4 className="font-semibold text-sm text-foreground">{order.supplier?.name || 'Fournisseur'}</h4>
                      </div>
                      <Badge className={`${st.color} gap-1 text-[10px]`}>{st.icon}{st.label}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{order.items?.length || 0} article(s)</span>
                      <span className="font-semibold text-foreground">{Math.round(order.total_amount).toLocaleString()} FCFA</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-1">
                      {order.ordered_at && `Commandée le ${new Date(order.ordered_at).toLocaleDateString('fr-FR')}`}
                      {order.received_at && ` • Reçue le ${new Date(order.received_at).toLocaleDateString('fr-FR')}`}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── Dialog: Formulaire Fournisseur ─────────────────────── */}
      <Dialog open={showSupplierForm} onOpenChange={(o) => { if (!o) { setShowSupplierForm(false); resetSupplierForm(); } }}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingSupplier ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Nom *</Label><Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Nom du fournisseur" className="mt-1" /></div>
            <div><Label>Contact</Label><Input value={formContact} onChange={e => setFormContact(e.target.value)} placeholder="Nom du contact" className="mt-1" /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Téléphone</Label><Input value={formPhone} onChange={e => setFormPhone(e.target.value)} placeholder="+221..." className="mt-1" /></div>
              <div><Label>Email</Label><Input value={formEmail} onChange={e => setFormEmail(e.target.value)} placeholder="email@..." className="mt-1" /></div>
            </div>
            <div><Label>Adresse</Label><Input value={formAddress} onChange={e => setFormAddress(e.target.value)} placeholder="Adresse" className="mt-1" /></div>
            <div><Label>Notes</Label><Textarea value={formNotes} onChange={e => setFormNotes(e.target.value)} placeholder="Notes..." className="mt-1" rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowSupplierForm(false); resetSupplierForm(); }}>Annuler</Button>
            <Button onClick={handleSaveSupplier} disabled={!formName.trim() || createSupplier.isPending || updateSupplier.isPending}>
              {editingSupplier ? 'Modifier' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Dialog: Nouvelle commande ──────────────────────────── */}
      <Dialog open={showOrderForm} onOpenChange={(o) => { if (!o) { setShowOrderForm(false); resetOrderForm(); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nouvelle commande fournisseur</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Fournisseur */}
            <div>
              <Label>Fournisseur *</Label>
              <select
                value={orderSupplierId}
                onChange={e => setOrderSupplierId(e.target.value)}
                className="w-full mt-1 border border-input rounded-md px-3 py-2 text-sm bg-background"
              >
                <option value="">Choisir un fournisseur</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            {/* Articles */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Articles</Label>
                <Button size="sm" variant="outline" onClick={addOrderItem} className="h-7 text-xs gap-1">
                  <Plus size={12} /> Ajouter
                </Button>
              </div>
              <div className="space-y-2">
                {orderItems.map((item, idx) => (
                  <div key={idx} className="flex gap-2 items-end bg-muted/30 p-2 rounded-lg">
                    <div className="flex-1 space-y-1">
                      <select
                        value={item.product_id || ''}
                        onChange={e => {
                          if (e.target.value) selectProduct(idx, e.target.value);
                        }}
                        className="w-full border border-input rounded-md px-2 py-1.5 text-xs bg-background"
                      >
                        <option value="">Produit existant (optionnel)</option>
                        {products?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                      <Input
                        value={item.product_name}
                        onChange={e => updateOrderItem(idx, 'product_name', e.target.value)}
                        placeholder="Nom du produit"
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="w-16">
                      <Label className="text-[10px]">Qté</Label>
                      <Input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={e => updateOrderItem(idx, 'quantity', parseInt(e.target.value) || 1)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="w-24">
                      <Label className="text-[10px]">Prix unit.</Label>
                      <Input
                        type="number"
                        min={0}
                        value={item.unit_price}
                        onChange={e => updateOrderItem(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive shrink-0" onClick={() => removeOrderItem(idx)}>
                      <X size={14} />
                    </Button>
                  </div>
                ))}
              </div>
              {orderItems.length > 0 && (
                <div className="text-right mt-2 font-semibold text-sm">
                  Total: {Math.round(orderTotal).toLocaleString()} FCFA
                </div>
              )}
            </div>

            <div><Label>Notes</Label><Textarea value={orderNotes} onChange={e => setOrderNotes(e.target.value)} placeholder="Notes..." className="mt-1" rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowOrderForm(false); resetOrderForm(); }}>Annuler</Button>
            <Button onClick={handleCreateOrder} disabled={!orderSupplierId || orderItems.length === 0 || createOrder.isPending}>
              Créer la commande
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Dialog: Détail commande ────────────────────────────── */}
      <Dialog open={!!selectedOrder} onOpenChange={(o) => { if (!o) setSelectedOrder(null); }}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          {selectedOrder && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
                  <span>Commande {selectedOrder.order_number}</span>
                  {(() => {
                    const st = STATUS_MAP[selectedOrder.status] || STATUS_MAP.draft;
                    return <Badge className={`${st.color} gap-1 text-xs`}>{st.icon}{st.label}</Badge>;
                  })()}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="text-sm">
                  <span className="text-muted-foreground">Fournisseur: </span>
                  <span className="font-medium">{selectedOrder.supplier?.name || '—'}</span>
                </div>
                {selectedOrder.notes && <p className="text-xs text-muted-foreground italic">{selectedOrder.notes}</p>}

                <div className="border border-border rounded-lg overflow-hidden">
                  <div className="bg-muted/50 px-3 py-2 text-xs font-medium text-muted-foreground grid grid-cols-[1fr_50px_70px]">
                    <span>Article</span><span className="text-right">Qté</span><span className="text-right">Montant</span>
                  </div>
                  {selectedOrder.items?.map(item => (
                    <div key={item.id} className="px-3 py-2 text-sm border-t border-border grid grid-cols-[1fr_50px_70px] items-center">
                      <span className="truncate">{item.product_name}</span>
                      <span className="text-right text-muted-foreground">{item.quantity}</span>
                      <span className="text-right font-medium">{Math.round(item.quantity * item.unit_price).toLocaleString()}</span>
                    </div>
                  ))}
                  <div className="px-3 py-2 border-t border-border bg-muted/30 grid grid-cols-[1fr_120px] text-sm">
                    <span className="font-semibold">Total</span>
                    <span className="text-right font-bold">{Math.round(selectedOrder.total_amount).toLocaleString()} FCFA</span>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground space-y-0.5">
                  {selectedOrder.ordered_at && <p>Commandée le {new Date(selectedOrder.ordered_at).toLocaleDateString('fr-FR')}</p>}
                  {selectedOrder.received_at && <p>Reçue le {new Date(selectedOrder.received_at).toLocaleDateString('fr-FR')}</p>}
                </div>
              </div>
              <DialogFooter className="gap-2">
                {selectedOrder.status === 'ordered' && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => { cancelOrder.mutateAsync(selectedOrder.id); setSelectedOrder(null); }}>
                      Annuler
                    </Button>
                    <Button size="sm" className="gap-1" onClick={() => handleReceiveOrder(selectedOrder)}>
                      <Check size={14} /> Réceptionner
                    </Button>
                  </>
                )}
                <Button variant="ghost" size="sm" onClick={() => setSelectedOrder(null)}>Fermer</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Alert: Suppression fournisseur ─────────────────────── */}
      <AlertDialog open={!!deletingId} onOpenChange={(o) => { if (!o) setDeletingId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce fournisseur ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible. Les commandes associées seront conservées.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSupplier} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SupplierManagement;
