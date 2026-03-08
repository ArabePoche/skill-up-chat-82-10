/**
 * Dialog de retour de produit du marketplace vers la boutique physique
 */
import React, { useState } from 'react';
import { ArrowDownLeft } from 'lucide-react';
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

export interface ReturnDialogProps {
    product: BoutiqueProduct | null;
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (productId: string, quantity: number) => void;
    isLoading?: boolean;
}

const ReturnDialog: React.FC<ReturnDialogProps> = ({
    product,
    isOpen,
    onClose,
    onConfirm,
    isLoading,
}) => {
    const [quantity, setQuantity] = useState(1);

    if (!product) return null;

    const marketplaceQty = product.marketplace_quantity;
    const isValid = quantity > 0 && quantity <= marketplaceQty;

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
                        <ArrowDownLeft size={20} className="text-orange-600" />
                        Retour en Boutique
                    </DialogTitle>
                    <DialogDescription>
                        Quelle quantité de <strong>{product.name}</strong> souhaitez-vous retirer du marketplace ?
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {/* Infos stock en ligne */}
                    <div className="bg-orange-50 rounded-lg p-3 text-center">
                        <div className="text-orange-600 text-xs font-medium">Actuellement en ligne</div>
                        <div className="font-bold text-2xl text-orange-700">{marketplaceQty}</div>
                    </div>

                    {/* Input quantité */}
                    <div className="space-y-1.5">
                        <Label htmlFor="return-quantity" className="text-sm">
                            Quantité à retourner
                        </Label>
                        <Input
                            id="return-quantity"
                            type="number"
                            min={1}
                            max={marketplaceQty}
                            value={quantity}
                            onChange={(e) => setQuantity(Math.max(1, Math.min(marketplaceQty, parseInt(e.target.value) || 0)))}
                            className="text-center text-lg font-bold"
                        />
                        {quantity > marketplaceQty && (
                            <p className="text-xs text-red-500">
                                Le stock en ligne n'est que de {marketplaceQty}.
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
                        className="bg-orange-600 hover:bg-orange-700 text-white"
                    >
                        {isLoading ? 'Traitement...' : `Rapatrier ${quantity} unité(s)`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default ReturnDialog;
