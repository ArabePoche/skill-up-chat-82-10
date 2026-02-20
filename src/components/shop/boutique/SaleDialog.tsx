/**
 * Dialog POS pour enregistrer une vente en boutique physique
 * Permet de saisir quantité, client, mode de paiement et notes
 */
import React, { useState, useEffect } from 'react';
import { ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { BoutiqueProduct } from '@/hooks/shop/useBoutiqueProducts';

interface SaleDialogProps {
  product: BoutiqueProduct | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: {
    productId: string;
    quantity: number;
    unitPrice: number;
    totalAmount: number;
    customerName?: string;
    paymentMethod: string;
    notes?: string;
  }) => void;
  isLoading: boolean;
}

const SaleDialog: React.FC<SaleDialogProps> = ({
  product,
  isOpen,
  onClose,
  onConfirm,
  isLoading,
}) => {
  const [quantity, setQuantity] = useState(1);
  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [notes, setNotes] = useState('');

  const availableStock = product
    ? product.stock_quantity - product.marketplace_quantity
    : 0;

  const totalAmount = product ? quantity * product.price : 0;

  // Reset form on open
  useEffect(() => {
    if (isOpen) {
      setQuantity(1);
      setCustomerName('');
      setPaymentMethod('cash');
      setNotes('');
    }
  }, [isOpen]);

  const handleSubmit = () => {
    if (!product || quantity <= 0 || quantity > availableStock) return;
    onConfirm({
      productId: product.id,
      quantity,
      unitPrice: product.price,
      totalAmount,
      customerName: customerName.trim() || undefined,
      paymentMethod,
      notes: notes.trim() || undefined,
    });
  };

  if (!product) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart size={18} className="text-emerald-600" />
            Vendre — {product.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Prix unitaire (lecture seule) */}
          <div>
            <Label>Prix unitaire</Label>
            <div className="text-lg font-bold text-emerald-700">
              {product.price.toFixed(2)} €
            </div>
          </div>

          {/* Quantité */}
          <div>
            <Label htmlFor="sale-qty">Quantité (max : {availableStock})</Label>
            <Input
              id="sale-qty"
              type="number"
              min={1}
              max={availableStock}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Math.min(availableStock, parseInt(e.target.value) || 1)))}
            />
          </div>

          {/* Total */}
          <div className="bg-emerald-50 rounded-lg p-3 text-center">
            <span className="text-sm text-muted-foreground">Total</span>
            <div className="text-2xl font-bold text-emerald-700">
              {totalAmount.toFixed(2)} €
            </div>
          </div>

          {/* Mode de paiement */}
          <div>
            <Label>Mode de paiement</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Espèces</SelectItem>
                <SelectItem value="card">Carte bancaire</SelectItem>
                <SelectItem value="mobile">Mobile Money</SelectItem>
                <SelectItem value="transfer">Virement</SelectItem>
                <SelectItem value="other">Autre</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Nom du client (optionnel) */}
          <div>
            <Label htmlFor="sale-customer">Nom du client (optionnel)</Label>
            <Input
              id="sale-customer"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Client anonyme"
            />
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="sale-notes">Notes (optionnel)</Label>
            <Textarea
              id="sale-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes sur la vente..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || quantity <= 0 || quantity > availableStock}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {isLoading ? 'Enregistrement...' : `Vendre — ${totalAmount.toFixed(2)} €`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SaleDialog;
