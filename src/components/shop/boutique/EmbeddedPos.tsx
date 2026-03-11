/**
 * Caisse enregistreuse intégrée (Embedded)
 * S'affiche sous la barre de recherche dans la gestion de boutique
 * Utilise BoutiqueProductCard pour l'affichage des produits
 */
import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  X, Search, Package, Plus, Minus, Trash2,
  ShoppingCart, Receipt, FileText, Printer,
  Banknote, CreditCard, Smartphone, ArrowLeft,
  Calculator, Check, Delete, ChevronUp,
  Settings2,
  User as UserIcon
} from 'lucide-react';
import { useShopAgents } from '@/hooks/shop/useShopAgents';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useIsMobile } from '@/hooks/use-mobile';
import type { BoutiqueProduct } from '@/hooks/shop/useBoutiqueProducts';
import type { PosCartItem } from '@/hooks/shop/usePosCart';
import { useShopCustomers, type ShopCustomer } from '@/hooks/shop/useShopCustomers';
import BoutiqueProductCard from './BoutiqueProductCard';

type PosStep = 'browse' | 'checkout';
type CheckoutType = 'sale' | 'quote';

interface EmbeddedPosProps {
  products: BoutiqueProduct[];
  shopId: string;
  shopName: string;
  shopAddress?: string;
  cartItems: PosCartItem[];
  totalAmount: number;
  totalItems: number;
  onAddItem: (product: BoutiqueProduct, qty?: number) => void;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
  onConfirmSale: (data: {
    customerName?: string;
    paymentMethod: string;
    notes?: string;
    agentId?: string;
  }) => Promise<void>;
  isProcessing: boolean;
  searchQuery: string;
  filterCategory: string;
  // Actions produit additionnelles
  onEditProduct: (product: BoutiqueProduct) => void;
  onDeleteProduct: (productId: string) => void;
  onTransferProduct: (product: BoutiqueProduct) => void;
  onReturnProduct: (product: BoutiqueProduct) => void;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    minimumFractionDigits: 0,
  }).format(amount);

const EmbeddedPos: React.FC<EmbeddedPosProps> = ({
  products, shopId, shopName, shopAddress,
  cartItems, totalAmount, totalItems,
  onAddItem, onUpdateQuantity, onRemoveItem, onClearCart,
  onConfirmSale, isProcessing,
  searchQuery, filterCategory,
  onEditProduct, onDeleteProduct, onTransferProduct, onReturnProduct
}) => {
  const { data: shopCustomers } = useShopCustomers(shopId);
  const isMobile = useIsMobile();
  const [step, setStep] = useState<PosStep>('browse');
  const [checkoutType, setCheckoutType] = useState<CheckoutType>('sale');
  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [notes, setNotes] = useState('');
  const [amountReceived, setAmountReceived] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const [agentId, setAgentId] = useState<string>('');
  const { data: agents } = useShopAgents(shopId);
  const [receiptData, setReceiptData] = useState<{
    items: PosCartItem[];
    total: number;
    customer: string;
    payment: string;
    amountReceived: number;
    change: number;
    date: Date;
    type: CheckoutType;
  } | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.barcode || '').includes(searchQuery);
      const matchCategory = filterCategory === 'all' || p.category === filterCategory;
      return matchSearch && matchCategory;
    });
  }, [products, searchQuery, filterCategory]);

  const change = useMemo(() => {
    const received = parseFloat(amountReceived) || 0;
    return Math.max(0, received - totalAmount);
  }, [amountReceived, totalAmount]);

  const canFinalize = paymentMethod !== 'cash' || (parseFloat(amountReceived) || 0) >= totalAmount;

  const handleNumPad = (val: string) => {
    if (val === 'C') setAmountReceived('');
    else if (val === '⌫') setAmountReceived(prev => prev.slice(0, -1));
    else setAmountReceived(prev => prev + val);
  };

  const quickAmounts = [500, 1000, 2000, 5000, 10000];

  const handleFinalize = async () => {
    if (checkoutType === 'sale') {
      await onConfirmSale({
        customerName: customerName.trim() || undefined,
        paymentMethod,
        notes: notes.trim() || undefined,
        agentId: agentId || undefined,
      });
    }
    setReceiptData({
      items: [...cartItems],
      total: totalAmount,
      customer: customerName.trim() || 'Client anonyme',
      payment: paymentMethod,
      amountReceived: parseFloat(amountReceived) || totalAmount,
      change,
      date: new Date(),
      type: checkoutType,
    });
    setShowReceipt(true);
    resetCheckout();
  };

  const resetCheckout = () => {
    setStep('browse');
    setCustomerName('');
    setPaymentMethod('cash');
    setNotes('');
    setAmountReceived('');
    setCheckoutType('sale');
    setAgentId('');
    setMobileCartOpen(false);
  };

  const handlePrint = () => {
    if (receiptRef.current) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html><head><title>${receiptData?.type === 'quote' ? 'Devis' : 'Ticket de caisse'}</title>
          <style>
            body { font-family: 'Courier New', monospace; max-width: 300px; margin: 0 auto; padding: 10px; font-size: 12px; }
            .center { text-align: center; } .bold { font-weight: bold; }
            .line { border-top: 1px dashed #000; margin: 8px 0; }
            .row { display: flex; justify-content: space-between; margin: 4px 0; }
            .total { font-size: 16px; font-weight: bold; }
            @media print { body { margin: 0; } }
          </style></head><body>${receiptRef.current.innerHTML}</body></html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  // ─── Contenu du panier (Sidebar Droite) ───
  const CartSidebar = () => (
    <div className="flex flex-col h-full border-l bg-white">
      {step === 'browse' ? (
        <>
          <div className="p-4 border-b bg-gray-50/50">
            <h2 className="font-bold text-sm flex items-center justify-between">
              <span className="flex items-center gap-2">
                <ShoppingCart size={16} className="text-emerald-600" />
                Panier ({totalItems})
              </span>
              {cartItems.length > 0 && (
                <Button variant="ghost" size="sm" onClick={onClearCart}
                  className="text-red-500 hover:text-red-600 hover:bg-red-50 text-xs h-7 px-2">
                  <Trash2 size={12} />
                </Button>
              )}
            </h2>
          </div>

          <ScrollArea className="flex-1">
            {cartItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 p-8 text-center text-gray-400">
                <ShoppingCart size={36} className="mb-2 opacity-30" />
                <p className="text-xs">Panier vide</p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {cartItems.map(item => {
                  const maxStock = item.product.stock_quantity - item.product.marketplace_quantity;
                  return (
                    <div key={item.product.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 group border border-transparent hover:border-gray-100 transition-colors">
                      <div className="w-10 h-10 rounded-md bg-gray-100 shrink-0 overflow-hidden">
                        {item.product.image_url ? (
                          <img src={item.product.image_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package size={14} className="text-gray-300" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{item.product.name}</p>
                        <p className="text-[10px] text-gray-400">{formatCurrency(item.product.price)}</p>
                      </div>
                      <div className="flex items-center gap-1 bg-white border rounded-md shadow-sm">
                        <button onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
                          className="w-6 h-6 flex items-center justify-center text-gray-500 hover:bg-gray-50 hover:text-red-500">
                          <Minus size={10} />
                        </button>
                        <span className="text-xs font-bold w-5 text-center">{item.quantity}</span>
                        <button onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                          disabled={item.quantity >= maxStock}
                          className="w-6 h-6 flex items-center justify-center text-gray-500 hover:bg-gray-50 hover:text-emerald-600 disabled:opacity-30">
                          <Plus size={10} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          <div className="border-t p-4 bg-gray-50/30">
            <div className="flex justify-between items-end mb-3">
              <span className="text-sm text-gray-500">Total à payer</span>
              <span className="text-2xl font-bold text-emerald-700">{formatCurrency(totalAmount)}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={() => { setCheckoutType('sale'); setStep('checkout'); }}
                disabled={totalItems === 0}
                className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm">
                <Receipt size={16} className="mr-2" />
                Encaisser
              </Button>
              <Button variant="outline" onClick={() => { setCheckoutType('quote'); setStep('checkout'); }}
                disabled={totalItems === 0}
                className="text-blue-600 border-blue-200 hover:bg-blue-50">
                <FileText size={16} className="mr-2" />
                Devis
              </Button>
            </div>
          </div>
        </>
      ) : (
        // Mode Checkout
        <div className="flex flex-col h-full">
          <div className="px-4 py-3 border-b flex items-center gap-2 bg-gray-50/50">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setStep('browse')}>
              <ArrowLeft size={14} />
            </Button>
            <h2 className="font-bold text-sm flex items-center gap-2">
              {checkoutType === 'sale' ? (
                <><Receipt size={16} className="text-emerald-600" /> Encaissement</>
              ) : (
                <><FileText size={16} className="text-blue-600" /> Devis</>
              )}
            </h2>
          </div>

          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              <div className="bg-emerald-50 rounded-xl p-3 text-center border border-emerald-100">
                <p className="text-xs text-emerald-600 font-medium mb-1">Total à régler</p>
                <p className="text-3xl font-bold text-emerald-700">{formatCurrency(totalAmount)}</p>
              </div>

              {checkoutType === 'sale' && (
                <div>
                  <Label className="text-xs mb-2 block font-medium text-gray-500">Mode de paiement</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: 'cash', label: 'Espèces', icon: <Banknote size={18} /> },
                      { value: 'card', label: 'Carte', icon: <CreditCard size={18} /> },
                      { value: 'mobile', label: 'Mobile', icon: <Smartphone size={18} /> },
                    ].map(m => (
                      <button key={m.value} onClick={() => setPaymentMethod(m.value)}
                        className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-all ${paymentMethod === m.value
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }`}>
                        {m.icon}
                        <span className="text-[10px] font-medium">{m.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {checkoutType === 'sale' && paymentMethod === 'cash' && (
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <Label className="text-xs mb-2 block font-medium text-gray-500">Montant reçu</Label>
                  <div className="flex gap-2 mb-3">
                    <Input
                      value={amountReceived}
                      readOnly
                      className="text-right font-mono text-lg font-bold"
                      placeholder="0"
                    />
                    <div className="bg-white px-3 py-2 rounded-md border text-sm font-bold text-gray-500">FCFA</div>
                  </div>

                  {parseFloat(amountReceived) >= totalAmount && (
                    <div className="mb-3 p-2 bg-emerald-100 text-emerald-800 rounded-lg text-center text-sm">
                      Rendu : <span className="font-bold">{formatCurrency(change)}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-1.5 mb-2">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map(key => (
                      <button key={key} onClick={() => handleNumPad(key)}
                        className={`h-10 rounded-lg font-bold text-sm transition-all active:scale-95 shadow-sm border ${key === 'C' ? 'bg-red-50 text-red-600 border-red-100 hover:bg-red-100'
                            : key === '⌫' ? 'bg-orange-50 text-orange-600 border-orange-100 hover:bg-orange-100'
                              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                          }`}>
                        {key === '⌫' ? <Delete size={16} className="mx-auto" /> : key}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-1.5 flex-wrap justify-center">
                    {quickAmounts.filter(a => a >= totalAmount).slice(0, 3).map(amount => (
                      <button key={amount} onClick={() => setAmountReceived(amount.toString())}
                        className="text-[10px] px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 font-medium hover:bg-emerald-200 border border-emerald-200">
                        {formatCurrency(amount)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <Label className="text-xs font-medium text-gray-500" htmlFor="pos-agent">Vendeur / Agent *</Label>
                  <Select value={agentId} onValueChange={setAgentId}>
                    <SelectTrigger id="pos-agent" className="mt-1">
                      <SelectValue placeholder="Qui effectue cette vente ?" />
                    </SelectTrigger>
                    <SelectContent>
                      {agents?.filter(a => a.status === 'active').map(agent => (
                        <SelectItem key={agent.id} value={agent.id}>
                          {agent.first_name} {agent.last_name} ({agent.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-500" htmlFor="pos-cust">Client</Label>
                  <Input id="pos-cust" value={customerName} onChange={e => setCustomerName(e.target.value)}
                    placeholder="Nom du client (optionnel)" className="mt-1" />
                  {shopCustomers && shopCustomers.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {shopCustomers.slice(0, 4).map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setCustomerName(c.name)}
                          className="px-2 py-0.5 rounded-full text-[10px] bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200"
                        >
                          {c.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-500" htmlFor="pos-note">Notes</Label>
                  <Textarea id="pos-note" value={notes} onChange={e => setNotes(e.target.value)}
                    placeholder="Notes..." rows={2} className="mt-1" />
                </div>
              </div>
            </div>
          </ScrollArea>

          <div className="p-4 border-t bg-gray-50/30">
            <Button onClick={handleFinalize}
              disabled={isProcessing || (checkoutType === 'sale' && !canFinalize)}
              className={`w-full h-12 text-base font-bold shadow-md ${checkoutType === 'sale' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'
                }`}>
              {isProcessing ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
              ) : checkoutType === 'sale' ? (
                <><Check size={18} className="mr-2" /> Valider</>
              ) : (
                <><FileText size={18} className="mr-2" /> Générer</>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-220px)] min-h-[500px] border rounded-xl overflow-hidden shadow-sm bg-white mt-4">
      {/* Zone gauche : Grille produits */}
      <div className="flex-1 flex flex-col min-w-0 bg-gray-50/30">
        <ScrollArea className="flex-1 p-3 sm:p-4">
          {filteredProducts.length > 0 ? (
            <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 pb-24 lg:pb-0">
              {filteredProducts.map(product => (
                <BoutiqueProductCard
                  key={product.id}
                  product={product}
                  onEdit={onEditProduct}
                  onDelete={onDeleteProduct}
                  onTransfer={onTransferProduct}
                  onReturn={onReturnProduct}
                  onAddToCart={(p, qty) => onAddItem(p, qty)}
                  cartQuantity={cartItems.find(i => i.product.id === product.id)?.quantity || 0}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <Package size={48} className="mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">Aucun produit trouvé</p>
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Zone droite : Sidebar panier (Desktop) */}
      <div className="hidden lg:block w-80 xl:w-96 shrink-0 z-10 shadow-xl lg:shadow-none">
        <CartSidebar />
      </div>

      {/* Mobile : Bouton flottant panier */}
      <div className="lg:hidden fixed bottom-24 left-1/2 -translate-x-1/2 z-50">
        <Button
          onClick={() => setMobileCartOpen(true)}
          className="rounded-full h-14 px-6 shadow-xl bg-emerald-600 hover:bg-emerald-700 text-white gap-3"
        >
          <div className="relative">
            <ShoppingCart size={20} />
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-emerald-600">
              {totalItems}
            </span>
          </div>
          <span className="font-bold text-lg">{formatCurrency(totalAmount)}</span>
        </Button>
      </div>

      {/* Mobile : Drawer Panier */}
      {isMobile && (
        <Dialog open={mobileCartOpen} onOpenChange={setMobileCartOpen}>
          <DialogContent className="h-[85vh] p-0 gap-0 flex flex-col w-full max-w-full rounded-t-2xl !translate-y-0 !top-auto !bottom-0 data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom duration-300">
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mt-3 mb-1 shrink-0" />
            <div className="flex-1 overflow-hidden relative">
              <CartSidebar />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Dialog Ticket / Devis */}
      <Dialog open={showReceipt} onOpenChange={setShowReceipt}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Printer size={18} />
              {receiptData?.type === 'quote' ? 'Devis' : 'Ticket de caisse'}
            </DialogTitle>
          </DialogHeader>

          {receiptData && (
            <div ref={receiptRef}>
              <div className="border rounded-lg p-4 font-mono text-xs space-y-3">
                <div className="text-center">
                  <p className="font-bold text-sm">{shopName}</p>
                  {shopAddress && <p className="text-gray-500 text-[10px]">{shopAddress}</p>}
                  <p className="text-gray-500 mt-1">
                    {receiptData.type === 'quote' ? '━━━ DEVIS ━━━' : '━━━ TICKET DE CAISSE ━━━'}
                  </p>
                  <p className="text-gray-500">
                    {format(receiptData.date, 'dd/MM/yyyy HH:mm', { locale: fr })}
                  </p>
                </div>
                <Separator />
                <p className="text-gray-500">Client : {receiptData.customer}</p>
                <Separator />
                <div className="space-y-2">
                  {receiptData.items.map(item => (
                    <div key={item.product.id}>
                      <p className="truncate font-medium">{item.product.name}</p>
                      <div className="flex justify-between text-gray-500">
                        <span>{item.quantity} × {formatCurrency(item.product.price)}</span>
                        <span className="font-medium text-gray-900">
                          {formatCurrency(item.product.price * item.quantity)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <Separator />
                <div className="flex justify-between text-base font-bold">
                  <span>TOTAL</span>
                  <span>{formatCurrency(receiptData.total)}</span>
                </div>
                {receiptData.type === 'sale' && (
                  <div className="space-y-1 text-gray-500 text-center">
                    <p>Payé par : {receiptData.payment === 'cash' ? 'Espèces' : receiptData.payment === 'card' ? 'Carte' : 'Mobile'}</p>
                    {receiptData.payment === 'cash' && receiptData.amountReceived > receiptData.total && (
                      <>
                        <p>Reçu : {formatCurrency(receiptData.amountReceived)}</p>
                        <p className="font-bold text-emerald-600">Rendu : {formatCurrency(receiptData.change)}</p>
                      </>
                    )}
                  </div>
                )}
                {receiptData.type === 'quote' && (
                  <p className="text-gray-500 text-center italic">Devis valable 30 jours</p>
                )}
                <div className="text-center text-gray-400 mt-2">
                  <p>Merci de votre visite !</p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setShowReceipt(false)} className="flex-1">Fermer</Button>
            <Button onClick={handlePrint} className="flex-1">
              <Printer size={16} className="mr-2" /> Imprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmbeddedPos;
