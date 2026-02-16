/**
 * Dialog de transfert de produit vers le marketplace
 */
import React, { useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from '@/components/ui/dialog';
import type { BoutiqueProduct } from '@/hooks/shop/useBoutiqueProducts';

interface TransferDialogProps {
    product: BoutiqueProduct | null;
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (productId: string, quantity: number) => void;
    isLoading?: boolean;
}

const TransferDialog: React.FC<TransferDialogProps> = ({
    product,
    isOpen,
    onClose,
    onConfirm,
    isLoading,
}) => {
    const [quantity, setQuantity] = useState(1);

    if (!product) return null;

    const availableStock = product.stock_quantity - product.marketplace_quantity;
    const isValid = quantity > 0 && quantity <= availableStock;

    const handleConfirm = () => {
        if (isValid) {
            onConfirm(product.id, quantity);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ArrowUpRight size={20} className="text-emerald-600" />
                        Transférer vers le Marketplace
                    </DialogTitle>
                    <DialogDescription>
                        Choisissez la quantité de <strong>{product.name}</strong> à rendre disponible en ligne.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {/* Infos stock */}
                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="bg-gray-50 rounded-lg p-2.5 text-center">
                            <div className="text-gray-500 text-xs">Stock total</div>
                            <div className="font-bold text-lg text-gray-800">{product.stock_quantity}</div>
                        </div>
                        <div className="bg-emerald-50 rounded-lg p-2.5 text-center">
                            <div className="text-emerald-600 text-xs">Disponible</div>
                            <div className="font-bold text-lg text-emerald-700">{availableStock}</div>
                        </div>
                    </div>

                    {/* Déjà en ligne */}
                    {product.marketplace_quantity > 0 && (
                        <div className="text-xs text-blue-600 bg-blue-50 rounded-lg p-2 text-center">
                            Déjà en ligne : {product.marketplace_quantity} unité(s)
                        </div>
                    )}

                    {/* Input quantité */}
                    <div className="space-y-1.5">
                        <Label htmlFor="transfer-quantity" className="text-sm">
                            Quantité à transférer
                        </Label>
                        <Input
                            id="transfer-quantity"
                            type="number"
                            min={1}
                            max={availableStock}
                            value={quantity}
                            onChange={(e) => setQuantity(Math.max(1, Math.min(availableStock, parseInt(e.target.value) || 0)))}
                            className="text-center text-lg font-bold"
                        />
                        {!isValid && quantity > availableStock && (
                            <p className="text-xs text-red-500">
                                Quantité maximum : {availableStock}
                            </p>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isLoading}>
                        Annuler
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={!isValid || isLoading}
                        className="bg-emerald-600 hover:bg-emerald-700"
                    >
                        {isLoading ? 'Transfert...' : `Transférer ${quantity} unité(s)`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default TransferDialog;
