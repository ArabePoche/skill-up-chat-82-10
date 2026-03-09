/**
 * Composant de gestion des clients de boutique
 * Historique d'achats, crédit/dette, fidélité
 */
import React, { useState } from 'react';
import { Users, Plus, Phone, Mail, MapPin, CreditCard, Star, ChevronRight, ArrowLeft, Receipt, TrendingUp, TrendingDown, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useShopCustomers,
  useCreateShopCustomer,
  useUpdateShopCustomer,
  useDeleteShopCustomer,
  useCustomerCredits,
  useAddCustomerCredit,
  useCustomerPurchases,
  getCustomerBalance,
  type ShopCustomer,
} from '@/hooks/shop/useShopCustomers';
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

interface CustomerManagementProps {
  shopId: string;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(amount);

const CustomerManagement: React.FC<CustomerManagementProps> = ({ shopId }) => {
  const { data: customers, isLoading } = useShopCustomers(shopId);
  const createCustomer = useCreateShopCustomer();
  const updateCustomer = useUpdateShopCustomer();
  const deleteCustomer = useDeleteShopCustomer();

  const [selectedCustomer, setSelectedCustomer] = useState<ShopCustomer | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<ShopCustomer | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Form state
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formNotes, setFormNotes] = useState('');

  const openNewForm = () => {
    setEditingCustomer(null);
    setFormName(''); setFormPhone(''); setFormEmail(''); setFormAddress(''); setFormNotes('');
    setShowForm(true);
  };

  const openEditForm = (c: ShopCustomer) => {
    setEditingCustomer(c);
    setFormName(c.name); setFormPhone(c.phone || ''); setFormEmail(c.email || '');
    setFormAddress(c.address || ''); setFormNotes(c.notes || '');
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) return;
    const data = {
      shop_id: shopId,
      name: formName.trim(),
      phone: formPhone.trim() || undefined,
      email: formEmail.trim() || undefined,
      address: formAddress.trim() || undefined,
      notes: formNotes.trim() || undefined,
    };
    if (editingCustomer) {
      await updateCustomer.mutateAsync({ id: editingCustomer.id, ...data });
    } else {
      await createCustomer.mutateAsync(data);
    }
    setShowForm(false);
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    await deleteCustomer.mutateAsync({ id: deletingId, shopId });
    setDeletingId(null);
    if (selectedCustomer?.id === deletingId) setSelectedCustomer(null);
  };

  const filtered = customers?.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.phone || '').includes(searchQuery)
  );

  // Vue détail client
  if (selectedCustomer) {
    return (
      <CustomerDetail
        customer={selectedCustomer}
        shopId={shopId}
        onBack={() => setSelectedCustomer(null)}
        onEdit={() => openEditForm(selectedCustomer)}
        onDelete={() => setDeletingId(selectedCustomer.id)}
      />
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Users size={20} className="text-primary" />
          Clients ({customers?.length || 0})
        </h2>
        <Button onClick={openNewForm} size="sm">
          <Plus size={16} className="mr-1" /> Nouveau client
        </Button>
      </div>

      {/* Recherche */}
      {customers && customers.length > 3 && (
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher un client..."
            className="pl-9"
          />
        </div>
      )}

      {/* Liste */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : filtered && filtered.length > 0 ? (
        <div className="space-y-2">
          {filtered.map(customer => (
            <Card
              key={customer.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setSelectedCustomer(customer)}
            >
              <CardContent className="p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                  {customer.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{customer.name}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {customer.phone && <span className="flex items-center gap-1"><Phone size={10} />{customer.phone}</span>}
                    <span>{customer.total_purchases} achats</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-primary">{formatCurrency(customer.total_spent)}</p>
                  {customer.loyalty_points > 0 && (
                    <Badge variant="secondary" className="text-[10px]">
                      <Star size={10} className="mr-0.5" />{customer.loyalty_points} pts
                    </Badge>
                  )}
                </div>
                <ChevronRight size={16} className="text-muted-foreground shrink-0" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Users size={48} className="mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground mb-4">Aucun client enregistré</p>
          <Button onClick={openNewForm}>
            <Plus size={16} className="mr-2" /> Ajouter un client
          </Button>
        </div>
      )}

      {/* Dialog formulaire */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCustomer ? 'Modifier le client' : 'Nouveau client'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Nom *</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Nom du client" />
            </div>
            <div>
              <Label>Téléphone</Label>
              <Input value={formPhone} onChange={(e) => setFormPhone(e.target.value)} placeholder="+223 XX XX XX XX" />
            </div>
            <div>
              <Label>Email</Label>
              <Input value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="email@example.com" type="email" />
            </div>
            <div>
              <Label>Adresse</Label>
              <Input value={formAddress} onChange={(e) => setFormAddress(e.target.value)} placeholder="Adresse" />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder="Notes sur le client" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={!formName.trim() || createCustomer.isPending || updateCustomer.isPending}>
              {(createCustomer.isPending || updateCustomer.isPending) ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog suppression */}
      <AlertDialog open={!!deletingId} onOpenChange={(o) => !o && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le client</AlertDialogTitle>
            <AlertDialogDescription>Cette action supprimera le client et tout son historique de crédit.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

/** Vue détail d'un client */
const CustomerDetail: React.FC<{
  customer: ShopCustomer;
  shopId: string;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
}> = ({ customer, shopId, onBack, onEdit, onDelete }) => {
  const { data: credits } = useCustomerCredits(customer.id);
  const { data: purchases } = useCustomerPurchases(customer.id, shopId);
  const addCredit = useAddCustomerCredit();

  const [showCreditForm, setShowCreditForm] = useState(false);
  const [creditAmount, setCreditAmount] = useState('');
  const [creditType, setCreditType] = useState<'credit' | 'payment'>('payment');
  const [creditDesc, setCreditDesc] = useState('');

  const balance = credits ? getCustomerBalance(credits) : 0;

  const handleAddCredit = async () => {
    const amount = parseFloat(creditAmount);
    if (!amount || amount <= 0) return;
    await addCredit.mutateAsync({
      customer_id: customer.id,
      shop_id: shopId,
      amount,
      type: creditType,
      description: creditDesc.trim() || undefined,
    });
    setShowCreditForm(false);
    setCreditAmount('');
    setCreditDesc('');
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft size={20} />
        </Button>
        <div className="flex-1">
          <h2 className="text-lg font-bold">{customer.name}</h2>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {customer.phone && <span className="flex items-center gap-1"><Phone size={10} />{customer.phone}</span>}
            {customer.email && <span className="flex items-center gap-1"><Mail size={10} />{customer.email}</span>}
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={onEdit}>Modifier</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-lg font-bold text-primary">{formatCurrency(customer.total_spent)}</p>
            <p className="text-[10px] text-muted-foreground">Total dépensé</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className={`text-lg font-bold ${balance > 0 ? 'text-destructive' : 'text-primary'}`}>
              {formatCurrency(Math.abs(balance))}
            </p>
            <p className="text-[10px] text-muted-foreground">{balance > 0 ? 'Doit' : 'Soldé'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-lg font-bold">{customer.loyalty_points}</p>
            <p className="text-[10px] text-muted-foreground">Points fidélité</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="purchases">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="purchases" className="text-xs">Achats</TabsTrigger>
          <TabsTrigger value="credits" className="text-xs">Crédit / Dette</TabsTrigger>
        </TabsList>

        <TabsContent value="purchases" className="space-y-2 mt-3">
          {purchases && purchases.length > 0 ? purchases.map((p: any) => (
            <Card key={p.id}>
              <CardContent className="p-3 flex items-center gap-3">
                <Receipt size={16} className="text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.physical_shop_products?.name || 'Produit'}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.quantity}x {formatCurrency(p.unit_price)} · {new Date(p.sold_at).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold">{formatCurrency(p.total_amount)}</p>
                  {p.cost_price > 0 && (
                    <p className="text-[10px] text-primary">+{formatCurrency(p.total_amount - (p.cost_price * p.quantity))}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )) : (
            <p className="text-center text-sm text-muted-foreground py-6">Aucun achat enregistré</p>
          )}
        </TabsContent>

        <TabsContent value="credits" className="space-y-3 mt-3">
          <Button onClick={() => setShowCreditForm(true)} size="sm" className="w-full">
            <Plus size={14} className="mr-1" /> Enregistrer un crédit ou paiement
          </Button>

          {credits && credits.length > 0 ? credits.map(c => (
            <Card key={c.id}>
              <CardContent className="p-3 flex items-center gap-3">
                {c.type === 'credit' ? (
                  <TrendingUp size={16} className="text-destructive shrink-0" />
                ) : (
                  <TrendingDown size={16} className="text-primary shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">
                    {c.type === 'credit' ? 'Crédit accordé' : 'Paiement reçu'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {c.description || '—'} · {new Date(c.created_at).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <p className={`text-sm font-bold ${c.type === 'credit' ? 'text-destructive' : 'text-primary'}`}>
                  {c.type === 'credit' ? '+' : '-'}{formatCurrency(c.amount)}
                </p>
              </CardContent>
            </Card>
          )) : (
            <p className="text-center text-sm text-muted-foreground py-4">Aucune opération de crédit</p>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog crédit */}
      <Dialog open={showCreditForm} onOpenChange={setShowCreditForm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Enregistrer une opération</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={creditType === 'credit' ? 'default' : 'outline'}
                onClick={() => setCreditType('credit')}
                className="text-sm"
              >
                Crédit (dette)
              </Button>
              <Button
                variant={creditType === 'payment' ? 'default' : 'outline'}
                onClick={() => setCreditType('payment')}
                className="text-sm"
              >
                Paiement reçu
              </Button>
            </div>
            <div>
              <Label>Montant *</Label>
              <Input type="number" min="0" value={creditAmount} onChange={(e) => setCreditAmount(e.target.value)} placeholder="0" />
            </div>
            <div>
              <Label>Description</Label>
              <Input value={creditDesc} onChange={(e) => setCreditDesc(e.target.value)} placeholder="Raison..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreditForm(false)}>Annuler</Button>
            <Button onClick={handleAddCredit} disabled={!creditAmount || addCredit.isPending}>
              {addCredit.isPending ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CustomerManagement;
