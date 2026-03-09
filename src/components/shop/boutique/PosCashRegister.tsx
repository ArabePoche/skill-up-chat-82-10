/**
 * Caisse enregistreuse POS plein écran (responsive)
 * Mobile : produits plein écran + barre panier en bas qui s'ouvre en overlay
 * Desktop : grille produits à gauche + sidebar panier/encaissement à droite
 */
import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  X, Search, Package, Plus, Minus, Trash2,
  ShoppingCart, Receipt, FileText, Printer,
  Banknote, CreditCard, Smartphone, ArrowLeft,
  Calculator, Check, Delete, ChevronUp,
} from 'lucide-react';
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

type PosStep = 'browse' | 'checkout';
type CheckoutType = 'sale' | 'quote';

interface PosCashRegisterProps {
  open: boolean;
  onClose: () => void;
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
  }) => Promise<void>;
  isProcessing: boolean;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    minimumFractionDigits: 0,
  }).format(amount);

const PosCashRegister: React.FC<PosCashRegisterProps> = ({
  open, onClose, products, shopId, shopName, shopAddress,
  cartItems, totalAmount, totalItems,
  onAddItem, onUpdateQuantity, onRemoveItem, onClearCart,
  onConfirmSale, isProcessing,
}) => {
  const { data: shopCustomers } = useShopCustomers(shopId);
  const isMobile = useIsMobile();
  const [step, setStep] = useState<PosStep>('browse');
  const [searchQuery, setSearchQuery] = useState('');
  const [checkoutType, setCheckoutType] = useState<CheckoutType>('sale');
  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [notes, setNotes] = useState('');
  const [amountReceived, setAmountReceived] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
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

  // Ouvre automatiquement le panier mobile à l'ouverture de la caisse si des articles sont déjà présents
  useEffect(() => {
    if (open && isMobile && totalItems > 0) {
      setMobileCartOpen(true);
      setStep('browse');
    } else if (!open) {
      // Reset de l'état quand on ferme la caisse globale
      setMobileCartOpen(false);
      setStep('browse');
    }
  }, [open, isMobile]);

  const filteredProducts = useMemo(() =>
    products.filter(p =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.barcode || '').includes(searchQuery)
    ), [products, searchQuery]
  );

  const getCartQty = useCallback((productId: string) =>
    cartItems.find(i => i.product.id === productId)?.quantity || 0,
    [cartItems]
  );

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

  if (!open) return null;

  // ─── Contenu du panier (réutilisé mobile + desktop) ───
  const CartContent = () => (
    <>
      {step === 'browse' && (
        <>
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <h2 className="font-bold text-sm flex items-center gap-2">
              <ShoppingCart size={16} className="text-emerald-600" />
              Panier ({totalItems})
            </h2>
            <div className="flex items-center gap-2">
              {cartItems.length > 0 && (
                <Button variant="ghost" size="sm" onClick={onClearCart}
                  className="text-red-500 hover:text-red-600 hover:bg-red-50 text-xs h-7">
                  <Trash2 size={12} className="mr-1" /> Vider
                </Button>
              )}
              {isMobile && (
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setMobileCartOpen(false)}>
                  <X size={14} />
                </Button>
              )}
            </div>
          </div>

          <ScrollArea className="flex-1">
            {cartItems.length === 0 ? (
              <div className="flex items-center justify-center h-40 p-8">
                <div className="text-center text-gray-400">
                  <ShoppingCart size={36} className="mx-auto mb-2 opacity-30" />
                  <p className="text-xs">Cliquez sur un produit pour l'ajouter</p>
                </div>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {cartItems.map(item => {
                  const maxStock = item.product.stock_quantity - item.product.marketplace_quantity;
                  return (
                    <div key={item.product.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 group">
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
                        <p className="text-[10px] text-gray-400">{formatCurrency(item.product.price)}/u</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
                          className="w-6 h-6 rounded border flex items-center justify-center text-gray-500 hover:bg-gray-100">
                          <Minus size={10} />
                        </button>
                        <span className="text-xs font-bold w-6 text-center">{item.quantity}</span>
                        <button onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                          disabled={item.quantity >= maxStock}
                          className="w-6 h-6 rounded border flex items-center justify-center text-gray-500 hover:bg-gray-100 disabled:opacity-30">
                          <Plus size={10} />
                        </button>
                      </div>
                      <p className="text-xs font-bold text-emerald-700 w-16 text-right">
                        {formatCurrency(item.product.price * item.quantity)}
                      </p>
                      <button onClick={() => onRemoveItem(item.product.id)}
                        className="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-red-500 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        <X size={12} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {cartItems.length > 0 && (
            <div className="border-t p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Total</span>
                <span className="text-2xl font-bold text-emerald-700">{formatCurrency(totalAmount)}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Button onClick={() => { setCheckoutType('sale'); setStep('checkout'); }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white flex-col h-auto py-3">
                  <Receipt size={18} className="mb-1" />
                  <span className="text-[10px]">Encaisser</span>
                </Button>
                <Button variant="outline" onClick={() => { setCheckoutType('quote'); setStep('checkout'); }}
                  className="flex-col h-auto py-3 text-blue-600 border-blue-200 hover:bg-blue-50">
                  <FileText size={18} className="mb-1" />
                  <span className="text-[10px]">Devis</span>
                </Button>
                <Button variant="outline" onClick={onClearCart}
                  className="flex-col h-auto py-3 text-red-500 border-red-200 hover:bg-red-50">
                  <X size={18} className="mb-1" />
                  <span className="text-[10px]">Annuler</span>
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {step === 'checkout' && (
        <div className="flex flex-col h-full">
          <div className="px-4 py-3 border-b flex items-center gap-2">
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

          <ScrollArea className="flex-1">
            <div className="p-4 space-y-4">
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-500">{totalItems} article{totalItems > 1 ? 's' : ''}</p>
                <p className="text-3xl font-bold text-emerald-700 mt-1">{formatCurrency(totalAmount)}</p>
              </div>

              {checkoutType === 'sale' && (
                <div>
                  <Label className="text-xs mb-2 block">Mode de paiement</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: 'cash', label: 'Espèces', icon: <Banknote size={18} /> },
                      { value: 'card', label: 'Carte', icon: <CreditCard size={18} /> },
                      { value: 'mobile', label: 'Mobile', icon: <Smartphone size={18} /> },
                    ].map(m => (
                      <button key={m.value} onClick={() => setPaymentMethod(m.value)}
                        className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${
                          paymentMethod === m.value
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}>
                        {m.icon}
                        <span className="text-[10px] font-medium">{m.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {checkoutType === 'sale' && paymentMethod === 'cash' && (
                <div>
                  <Label className="text-xs mb-2 block">Montant reçu</Label>
                  <div className="bg-gray-900 rounded-xl p-3 mb-2 text-right">
                    <p className="text-3xl font-bold text-white font-mono">
                      {amountReceived || '0'} <span className="text-lg text-gray-400">FCFA</span>
                    </p>
                    {parseFloat(amountReceived) >= totalAmount && (
                      <p className="text-emerald-400 text-sm mt-1">
                        Rendu : <span className="font-bold">{formatCurrency(change)}</span>
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1.5 mb-2 flex-wrap">
                    <button onClick={() => setAmountReceived(totalAmount.toString())}
                      className="text-[10px] px-2 py-1 rounded-md bg-emerald-100 text-emerald-700 font-medium hover:bg-emerald-200">
                      Exact
                    </button>
                    {quickAmounts.filter(a => a >= totalAmount).slice(0, 4).map(amount => (
                      <button key={amount} onClick={() => setAmountReceived(amount.toString())}
                        className="text-[10px] px-2 py-1 rounded-md bg-gray-100 text-gray-700 font-medium hover:bg-gray-200">
                        {formatCurrency(amount)}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map(key => (
                      <button key={key} onClick={() => handleNumPad(key)}
                        className={`h-11 rounded-lg font-bold text-lg transition-all active:scale-95 ${
                          key === 'C' ? 'bg-red-100 text-red-600 hover:bg-red-200'
                            : key === '⌫' ? 'bg-orange-100 text-orange-600 hover:bg-orange-200'
                            : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                        }`}>
                        {key === '⌫' ? <Delete size={18} className="mx-auto" /> : key}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <Label className="text-xs" htmlFor="pos-cust">Client</Label>
                <div className="mt-1 space-y-1">
                  {shopCustomers && shopCustomers.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-1.5">
                      {shopCustomers.slice(0, 8).map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setCustomerName(c.name)}
                          className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                            customerName === c.name
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-muted text-foreground border-border hover:bg-accent'
                          }`}
                        >
                          {c.name}
                        </button>
                      ))}
                    </div>
                  )}
                  <Input id="pos-cust" value={customerName} onChange={e => setCustomerName(e.target.value)}
                    placeholder="Nom du client (optionnel)" />
                </div>
              </div>
              <div>
                <Label className="text-xs" htmlFor="pos-note">Notes (optionnel)</Label>
                <Textarea id="pos-note" value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder="Notes..." rows={2} className="mt-1" />
              </div>
            </div>
          </ScrollArea>

          <div className="border-t p-4">
            <Button onClick={handleFinalize}
              disabled={isProcessing || (checkoutType === 'sale' && !canFinalize)}
              className={`w-full h-12 text-base font-bold ${
                checkoutType === 'sale' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'
              }`}>
              {isProcessing ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
              ) : checkoutType === 'sale' ? (
                <><Check size={18} className="mr-2" /> Valider — {formatCurrency(totalAmount)}</>
              ) : (
                <><FileText size={18} className="mr-2" /> Générer le devis</>
              )}
            </Button>
          </div>
        </div>
      )}
    </>
  );

  // ─── Grille produits ───
  const ProductGrid = () => (
    <div className="flex-1 flex flex-col bg-gray-50 min-w-0">
      <div className="p-3 border-b bg-white">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher un produit..." className="pl-9 h-10" autoFocus />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
          {filteredProducts.map(product => {
            const available = product.stock_quantity - product.marketplace_quantity;
            const inCart = getCartQty(product.id);
            const remaining = available - inCart;

            return (
              <button key={product.id}
                onClick={() => remaining > 0 && onAddItem(product, 1)}
                disabled={remaining <= 0}
                className={`relative bg-white rounded-xl border p-2 text-left transition-all hover:shadow-md active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed ${
                  inCart > 0 ? 'border-emerald-300 ring-1 ring-emerald-200' : 'border-gray-100'
                }`}>
                <div className="aspect-square rounded-lg bg-gray-100 mb-1.5 overflow-hidden">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package size={20} className="text-gray-300" />
                    </div>
                  )}
                </div>
                <p className="font-semibold text-[11px] text-gray-900 line-clamp-1">{product.name}</p>
                <p className="font-bold text-emerald-600 text-xs">{formatCurrency(product.price)}</p>
                {product.barcode && (
                  <p className="text-[8px] text-gray-400 font-mono truncate">{product.barcode}</p>
                )}
                <p className="text-[9px] text-gray-400">Stock: {remaining}</p>
                {inCart > 0 && (
                  <div className="absolute top-1.5 right-1.5 bg-emerald-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow">
                    {inCart}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <Package size={40} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">Aucun produit trouvé</p>
          </div>
        )}
      </ScrollArea>
    </div>
  );

  return (
    <>
      <div className="fixed inset-0 z-50 bg-white flex flex-col">
        {/* Top Bar */}
        <div className="bg-gradient-to-r from-emerald-700 to-emerald-600 text-white px-3 sm:px-4 py-2.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Button variant="ghost" size="icon" onClick={onClose}
              className="text-white hover:bg-white/20 h-8 w-8 shrink-0">
              <ArrowLeft size={18} />
            </Button>
            <div className="min-w-0">
              <h1 className="font-bold text-xs sm:text-sm flex items-center gap-1.5 truncate">
                <Calculator size={14} className="shrink-0" />
                <span className="truncate">Caisse — {shopName}</span>
              </h1>
              <p className="text-emerald-200 text-[9px] sm:text-[10px] truncate">
                {format(new Date(), 'EEEE dd MMMM yyyy • HH:mm', { locale: fr })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 text-xs shrink-0">
            <div className="bg-white/15 rounded-lg px-2 sm:px-3 py-1.5 hidden sm:block">
              <span className="text-emerald-200">Panier : </span>
              <span className="font-bold">{totalItems} article{totalItems > 1 ? 's' : ''}</span>
            </div>
            <div className="bg-white/20 rounded-lg px-2 sm:px-3 py-1.5 font-bold text-sm sm:text-base">
              {formatCurrency(totalAmount)}
            </div>
          </div>
        </div>

        {/* Corps */}
        <div className="flex-1 flex overflow-hidden relative">
          <ProductGrid />

          {/* Desktop sidebar */}
          {!isMobile && (
            <div className="w-80 lg:w-96 border-l bg-white flex flex-col shrink-0">
              <CartContent />
            </div>
          )}
        </div>

        {/* Mobile : barre panier fixe en bas */}
        {isMobile && !mobileCartOpen && (
          <button
            onClick={() => setMobileCartOpen(true)}
            className="border-t bg-white px-4 py-3 flex items-center justify-between shrink-0 active:bg-gray-50"
          >
            <div className="flex items-center gap-2">
              <div className="relative">
                <ShoppingCart size={20} className="text-emerald-600" />
                {totalItems > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-emerald-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {totalItems}
                  </span>
                )}
              </div>
              <span className="text-sm font-medium">
                {totalItems > 0 ? `${totalItems} article${totalItems > 1 ? 's' : ''}` : 'Panier vide'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-emerald-700">{formatCurrency(totalAmount)}</span>
              <ChevronUp size={16} className="text-gray-400" />
            </div>
          </button>
        )}

        {/* Mobile : overlay panier */}
        {isMobile && mobileCartOpen && (
          <div className="absolute inset-0 z-10 flex flex-col" style={{ top: '52px' }}>
            <div className="flex-1 bg-black/40" onClick={() => step === 'browse' && setMobileCartOpen(false)} />
            <div className="bg-white flex flex-col rounded-t-2xl shadow-2xl animate-in slide-in-from-bottom duration-200"
              style={{ maxHeight: 'calc(100vh - 52px)', height: step === 'checkout' ? 'calc(100vh - 52px)' : '85vh' }}>
              <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mt-2 mb-1 shrink-0" />
              <CartContent />
            </div>
          </div>
        )}
      </div>

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
    </>
  );
};

export default PosCashRegister;
