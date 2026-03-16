import React, { useState } from 'react';
import { Package, ArrowUpRight, ArrowDownLeft, Edit2, Trash2, Plus, Minus, ShoppingCart, Barcode, Globe, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ProductBarcodePrint from './ProductBarcodePrint';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { BoutiqueProduct } from '@/hooks/shop/useBoutiqueProducts';

interface BoutiqueProductCardProps {
    product: BoutiqueProduct;
    onEdit: (product: BoutiqueProduct) => void;
    onDelete: (productId: string) => void;
    onTransfer: (product: BoutiqueProduct) => void;
    onReturn: (product: BoutiqueProduct) => void;
    onAddToCart: (product: BoutiqueProduct, qty?: number) => void;
    cartQuantity?: number;
}

const BoutiqueProductCard: React.FC<BoutiqueProductCardProps> = ({
    product,
    onEdit,
    onDelete,
    onTransfer,
    onReturn,
    onAddToCart,
    cartQuantity = 0,
}) => {
    const [qty, setQty] = useState(1);
    // Calcul du stock disponible (physique - panier)
    const availablePhysicalStock = product.stock_quantity - (product.marketplace_quantity || 0);
    const remainingStock = Math.max(0, availablePhysicalStock - cartQuantity);

    const formatPrice = (price: number) => 
        new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(price);

    return (
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden flex flex-col h-full hover:shadow-md transition-shadow">
            {/* Image & Badges */}
            <div className="relative aspect-square bg-gray-50 shrink-0">
                {product.image_url ? (
                    <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="flex items-center justify-center w-full h-full text-gray-300">
                        <Package size={24} />
                    </div>
                )}
                
                {/* Actions overlay (top-right) - Remplacé par boutons directs */}
                <div className="absolute top-1 right-1 flex gap-1">
                    <button onClick={() => onEdit(product)} className="h-6 w-6 rounded-full bg-white/90 backdrop-blur shadow-sm flex items-center justify-center hover:bg-white text-blue-600">
                        <Edit2 size={12} />
                    </button>
                    <button onClick={() => onDelete(product.id)} className="h-6 w-6 rounded-full bg-white/90 backdrop-blur shadow-sm flex items-center justify-center hover:bg-white text-red-500">
                        <Trash2 size={12} />
                    </button>
                </div>

                {/* Badge Panier */}
                {cartQuantity > 0 && (
                    <div className="absolute top-1 left-1 bg-emerald-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">
                        x{cartQuantity}
                    </div>
                )}
                
                {/* Badge Rupture */}
                {availablePhysicalStock <= 0 && (
                    <div className="absolute bottom-0 left-0 right-0 bg-red-500/90 text-white text-[10px] font-bold py-0.5 text-center backdrop-blur-sm">
                        Épuisé
                    </div>
                )}

                {/* Badge En Ligne (Marketplace) */}
                {product.marketplace_quantity > 0 && (
                    <div className="absolute bottom-1 left-1 bg-sky-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-sm flex items-center gap-1 z-10">
                        <Globe size={8} /> En ligne
                    </div>
                )}
            </div>

            {/* Info Produit */}
            <div className="p-2 flex flex-col flex-1 gap-1">
                <div className="flex justify-between items-start gap-1">
                    <h3 className="font-semibold text-xs text-gray-900 line-clamp-2 leading-tight flex-1" title={product.name}>
                        {product.name}
                    </h3>
                    <span className="font-bold text-emerald-700 text-xs whitespace-nowrap">
                        {formatPrice(product.price)}
                    </span>
                </div>

                <div className="flex items-center gap-1 text-[10px] text-gray-500 mb-2">
                    <Package size={10} />
                    <span>Stock: {availablePhysicalStock}</span>
                </div>

                {/* Sélecteur quantité + Ajouter au panier */}
                <div className="mt-auto flex flex-col gap-1.5">
                    <div className="flex items-center gap-1 h-7">
                        <div className="flex items-center border border-gray-200 rounded-md h-full flex-1">
                            <button
                                type="button"
                                onClick={() => setQty(q => Math.max(1, q - 1))}
                                className="px-2 h-full text-gray-500 hover:text-gray-700 disabled:opacity-30 border-r border-gray-200"
                                disabled={qty <= 1}
                            >
                                <Minus size={12} />
                            </button>
                            <span className="text-xs font-bold flex-1 text-center">{qty}</span>
                            <button
                                type="button"
                                onClick={() => setQty(q => Math.min(remainingStock, q + 1))}
                                className="px-2 h-full text-gray-500 hover:text-gray-700 disabled:opacity-30 border-l border-gray-200"
                                disabled={qty >= remainingStock}
                            >
                                <Plus size={12} />
                            </button>
                        </div>
                        <Button
                            variant="default"
                            size="sm"
                            onClick={() => { onAddToCart(product, qty); setQty(1); }}
                            disabled={remainingStock <= 0}
                            className="h-full w-1/2 text-[10px] bg-emerald-600 hover:bg-emerald-700 font-medium shadow-sm px-1"
                        >
                            {remainingStock > 0 ? (
                                <>
                                    <ShoppingCart size={12} className="mr-1" />
                                    Ajouter
                                </>
                            ) : (
                                'Épuisé'
                            )}
                        </Button>
                    </div>

                    {/* Publier / Récupérer */}
                    <div className="flex gap-1.5 w-full">
                        {/* Bouton Publier (si stock physique dispo) */}
                        {product.stock_quantity > (product.marketplace_quantity || 0) && (
                            <button 
                                onClick={() => onTransfer(product)}
                                className={`text-[10px] h-7 flex items-center justify-center rounded border font-medium text-blue-700 border-blue-200 bg-blue-50 hover:bg-blue-100 ${
                                    product.marketplace_quantity > 0 ? 'flex-1' : 'w-full'
                                }`}
                                title="Publier sur le Marketplace"
                            >
                                <ArrowUpRight size={12} className="mr-1.5" /> 
                                {product.marketplace_quantity > 0 ? 'Publier +' : 'Publier'}
                            </button>
                        )}
                        
                        {/* Bouton Récupérer (si stock marketplace dispo) */}
                        {product.marketplace_quantity > 0 && (
                            <button 
                                onClick={() => onReturn(product)}
                                className={`text-[10px] h-7 flex items-center justify-center rounded border font-medium text-amber-700 border-amber-200 bg-amber-50 hover:bg-amber-100 ${
                                    product.stock_quantity > product.marketplace_quantity ? 'flex-1' : 'w-full'
                                }`}
                                title="Récupérer du Marketplace"
                            >
                                <ArrowDownLeft size={12} className="mr-1.5" /> 
                                Récupérer
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BoutiqueProductCard;
