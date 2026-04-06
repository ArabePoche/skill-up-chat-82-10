/**
 * Dialog pour acheter un produit marketplace en Soumboulah Cash
 * Affiche le prix SC, la commission et le mécanisme d'escrow
 */
import React, { useState } from 'react';
import { ShieldCheck, Coins, AlertTriangle, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { useNavigate } from 'react-router-dom';
import { useCreateMarketplaceOrder, useMarketplaceCommissionSettings, useScToFcfaRate, fcfaToSc, DEFAULT_SC_TO_FCFA_RATE } from '../hooks/useMarketplaceOrders';
import { useUserWallet } from '@/hooks/useUserWallet';

interface BuyWithScDialogProps {
  product: {
    id: string;
    title: string;
    price: number;
    seller_id?: string;
    profiles?: any;
  } | null;
  isOpen: boolean;
  onClose: () => void;
}

const normalizeNumericValue = (value: unknown) => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === 'string') {
    const normalized = Number(value.replace(',', '.').trim());
    return Number.isFinite(normalized) ? normalized : 0;
  }

  return 0;
};

const BuyWithScDialog: React.FC<BuyWithScDialogProps> = ({ product, isOpen, onClose }) => {
  const [quantity, setQuantity] = useState(1);
  const [shippingAddress, setShippingAddress] = useState('');
  const [notes, setNotes] = useState('');

  const navigate = useNavigate();
  const { wallet } = useUserWallet();
  const { data: commissionSettings } = useMarketplaceCommissionSettings();
  const { data: scRate } = useScToFcfaRate();
  const { mutate: createOrder, isPending } = useCreateMarketplaceOrder();

  if (!product) return null;

  const normalizedPrice = normalizeNumericValue(product.price);
  const rate = normalizeNumericValue(scRate) || DEFAULT_SC_TO_FCFA_RATE;
  const commissionRate = commissionSettings?.commission_rate || 5;
  const unitPriceSc = fcfaToSc(normalizedPrice, rate);
  const totalSc = unitPriceSc * quantity;
  const commissionSc = totalSc * commissionRate / 100;
  const sellerSc = totalSc - commissionSc;
  const hasEnough = (wallet?.soumboulah_cash || 0) >= totalSc;
  const hasValidPrice = normalizedPrice > 0;

  const formatSc = (value: number) =>
    new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(value);

  const formatFcfa = (value: number) =>
    new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);

  const handleBuy = () => {
    if (!product.seller_id && !product.profiles?.id) return;
    createOrder({
      productId: product.id,
      sellerId: product.seller_id || product.profiles?.id,
      quantity,
      unitPrice: normalizedPrice,
      scAmount: unitPriceSc,
      commissionRate,
      shippingAddress: shippingAddress.trim() || undefined,
      notes: notes.trim() || undefined,
    }, {
      onSuccess: () => {
        onClose();
        setQuantity(1);
        setShippingAddress('');
        setNotes('');
        navigate('/my-orders');
      },
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[calc(100vw-1rem)] max-w-md max-h-[85vh] overflow-hidden p-0 gap-0">
        <DialogHeader className="sticky top-0 z-10 border-b bg-background px-4 py-4 sm:px-6">
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="text-emerald-600" size={20} />
            Achat sécurisé en SC
          </DialogTitle>
          <DialogDescription>
            Votre paiement est retenu jusqu'à confirmation de réception
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto px-4 py-4 sm:px-6">
          <div className="space-y-4">
            <div className="text-sm font-medium line-clamp-2">{product.title}</div>

            {/* Prix */}
            <div className="bg-emerald-50 rounded-lg p-4 space-y-2">
              <div className="flex items-start justify-between gap-3 text-sm">
                <span>Prix unitaire</span>
                <span className="text-right font-bold">
                  {formatSc(unitPriceSc)} SC
                  <span className="block text-muted-foreground text-xs font-medium">{formatFcfa(normalizedPrice)} FCFA</span>
                </span>
              </div>
              <div className="rounded-md bg-white/70 px-3 py-2 text-xs text-emerald-900">
                Taux appliqué: 1 SC = {formatFcfa(rate)} FCFA
              </div>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span>Quantité</span>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
                  className="w-20 h-8 text-center"
                />
              </div>
              <hr />
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span className="text-emerald-700">{formatSc(totalSc)} SC</span>
              </div>
              <div className="text-xs text-muted-foreground text-right">
                Commission plateforme : {formatSc(commissionSc)} SC ({commissionRate}%) · Vendeur reçoit : {formatSc(sellerSc)} SC
              </div>
              {!hasValidPrice && (
                <div className="rounded-md bg-amber-100 px-3 py-2 text-xs text-amber-900">
                  Le prix du produit est invalide et ne peut pas encore être converti en SC.
                </div>
              )}
            </div>

            {/* Solde */}
            <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${hasEnough ? 'bg-blue-50 text-blue-800' : 'bg-red-50 text-red-800'}`}>
              <Coins size={16} />
              <span>Votre solde : <strong>{wallet?.soumboulah_cash || 0} SC</strong></span>
              {!hasEnough && (
                <span className="flex items-center gap-1 ml-auto text-red-600">
                  <AlertTriangle size={14} /> Insuffisant
                </span>
              )}
            </div>

            {/* Escrow info */}
            <div className="bg-amber-50 rounded-lg p-3 text-xs text-amber-800 space-y-1">
              <p className="font-semibold flex items-center gap-1">
                <ShieldCheck size={14} /> Paiement sécurisé (Escrow)
              </p>
              <p>• Le montant est retenu jusqu'à votre confirmation de réception</p>
              <p>• En cas de litige, un administrateur tranchera</p>
              <p>• Si pas de réclamation, le paiement est libéré automatiquement</p>
            </div>

            {/* Adresse */}
            <div>
              <Label>Adresse de livraison</Label>
              <Input
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
                placeholder="Votre adresse complète"
              />
            </div>

            {/* Notes */}
            <div>
              <Label>Notes (optionnel)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Instructions pour le vendeur..."
                rows={2}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="sticky bottom-0 z-10 border-t bg-background px-4 py-4 sm:px-6">
          <Button variant="outline" onClick={onClose} disabled={isPending}>Annuler</Button>
          <Button
            onClick={handleBuy}
            disabled={isPending || !hasEnough || !shippingAddress.trim() || !hasValidPrice}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {isPending ? 'Traitement...' : `Payer ${formatSc(totalSc)} SC`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BuyWithScDialog;
