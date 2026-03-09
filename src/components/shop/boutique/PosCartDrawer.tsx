/**
 * Drawer POS : panier de la boutique physique
 * Permet de valider une vente (facture/ticket), créer un devis, ou annuler
 */
import React, { useState, useRef } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
    ShoppingCart,
    Trash2,
    Plus,
    Minus,
    Receipt,
    FileText,
    X,
    Printer,
    Package,
    CreditCard,
    Banknote,
    Smartphone,
} from 'lucide-react';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
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
import type { PosCartItem } from '@/hooks/shop/usePosCart';

type CheckoutMode = 'sale' | 'quote' | null;

interface PosCartDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    items: PosCartItem[];
    totalAmount: number;
    totalItems: number;
    onUpdateQuantity: (productId: string, quantity: number) => void;
    onRemoveItem: (productId: string) => void;
    onClearCart: () => void;
    onConfirmSale: (data: {
        customerName?: string;
        paymentMethod: string;
        notes?: string;
    }) => Promise<void>;
    isProcessing: boolean;
    shopName: string;
}

const PosCartDrawer: React.FC<PosCartDrawerProps> = ({
    open,
    onOpenChange,
    items,
    totalAmount,
    totalItems,
    onUpdateQuantity,
    onRemoveItem,
    onClearCart,
    onConfirmSale,
    isProcessing,
    shopName,
}) => {
    const [checkoutMode, setCheckoutMode] = useState<CheckoutMode>(null);
    const [customerName, setCustomerName] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [notes, setNotes] = useState('');
    const [showReceipt, setShowReceipt] = useState(false);
    const [receiptData, setReceiptData] = useState<{
        items: PosCartItem[];
        total: number;
        customer: string;
        payment: string;
        date: Date;
        type: 'sale' | 'quote';
    } | null>(null);
    const receiptRef = useRef<HTMLDivElement>(null);

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'XOF',
            minimumFractionDigits: 0,
        }).format(amount);

    const paymentMethods = [
        { value: 'cash', label: 'Espèces', icon: <Banknote size={16} /> },
        { value: 'card', label: 'Carte', icon: <CreditCard size={16} /> },
        { value: 'mobile', label: 'Mobile', icon: <Smartphone size={16} /> },
    ];

    const handleCheckout = async () => {
        if (checkoutMode === 'sale') {
            await onConfirmSale({
                customerName: customerName.trim() || undefined,
                paymentMethod,
                notes: notes.trim() || undefined,
            });
        }

        // Préparer le reçu/devis
        setReceiptData({
            items: [...items],
            total: totalAmount,
            customer: customerName.trim() || 'Client anonyme',
            payment: paymentMethod,
            date: new Date(),
            type: checkoutMode || 'sale',
        });

        setShowReceipt(true);
        setCheckoutMode(null);
        resetForm();
    };

    const resetForm = () => {
        setCustomerName('');
        setPaymentMethod('cash');
        setNotes('');
    };

    const handlePrint = () => {
        if (receiptRef.current) {
            const printWindow = window.open('', '_blank');
            if (printWindow) {
                printWindow.document.write(`
                    <html><head><title>${receiptData?.type === 'quote' ? 'Devis' : 'Ticket'}</title>
                    <style>
                        body { font-family: 'Courier New', monospace; max-width: 300px; margin: 0 auto; padding: 10px; font-size: 12px; }
                        .center { text-align: center; }
                        .bold { font-weight: bold; }
                        .line { border-top: 1px dashed #000; margin: 8px 0; }
                        .row { display: flex; justify-content: space-between; margin: 4px 0; }
                        .total { font-size: 16px; font-weight: bold; }
                        @media print { body { margin: 0; } }
                    </style></head><body>
                    ${receiptRef.current.innerHTML}
                    </body></html>
                `);
                printWindow.document.close();
                printWindow.print();
            }
        }
    };

    return (
        <>
            <Sheet open={open} onOpenChange={onOpenChange}>
                <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
                    <SheetHeader className="p-4 border-b bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shrink-0">
                        <SheetTitle className="text-white flex items-center gap-2">
                            <ShoppingCart size={20} />
                            Panier ({totalItems})
                        </SheetTitle>
                    </SheetHeader>

                    {items.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center p-8">
                            <div className="text-center text-muted-foreground">
                                <ShoppingCart size={48} className="mx-auto mb-3 opacity-30" />
                                <p className="font-medium">Panier vide</p>
                                <p className="text-sm mt-1">Ajoutez des produits pour commencer</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Liste des articles */}
                            <ScrollArea className="flex-1">
                                <div className="p-3 space-y-2">
                                    {items.map((item) => {
                                        const maxStock = item.product.stock_quantity - item.product.marketplace_quantity;
                                        return (
                                            <div
                                                key={item.product.id}
                                                className="bg-card border rounded-xl p-3 flex gap-3"
                                            >
                                                {/* Image */}
                                                <div className="w-14 h-14 rounded-lg bg-muted shrink-0 overflow-hidden">
                                                    {item.product.image_url ? (
                                                        <img
                                                            src={item.product.image_url}
                                                            alt={item.product.name}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center">
                                                            <Package size={20} className="text-muted-foreground/50" />
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Infos */}
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-sm truncate">{item.product.name}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {formatCurrency(item.product.price)} / unité
                                                    </p>

                                                    {/* Quantité */}
                                                    <div className="flex items-center gap-2 mt-2">
                                                        <Button
                                                            variant="outline"
                                                            size="icon"
                                                            className="h-7 w-7"
                                                            onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
                                                        >
                                                            <Minus size={12} />
                                                        </Button>
                                                        <span className="text-sm font-bold w-8 text-center">
                                                            {item.quantity}
                                                        </span>
                                                        <Button
                                                            variant="outline"
                                                            size="icon"
                                                            className="h-7 w-7"
                                                            onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                                                            disabled={item.quantity >= maxStock}
                                                        >
                                                            <Plus size={12} />
                                                        </Button>
                                                    </div>
                                                </div>

                                                {/* Prix + Supprimer */}
                                                <div className="flex flex-col items-end justify-between">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                                        onClick={() => onRemoveItem(item.product.id)}
                                                    >
                                                        <Trash2 size={14} />
                                                    </Button>
                                                    <p className="font-bold text-sm text-emerald-700">
                                                        {formatCurrency(item.product.price * item.quantity)}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </ScrollArea>

                            {/* Footer avec total et actions */}
                            <div className="border-t bg-card p-4 space-y-3 shrink-0">
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground font-medium">Total</span>
                                    <span className="text-2xl font-bold text-emerald-700">
                                        {formatCurrency(totalAmount)}
                                    </span>
                                </div>

                                <div className="grid grid-cols-3 gap-2">
                                    <Button
                                        onClick={() => setCheckoutMode('sale')}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white flex-col h-auto py-3"
                                    >
                                        <Receipt size={18} className="mb-1" />
                                        <span className="text-[10px]">Vendre</span>
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => setCheckoutMode('quote')}
                                        className="flex-col h-auto py-3 text-blue-600 border-blue-200 hover:bg-blue-50"
                                    >
                                        <FileText size={18} className="mb-1" />
                                        <span className="text-[10px]">Devis</span>
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={onClearCart}
                                        className="flex-col h-auto py-3 text-destructive border-destructive/30 hover:bg-destructive/10"
                                    >
                                        <X size={18} className="mb-1" />
                                        <span className="text-[10px]">Annuler</span>
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}
                </SheetContent>
            </Sheet>

            {/* Dialog checkout (vente ou devis) */}
            <Dialog open={!!checkoutMode} onOpenChange={(open) => !open && setCheckoutMode(null)}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {checkoutMode === 'sale' ? (
                                <>
                                    <Receipt size={18} className="text-emerald-600" />
                                    Finaliser la vente
                                </>
                            ) : (
                                <>
                                    <FileText size={18} className="text-blue-600" />
                                    Créer un devis
                                </>
                            )}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        {/* Résumé */}
                        <div className="bg-muted/50 rounded-lg p-3">
                            <p className="text-sm text-muted-foreground">
                                {items.length} article{items.length > 1 ? 's' : ''} • {totalItems} unité{totalItems > 1 ? 's' : ''}
                            </p>
                            <p className="text-xl font-bold text-foreground mt-1">
                                {formatCurrency(totalAmount)}
                            </p>
                        </div>

                        {/* Mode de paiement (vente uniquement) */}
                        {checkoutMode === 'sale' && (
                            <div>
                                <Label className="mb-2 block">Mode de paiement</Label>
                                <div className="grid grid-cols-3 gap-2">
                                    {paymentMethods.map((m) => (
                                        <button
                                            key={m.value}
                                            onClick={() => setPaymentMethod(m.value)}
                                            className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${
                                                paymentMethod === m.value
                                                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                                    : 'border-border hover:border-muted-foreground/30'
                                            }`}
                                        >
                                            {m.icon}
                                            <span className="text-[10px] font-medium">{m.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Nom client */}
                        <div>
                            <Label htmlFor="pos-customer">Client (optionnel)</Label>
                            <Input
                                id="pos-customer"
                                value={customerName}
                                onChange={(e) => setCustomerName(e.target.value)}
                                placeholder="Nom du client"
                            />
                        </div>

                        {/* Notes */}
                        <div>
                            <Label htmlFor="pos-notes">Notes (optionnel)</Label>
                            <Textarea
                                id="pos-notes"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Notes..."
                                rows={2}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCheckoutMode(null)}>
                            Retour
                        </Button>
                        <Button
                            onClick={handleCheckout}
                            disabled={isProcessing}
                            className={checkoutMode === 'sale'
                                ? 'bg-emerald-600 hover:bg-emerald-700'
                                : 'bg-blue-600 hover:bg-blue-700'
                            }
                        >
                            {isProcessing
                                ? 'Traitement...'
                                : checkoutMode === 'sale'
                                ? `Valider ${formatCurrency(totalAmount)}`
                                : 'Générer le devis'
                            }
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dialog reçu/ticket */}
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
                                <div className="center text-center">
                                    <p className="bold font-bold text-sm">{shopName}</p>
                                    <p className="text-muted-foreground">
                                        {receiptData.type === 'quote' ? '--- DEVIS ---' : '--- TICKET DE CAISSE ---'}
                                    </p>
                                    <p className="text-muted-foreground">
                                        {format(receiptData.date, 'dd/MM/yyyy HH:mm', { locale: fr })}
                                    </p>
                                </div>

                                <Separator />

                                <div>
                                    <p className="text-muted-foreground mb-1">Client : {receiptData.customer}</p>
                                </div>

                                <Separator />

                                <div className="space-y-2">
                                    {receiptData.items.map((item) => (
                                        <div key={item.product.id}>
                                            <div className="row flex justify-between">
                                                <span className="truncate flex-1">{item.product.name}</span>
                                            </div>
                                            <div className="row flex justify-between text-muted-foreground">
                                                <span>{item.quantity} x {formatCurrency(item.product.price)}</span>
                                                <span className="font-medium text-foreground">
                                                    {formatCurrency(item.product.price * item.quantity)}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <Separator />

                                <div className="row flex justify-between total text-base font-bold">
                                    <span>TOTAL</span>
                                    <span>{formatCurrency(receiptData.total)}</span>
                                </div>

                                {receiptData.type === 'sale' && (
                                    <p className="text-muted-foreground text-center">
                                        Payé par : {receiptData.payment === 'cash' ? 'Espèces' : receiptData.payment === 'card' ? 'Carte' : 'Mobile'}
                                    </p>
                                )}

                                {receiptData.type === 'quote' && (
                                    <p className="text-muted-foreground text-center italic">
                                        Devis valable 30 jours
                                    </p>
                                )}

                                <div className="text-center text-muted-foreground mt-2">
                                    <p>Merci de votre visite !</p>
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="flex gap-2">
                        <Button variant="outline" onClick={() => setShowReceipt(false)} className="flex-1">
                            Fermer
                        </Button>
                        <Button onClick={handlePrint} className="flex-1">
                            <Printer size={16} className="mr-2" />
                            Imprimer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default PosCartDrawer;
