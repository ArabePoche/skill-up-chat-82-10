/**
 * Dialog pour créer un transfert entre boutiques
 */
import React, { useState } from 'react';
import { ArrowRight, Package } from 'lucide-react';
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
import { useUserShops } from '@/hooks/shop/useMultiShop';
import { useAvailableProductsForTransfer, useCreateInterShopTransfer } from '@/hooks/shop/useInterShopTransfers';

interface CreateTransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CreateTransferDialog: React.FC<CreateTransferDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const [fromShopId, setFromShopId] = useState<string>('');
  const [toShopId, setToShopId] = useState<string>('');
  const [productId, setProductId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [notes, setNotes] = useState<string>('');

  const { data: shops = [] } = useUserShops();
  const { data: availableProducts = [] } = useAvailableProductsForTransfer(fromShopId);
  const createTransfer = useCreateInterShopTransfer();

  const selectedProduct = availableProducts.find(p => p.id === productId);
  const maxQuantity = selectedProduct?.stock_quantity || 0;

  const handleSubmit = async () => {
    if (!fromShopId || !toShopId || !productId || quantity <= 0) return;

    try {
      await createTransfer.mutateAsync({
        fromShopId,
        toShopId,
        productId,
        quantity,
        notes: notes.trim() || undefined,
      });
      
      handleClose();
    } catch (error) {
      console.error('Erreur création transfert:', error);
    }
  };

  const handleClose = () => {
    setFromShopId('');
    setToShopId('');
    setProductId('');
    setQuantity(1);
    setNotes('');
    onOpenChange(false);
  };

  const availableToShops = shops.filter(shop => shop.id !== fromShopId);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package size={20} className="text-emerald-600" />
            Nouveau transfert entre boutiques
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Boutique source */}
          <div className="space-y-2">
            <Label>Boutique source</Label>
            <Select value={fromShopId} onValueChange={setFromShopId}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir la boutique source" />
              </SelectTrigger>
              <SelectContent>
                {shops.map(shop => (
                  <SelectItem key={shop.id} value={shop.id}>
                    {shop.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Boutique destination */}
          <div className="space-y-2">
            <Label>Boutique destination</Label>
            <Select value={toShopId} onValueChange={setToShopId} disabled={!fromShopId}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir la boutique destination" />
              </SelectTrigger>
              <SelectContent>
                {availableToShops.map(shop => (
                  <SelectItem key={shop.id} value={shop.id}>
                    {shop.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Flèche indicative */}
          {fromShopId && toShopId && (
            <div className="flex items-center justify-center py-2">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span>{shops.find(s => s.id === fromShopId)?.name}</span>
                <ArrowRight size={16} />
                <span>{shops.find(s => s.id === toShopId)?.name}</span>
              </div>
            </div>
          )}

          {/* Produit */}
          <div className="space-y-2">
            <Label>Produit à transférer</Label>
            <Select value={productId} onValueChange={setProductId} disabled={!fromShopId}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir le produit" />
              </SelectTrigger>
              <SelectContent>
                {availableProducts.map(product => (
                  <SelectItem key={product.id} value={product.id}>
                    <div className="flex items-center justify-between w-full">
                      <span>{product.name}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        Stock: {product.stock_quantity}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quantité */}
          <div className="space-y-2">
            <Label>Quantité</Label>
            <Input
              type="number"
              min={1}
              max={maxQuantity}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Math.min(maxQuantity, parseInt(e.target.value) || 1)))}
              disabled={!productId}
            />
            {selectedProduct && (
              <p className="text-xs text-muted-foreground">
                Stock disponible: {selectedProduct.stock_quantity} unité(s)
              </p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes (optionnel)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Raison du transfert, instructions..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!fromShopId || !toShopId || !productId || quantity <= 0 || quantity > maxQuantity || createTransfer.isPending}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {createTransfer.isPending ? 'Création...' : 'Créer le transfert'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateTransferDialog;