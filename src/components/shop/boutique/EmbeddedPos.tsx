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
import JsBarcode from 'jsbarcode';
import type { BoutiqueProduct } from '@/hooks/shop/useBoutiqueProducts';
import type { PosCartItem } from '@/hooks/shop/usePosCart';
import { useShopCustomers, useCustomerCredits, useAddCustomerCredit, getCustomerBalance, type ShopCustomer } from '@/hooks/shop/useShopCustomers';
import BoutiqueProductCard from './BoutiqueProductCard';
import SectorProductCard from './SectorProductCard';
import { getSectorConfig } from '@/config/product-sectors';
import { toast } from 'sonner';

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
    customerId?: string;
    paymentMethod: string;
    notes?: string;
    receiptId?: string;
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

/** Composant pour afficher le solde d'un client */
const CustomerBalanceDisplay: React.FC<{ customer: ShopCustomer; shopId: string }> = ({ customer, shopId }) => {
  const { data: credits } = useCustomerCredits(customer.id);
  const balance = credits ? getCustomerBalance(credits) : 0;

  return (
    <div className={`mt-2 p-2 rounded-lg border ${balance > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-gray-600">Solde actuel :</span>
        <span className={`font-bold ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
          {balance > 0 ? 'Doit ' : 'Crédit '}{formatCurrency(Math.abs(balance))}
        </span>
      </div>
    </div>
  );
};

const EmbeddedPos: React.FC<EmbeddedPosProps> = ({
  products, shopId, shopName, shopAddress,
  cartItems, totalAmount, totalItems,
  onAddItem, onUpdateQuantity, onRemoveItem, onClearCart,
  onConfirmSale, isProcessing,
  searchQuery, filterCategory,
  onEditProduct, onDeleteProduct, onTransferProduct, onReturnProduct
}) => {
  const { data: shopCustomers } = useShopCustomers(shopId);
  const addCustomerCredit = useAddCustomerCredit();
  const [step, setStep] = useState<PosStep>('browse');
  const [checkoutType, setCheckoutType] = useState<CheckoutType>('sale');
  const [customerName, setCustomerName] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<ShopCustomer | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('cash'); // Fallback primary payment method
  const [isSplitMode, setIsSplitMode] = useState(false);
  const [splitPayments, setSplitPayments] = useState<{ method: string, amount: number, received?: number }[]>([]);
  const [splitAmountsReceived, setSplitAmountsReceived] = useState<{ [method: string]: string }>({});
  const [partialPaymentAmount, setPartialPaymentAmount] = useState(''); // Montant payé partiellement
  
  const [notes, setNotes] = useState('');
  const [amountReceived, setAmountReceived] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<{
      id?: string;
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
    const barcodeRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
      if (receiptData?.id && barcodeRef.current) {
        try {
          JsBarcode(barcodeRef.current, receiptData.id, {
            format: 'CODE128',
            displayValue: true,
            text: "Réf: " + receiptData.id,
            width: 1.5,
            height: 40,
            margin: 0,
            fontSize: 12,
          });
        } catch (e) {
          console.error("Barcode gen erorr", e);
        }
      }
    }, [receiptData?.id]);
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

  const splitTotal = useMemo(() => splitPayments.reduce((acc, curr) => acc + curr.amount, 0), [splitPayments]);

  const canFinalize = isSplitMode 
    ? (splitTotal >= totalAmount && totalAmount > 0)
    : paymentMethod === 'partial_credit' 
      ? (parseFloat(partialPaymentAmount) > 0 && parseFloat(partialPaymentAmount) < totalAmount && selectedCustomer)
      : (paymentMethod !== 'cash' || (parseFloat(amountReceived) || 0) >= totalAmount);

  const handleNumPad = (val: string) => {
    if (val === 'C') setAmountReceived('');
    else if (val === '⌫') setAmountReceived(prev => prev.slice(0, -1));
    else setAmountReceived(prev => prev + val);
  };

  const handleNumPadForSplit = (methodValue: string, val: string) => {
    setSplitAmountsReceived(prev => {
      const current = prev[methodValue] || '';
      let nextStr = current;
      if (val === 'C') nextStr = '';
      else if (val === '⌫') nextStr = current.slice(0, -1);
      else nextStr = current + val;
      
      const newSplitReceived = { ...prev, [methodValue]: nextStr };
      
      // Update actual amount array based on received vs remaining
      // We do not calculate automatic splits here, we just sync the input string.
      return newSplitReceived;
    });
  };

  const handleApplySplit = (methodValue: string) => {
    const receivedAmount = parseFloat(splitAmountsReceived[methodValue]) || 0;
    if (receivedAmount <= 0) return;
    
    const remainingToPay = Math.max(0, totalAmount - splitTotal);
    const amountToApply = Math.min(receivedAmount, remainingToPay); // Cannot apply more than remaining to the cart sum
    
    if (amountToApply <= 0) return;

    setSplitPayments(prev => {
      const existing = prev.find(p => p.method === methodValue);
      if (existing) {
         return prev.map(p => p.method === methodValue ? { ...p, amount: p.amount + amountToApply, received: (p.received || 0) + receivedAmount } : p);
      }
      return [...prev, { method: methodValue, amount: amountToApply, received: receivedAmount }];
    });
    setSplitAmountsReceived(prev => ({ ...prev, [methodValue]: '' }));
  };

  const clearSplits = () => {
    setSplitPayments([]);
    setSplitAmountsReceived({});
  };

  const quickAmounts = [500, 1000, 2000, 5000, 10000];

  const handleConfirmCheckout = async () => {
    if (!shopId || totalItems === 0) return;

    // Validation des produits expirés
    const expiredProducts = cartItems.filter(item => {
      const sectorData = item.product.sector_data || {};
      const expiryDate = sectorData.expiry_date || sectorData.expiration_date;
      if (expiryDate) {
        return new Date(expiryDate) < new Date();
      }
      return false;
    });

    if (expiredProducts.length > 0) {
      toast.error(
        `Impossible de vendre des produits expirés : ${expiredProducts.map(p => p.product.name).join(', ')}`,
        {
          duration: 5000,
        }
      );
      return;
    }

    // Validation du client pour le paiement en crédit
    if (paymentMethod === 'credit' && !selectedCustomer) {
      toast.error('Veuillez sélectionner un client pour le paiement en crédit');
      return;
    }

    const finalPaymentMethod = checkoutType === 'quote'
      ? null
      : isSplitMode
      ? JSON.stringify(splitPayments.reduce((acc, curr) => { 
          acc[curr.method] = curr.amount;
          return acc;
        }, {} as Record<string, number>))
      : paymentMethod;

    const generatedId = `FAC-${format(new Date(), 'yyMMddHHmmss')}`;
    let saleResult: any = null;

    if (checkoutType === 'sale') {
      saleResult = await onConfirmSale({
        customerName: selectedCustomer?.name || customerName.trim() || undefined,
        customerId: selectedCustomer?.id, // Passer l'ID du client pour lier les achats
        paymentMethod: finalPaymentMethod,
        notes: notes.trim() || undefined,
        receiptId: generatedId,
      });
      
      // Si paiement en crédit et client sélectionné, créer la dette
      if (paymentMethod === 'credit' && selectedCustomer) {
        await addCustomerCredit.mutateAsync({
          customer_id: selectedCustomer.id,
          shop_id: shopId,
          amount: totalAmount,
          type: 'credit',
          description: `Achat en crédit - Ticket ${generatedId}`,
        });
      }
      
      // Si paiement partiel + crédit, enregistrer le paiement partiel et créer la dette pour le reste
      if (paymentMethod === 'partial_credit' && selectedCustomer) {
        const paidAmount = parseFloat(partialPaymentAmount) || 0;
        const debtAmount = Math.max(0, totalAmount - paidAmount);
        
        if (debtAmount > 0) {
          await addCustomerCredit.mutateAsync({
            customer_id: selectedCustomer.id,
            shop_id: shopId,
            amount: debtAmount,
            type: 'credit',
            description: `Reste impayé - Paiement partiel de ${formatCurrency(paidAmount)} - Ticket ${generatedId}`,
          });
        }
      }
    }
    // Calculer le montant reçu selon le mode de paiement
    const getAmountReceived = () => {
      if (isSplitMode) {
        return splitPayments.reduce((a, b) => a + (b.received || b.amount), 0);
      }
      if (paymentMethod === 'partial_credit') {
        return parseFloat(partialPaymentAmount) || 0;
      }
      if (paymentMethod === 'credit') {
        return 0; // Aucun paiement reçu en mode crédit pur
      }
      return parseFloat(amountReceived) || totalAmount;
    };

    // Calculer la monnaie rendue
    const getChange = () => {
      if (isSplitMode) {
        return Math.max(0, splitPayments.reduce((a, b) => a + (b.received || b.amount), 0) - totalAmount);
      }
      if (paymentMethod === 'partial_credit') {
        return 0; // Pas de monnaie en paiement partiel
      }
      return change;
    };

    setReceiptData({
      id: generatedId,
      items: [...cartItems],
      total: totalAmount,
      customer: customerName.trim() || 'Client anonyme',
      payment: finalPaymentMethod,
      amountReceived: getAmountReceived(),
      change: getChange(),
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
    setIsSplitMode(false);
    setPartialPaymentAmount('');
    clearSplits();
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
                  const sector = item.product.sector || 'default';
                  const sectorConfig = getSectorConfig(sector);
                  const sectorData = item.product.sector_data || {};
                  
                  // Informations spécifiques à afficher dans le panier
                  const getSectorSpecificInfo = () => {
                    if (!sectorData || Object.keys(sectorData).length === 0) return null;
                    
                    const expiryDate = sectorData.expiry_date || sectorData.expiration_date;
                    
                    switch (sector) {
                      case 'pharmaceutical':
                        if (sectorData.dosage) return `Dosage: ${sectorData.dosage}`;
                        if (expiryDate) {
                          const expiry = new Date(expiryDate);
                          return `Exp: ${expiry.toLocaleDateString('fr-FR')}`;
                        }
                        break;
                      case 'clothing':
                        if (sectorData.size && sectorData.color) return `${sectorData.size} - ${sectorData.color}`;
                        if (sectorData.size) return sectorData.size;
                        break;
                      case 'food':
                        if (expiryDate) {
                          const expiry = new Date(expiryDate);
                          return `Exp: ${expiry.toLocaleDateString('fr-FR')}`;
                        }
                        break;
                      case 'electronics':
                        if (sectorData.brand && sectorData.model) return `${sectorData.brand} ${sectorData.model}`;
                        if (sectorData.brand) return sectorData.brand;
                        break;
                    }
                    return null;
                  };
                  
                  const sectorInfo = getSectorSpecificInfo();
                  
                  return (
                    <div key={item.product.id} className="flex flex-col gap-1 p-2 rounded-lg hover:bg-gray-50 group border border-transparent hover:border-gray-100 transition-colors">
                      <div className="flex items-center gap-2">
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
                          <div className="flex items-center gap-1">
                            <p className="text-xs font-medium truncate">{item.product.name}</p>
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{sectorConfig.name}</span>
                          </div>
                          <p className="text-[10px] text-gray-400">{formatCurrency(item.product.price)}</p>
                          {sectorInfo && (
                            <p className="text-[9px] text-gray-500 truncate">{sectorInfo}</p>
                          )}
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

              {checkoutType === 'sale' && !isSplitMode && (
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <Label className="text-xs font-medium text-gray-500">Mode de paiement</Label>
                    <button onClick={() => setIsSplitMode(true)} className="text-[10px] text-emerald-600 hover:underline">
                      Paiement multiple (Mixte)
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: 'cash', label: 'Espèces', icon: <Banknote size={18} /> },
                      { value: 'card', label: 'Carte', icon: <CreditCard size={18} /> },
                      { value: 'mobile', label: 'Mobile', icon: <Smartphone size={18} /> },
                      { value: 'credit', label: 'Crédit', icon: <UserIcon size={18} /> },
                      { value: 'partial_credit', label: 'Partiel + Dette', icon: <UserIcon size={18} />, requiresCustomer: true },
                    ].map(m => (
                      <button key={m.value} onClick={() => setPaymentMethod(m.value)}
                        disabled={(m.value === 'credit' || m.value === 'partial_credit') && !selectedCustomer}
                        className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-all ${paymentMethod === m.value
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          } ${(m.value === 'credit' || m.value === 'partial_credit') && !selectedCustomer ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        {m.icon}
                        <span className="text-[10px] font-medium">{m.label}</span>
                      </button>
                    ))}
                  </div>
                  {paymentMethod === 'credit' && selectedCustomer && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-2 text-xs text-orange-700">
                      <p className="font-medium">⚠️ Mode Crédit activé</p>
                      <p>Cette vente sera ajoutée à la dette de {selectedCustomer.name}</p>
                    </div>
                  )}
                  {paymentMethod === 'partial_credit' && selectedCustomer && (
                    <div className="space-y-3">
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-2 text-xs text-orange-700">
                        <p className="font-medium">💳 Paiement Partiel + Dette</p>
                        <p>Le client paie une partie, le reste devient une dette</p>
                      </div>
                      
                      {/* Saisie du montant payé */}
                      <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                        <Label className="text-xs mb-2 block font-medium text-gray-500">Montant payé par le client</Label>
                        <div className="flex gap-2 mb-3">
                          <Input
                            value={partialPaymentAmount}
                            onChange={(e) => setPartialPaymentAmount(e.target.value)}
                            type="number"
                            min="0"
                            max={totalAmount}
                            className="text-right font-mono text-lg font-bold"
                            placeholder="0"
                          />
                          <div className="bg-white px-3 py-2 rounded-md border text-sm font-bold text-gray-500">FCFA</div>
                        </div>
                        
                        {/* Affichage du reste en dette */}
                        {partialPaymentAmount && parseFloat(partialPaymentAmount) > 0 && (
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-500">Total à payer:</span>
                              <span className="font-bold">{formatCurrency(totalAmount)}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-500">Montant payé:</span>
                              <span className="font-bold text-emerald-600">{formatCurrency(parseFloat(partialPaymentAmount) || 0)}</span>
                            </div>
                            <div className="flex justify-between text-xs pt-2 border-t">
                              <span className="text-orange-600 font-medium">Reste en dette:</span>
                              <span className="font-bold text-red-600">{formatCurrency(Math.max(0, totalAmount - (parseFloat(partialPaymentAmount) || 0)))}</span>
                            </div>
                          </div>
                        )}
                        
                        <div className="grid grid-cols-3 gap-1.5 mt-3">
                          {['1000', '2000', '5000', '10000', '20000', '50000'].map(quickAmount => (
                            <button 
                              key={quickAmount} 
                              onClick={() => setPartialPaymentAmount(quickAmount)}
                              className="text-[10px] px-2 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-emerald-50 hover:border-emerald-200 font-medium transition-colors"
                            >
                              {formatCurrency(parseInt(quickAmount))}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {checkoutType === 'sale' && !isSplitMode && paymentMethod === 'cash' && (
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

              {/* Bloc Paiement Multiple (Split) */}
              {checkoutType === 'sale' && isSplitMode && (
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs font-medium text-gray-500">Paiement Multiple (Mixte)</Label>
                    <button onClick={() => { setIsSplitMode(false); clearSplits(); }} className="text-[10px] text-red-500 hover:underline">
                      Annuler
                    </button>
                  </div>

                  {/* Liste des paiements ajoutés */}
                  {splitPayments.length > 0 && (
                    <div className="space-y-2 bg-white p-2 rounded-lg border border-gray-100 shadow-sm">
                      {splitPayments.map((p, i) => (
                        <div key={i} className="flex justify-between items-center text-sm border-b pb-1 last:border-0 last:pb-0">
                          <span className="flex items-center gap-1.5 capitalize font-medium text-gray-700">
                             {p.method === 'cash' ? <Banknote size={14} className="text-emerald-500"/> 
                              : p.method === 'card' ? <CreditCard size={14} className="text-blue-500" />
                              : <Smartphone size={14} className="text-purple-500" />}
                             {p.method === 'cash' ? 'Espèces' : p.method === 'card' ? 'Carte' : 'Mobile'}
                          </span>
                          <div className="text-right">
                             <span className="font-bold text-emerald-700">{formatCurrency(p.amount)}</span>
                             {p.method === 'cash' && (p.received || 0) > p.amount && (
                               <span className="text-[10px] text-gray-400 block -mt-1">(donné: {formatCurrency(p.received || 0)})</span>
                             )}
                          </div>
                        </div>
                      ))}
                      
                      {splitTotal < totalAmount && (
                         <div className="pt-2 flex justify-between items-center text-xs font-bold text-orange-600">
                           <span>Reste à payer :</span>
                           <span>{formatCurrency(totalAmount - splitTotal)}</span>
                         </div>
                      )}
                    </div>
                  )}

                  {/* Saisie d'un nouveau paiement si reste */}
                  {splitTotal < totalAmount && (
                    <div className="pt-2 border-t mt-1 space-y-3">
                       <div className="grid grid-cols-3 gap-2">
                          {[
                            { value: 'cash', label: 'Espèces', icon: <Banknote size={14} /> },
                            { value: 'card', label: 'Carte', icon: <CreditCard size={14} /> },
                            { value: 'mobile', label: 'Mobile', icon: <Smartphone size={14} /> },
                          ].map(m => (
                            <button key={m.value} onClick={() => setPaymentMethod(m.value)}
                              className={`flex flex-col items-center gap-1 p-1.5 rounded-lg border transition-all ${paymentMethod === m.value
                                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500'
                                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                }`}>
                              {m.icon}
                              <span className="text-[10px] font-medium">{m.label}</span>
                            </button>
                          ))}
                       </div>

                       <div className="flex gap-2">
                          <Input
                            value={splitAmountsReceived[paymentMethod] || ''}
                            readOnly
                            className="text-right font-mono text-lg font-bold"
                            placeholder={formatCurrency(Math.max(0, totalAmount - splitTotal)).replace(/\s/g, '').replace('FCFA', '')}
                          />
                          <div className="bg-white px-3 py-2 rounded-md border text-sm font-bold text-gray-500">FCFA</div>
                       </div>
                       
                       <div className="grid grid-cols-4 gap-1.5 mb-2">
                        {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map(key => (
                          <button key={key} onClick={() => handleNumPadForSplit(paymentMethod, key)}
                            className={`h-8 rounded-lg font-bold text-xs transition-all active:scale-95 shadow-sm border ${key === 'C' ? 'bg-red-50 text-red-600 border-red-100 hover:bg-red-100'
                                : key === '⌫' ? 'bg-orange-50 text-orange-600 border-orange-100 hover:bg-orange-100'
                                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                              }`}>
                            {key === '⌫' ? <Delete size={14} className="mx-auto" /> : key}
                          </button>
                        ))}
                      </div>

                      <Button 
                        onClick={() => handleApplySplit(paymentMethod)}
                        disabled={!(parseFloat(splitAmountsReceived[paymentMethod]) > 0)}
                        size="sm"
                        className="w-full bg-slate-800 hover:bg-slate-900 text-white shadow-sm"
                      >
                         <Plus size={16} className="mr-2" /> Ajouter
                      </Button>
                    </div>
                  )}

                  {splitTotal >= totalAmount && (
                    <div className="bg-emerald-100 rounded-lg p-2 text-center text-sm font-bold text-emerald-800 flex items-center justify-center gap-2">
                      <Check size={16} /> Total atteint {isSplitMode && splitPayments.reduce((a,b)=>a+(b.received||b.amount),0) > totalAmount && `(Rendu ${formatCurrency(splitPayments.reduce((a,b)=>a+(b.received||b.amount),0) - totalAmount)})`}
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <Label className="text-xs font-medium text-gray-500" htmlFor="pos-cust">Client</Label>
                  <div className="mt-1">
                    {shopCustomers && shopCustomers.length > 0 ? (
                      <select
                        id="pos-cust"
                        value={selectedCustomer?.id || ''}
                        onChange={(e) => {
                          const customer = shopCustomers?.find(c => c.id === e.target.value);
                          setSelectedCustomer(customer || null);
                          setCustomerName(customer?.name || '');
                        }}
                        className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="">Client anonyme</option>
                        {shopCustomers.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    ) : (
                      <Input
                        id="pos-cust"
                        value={customerName}
                        onChange={e => setCustomerName(e.target.value)}
                        placeholder="Nom du client (optionnel)"
                      />
                    )}
                  </div>
                  {/* Afficher le solde si client sélectionné */}
                  {selectedCustomer && (
                    <CustomerBalanceDisplay customer={selectedCustomer} shopId={shopId} />
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
            <Button onClick={handleConfirmCheckout}
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
                <SectorProductCard
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

      {/* Zone droite : Sidebar panier (Desktop) - caché si panier vide */}
      {totalAmount > 0 && (
        <div className="hidden lg:block w-80 xl:w-96 shrink-0 z-10 shadow-xl lg:shadow-none">
          <CartSidebar />
        </div>
      )}

      {/* Mobile : Bouton flottant panier - caché si panier vide */}
      {totalAmount > 0 && (
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
      )}

      {/* Drawer Panier (mobile + tablette, jusqu'à lg) */}
      <Dialog open={mobileCartOpen} onOpenChange={setMobileCartOpen}>
        <DialogContent className="h-[85vh] p-0 gap-0 flex flex-col w-full max-w-full lg:max-w-2xl rounded-t-2xl !translate-y-0 !top-auto !bottom-0 data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom duration-300">
          <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mt-3 mb-1 shrink-0" />
          <div className="flex-1 overflow-hidden relative">
            <CartSidebar />
          </div>
        </DialogContent>
      </Dialog>

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
                    {/* Affichage paiement partiel + dette */}
                    {receiptData.payment === 'partial_credit' ? (
                      <div className="space-y-2 py-2 border-t border-b border-dashed">
                        <div className="flex justify-between text-sm">
                          <span>Payé (Espèces) :</span>
                          <span className="font-bold text-emerald-600">{formatCurrency(receiptData.amountReceived)}</span>
                        </div>
                        <div className="flex justify-between text-sm text-red-600">
                          <span>Reste en dette :</span>
                          <span className="font-bold">{formatCurrency(Math.max(0, receiptData.total - receiptData.amountReceived))}</span>
                        </div>
                      </div>
                    ) : receiptData.payment === 'credit' ? (
                      <p className="text-orange-600 font-medium">Payé à crédit (dette)</p>
                    ) : receiptData.payment.startsWith('{') ? (
                      // Paiement multiple (split)
                      <p className="text-sm">Paiement multiple (mixte)</p>
                    ) : (
                      <>
                        <p>Payé par : {receiptData.payment === 'cash' ? 'Espèces' : receiptData.payment === 'card' ? 'Carte' : 'Mobile'}</p>
                        {receiptData.payment === 'cash' && receiptData.amountReceived > receiptData.total && (
                          <>
                            <p>Reçu : {formatCurrency(receiptData.amountReceived)}</p>
                            <p className="font-bold text-emerald-600">Rendu : {formatCurrency(receiptData.change)}</p>
                          </>
                        )}
                      </>
                    )}
                  </div>
                )}
                {receiptData.type === 'quote' && (
                  <p className="text-gray-500 text-center italic">Devis valable 30 jours</p>
                )}
                  <div className="text-center text-gray-400 mt-2 space-y-2">
                    <p>Merci de votre visite !</p>
                    <div className="flex justify-center mt-2">
                      <svg ref={barcodeRef} className="mx-auto block" />
                    </div>
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
