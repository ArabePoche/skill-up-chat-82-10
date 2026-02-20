/**
 * Carte produit pour la gestion de boutique physique
 * Affiche stock, prix, et quantité marketplace
 */
import React from 'react';
import { Package, ArrowUpRight, Edit2, Trash2, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { BoutiqueProduct } from '@/hooks/shop/useBoutiqueProducts';

interface BoutiqueProductCardProps {
    product: BoutiqueProduct;
    onEdit: (product: BoutiqueProduct) => void;
    onDelete: (productId: string) => void;
    onTransfer: (product: BoutiqueProduct) => void;
    onSell: (product: BoutiqueProduct) => void;
}

const BoutiqueProductCard: React.FC<BoutiqueProductCardProps> = ({
    product,
    onEdit,
    onDelete,
    onTransfer,
    onSell,
}) => {
    const availableStock = product.stock_quantity - product.marketplace_quantity;

    return (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden">
            {/* Image */}
            <div className="aspect-[4/3] bg-gradient-to-br from-gray-100 to-gray-50 relative overflow-hidden">
                {product.image_url ? (
                    <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="flex items-center justify-center h-full">
                        <Package size={40} className="text-gray-300" />
                    </div>
                )}

                {/* Badge marketplace */}
                {product.marketplace_quantity > 0 && (
                    <div className="absolute top-2 right-2 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
                        En ligne : {product.marketplace_quantity}
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="p-3 space-y-2">
                <h3 className="font-semibold text-sm text-gray-900 truncate">{product.name}</h3>

                {product.description && (
                    <p className="text-xs text-gray-500 line-clamp-2">{product.description}</p>
                )}

                {/* Stats */}
                <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-blue-700">{product.price.toFixed(2)} €</span>
                    <div className="flex items-center gap-3">
                        <span className="text-gray-500">
                            Stock : <span className={`font-semibold ${availableStock <= 0 ? 'text-red-500' : 'text-gray-800'}`}>
                                {availableStock}
                            </span>
                        </span>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 pt-1 border-t border-gray-100">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onSell(product)}
                        disabled={availableStock <= 0}
                        className="flex-1 text-xs h-8 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                    >
                        <ShoppingCart size={14} className="mr-1" />
                        Vendre
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onTransfer(product)}
                        disabled={availableStock <= 0}
                        className="text-xs h-8 text-blue-700 border-blue-200 hover:bg-blue-50"
                    >
                        <ArrowUpRight size={14} />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(product)}
                        className="h-8 w-8 text-gray-500 hover:text-blue-600"
                    >
                        <Edit2 size={14} />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(product.id)}
                        className="h-8 w-8 text-gray-500 hover:text-red-600"
                    >
                        <Trash2 size={14} />
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default BoutiqueProductCard;
