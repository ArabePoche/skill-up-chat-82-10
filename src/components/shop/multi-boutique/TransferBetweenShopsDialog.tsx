/**
 * Dialog pour transférer un produit entre boutiques
 */
import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';
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
import { useCreateInterShopTransfer } from '@/hooks/shop/useInterShopTransfers';
import type { ShopWithProducts } from '@/hooks/shop/useMultiShop';

interface TransferBetweenShopsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
  fromShopId: string;
  fromShopName: string;
  availableShops: ShopWithProducts[];
}

const TransferBetweenShopsDialog: React.FC<TransferBetweenShopsDialogProps> = ({
  isOpen,
  onClose,
  productId,
  productName,
  fromShopId,
  fromShopName,
  availableShops,
}) => {
  const [toShopId, setToShopId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [notes, setNotes] = useState<string>('');
  const [livreur, setLivreur] = useState<string>('');

  const createTransfer = useCreateInterShopTransfer();

  const handleSubmit = async () => {
    if (!toShopId || quantity <= 0) return;

    try {
      await createTransfer.mutateAsync({
        fromShopId,
        toShopId,
        productId,
        quantity,
        notes: notes.trim() || undefined,
        livreur: livreur.trim() || undefined,
      });
      
      handleClose();
    } catch (error) {
      console.error('Erreur création transfert:', error);
    }
  };

  const handleClose = () => {
    setToShopId('');
    setQuantity(1);
    setNotes('');
    setLivreur('');
    onClose();
  };

  const selectedToShop = availableShops.find(shop => shop.id === toShopId);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Transférer vers une autre boutique</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Produit et boutique source */}
          <div className="bg-muted/30 rounded-lg p-3">
            <div className="text-sm text-muted-foreground mb-1">Produit à transférer</div>
            <div className="font-medium">{productName}</div>
            <div className="text-sm text-muted-foreground mt-1">
              Depuis: {fromShopName}
            </div>
          </div>

          {/* Boutique destination */}
          <div className="space-y-2">
            <Label>Boutique de destination</Label>
            <Select value={toShopId} onValueChange={setToShopId}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir la boutique destination" />
              </SelectTrigger>
              <SelectContent>
                {availableShops.map(shop => (
                  <SelectItem key={shop.id} value={shop.id}>
                    <div className="flex flex-col">
                      <span>{shop.name}</span>
                      {shop.address && (
                        <span className="text-xs text-muted-foreground">{shop.address}</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Flèche indicative */}
          {toShopId && (
            <div className="flex items-center justify-center py-2">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span>{fromShopName}</span>
                <ArrowRight size={16} />
                <span>{selectedToShop?.name}</span>
              </div>
            </div>
          )}

          {/* Quantité */}
          <div className="space-y-2">
            <Label>Quantité à transférer</Label>
            <Input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
            />
          </div>

          {/* Livreur */}
          <div className="space-y-2">
            <Label>Livreur / Intermédiaire (optionnel)</Label>
            <Input
              value={livreur}
              onChange={(e) => setLivreur(e.target.value)}
              placeholder="Ex: Jean Paul..."
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes (optionnel)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Raison du transfert, instructions particulières..."
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
            disabled={!toShopId || quantity <= 0 || createTransfer.isPending}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {createTransfer.isPending ? 'Transfert...' : `Transférer ${quantity} unité(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TransferBetweenShopsDialog;