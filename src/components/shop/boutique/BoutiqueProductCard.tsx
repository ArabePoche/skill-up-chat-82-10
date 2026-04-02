import React from 'react';
import { Package, Plus, Minus, MoreVertical, Edit, Trash2, ArrowRightLeft, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { BoutiqueProduct } from '@/hooks/shop/useBoutiqueProducts';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

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
    const isOutOfStock = product.stock_quantity <= 0;
    const isLowStock = product.stock_quantity > 0 && product.stock_quantity <= (product.min_stock_alert || 5);

    return (
        <div className="bg-white rounded-lg border shadow-sm flex flex-col h-full overflow-hidden hover:shadow-md transition-shadow">
            {/* Image (condensée) */}
            {product.image_url ? (
                <div className="h-32 w-full bg-gray-100 relative shrink-0">
                    <img 
                        src={product.image_url} 
                        alt={product.name} 
                        className="w-full h-full object-cover"
                        loading="lazy"
                    />
                    {isOutOfStock && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <span className="text-white font-bold tracking-wider uppercase text-sm px-2 py-1 bg-red-600/80 rounded">Rupture</span>
                        </div>
                    )}
                </div>
            ) : (
                <div className="h-32 w-full bg-gray-50 flex items-center justify-center text-gray-300 shrink-0 border-b">
                    <Package className="w-8 h-8 opacity-50" />
                </div>
            )}

            {/* Minimal Header */}
            <div className="p-3 border-b flex items-start justify-between bg-white gap-2">
                <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm text-gray-900 truncate" title={product.name}>
                        {product.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-mono text-gray-500">{product.sku}</span>
                        {product.category && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 h-4">
                                {product.category}
                            </Badge>
                        )}
                    </div>
                </div>

                {/* Dropdown for Actions to save space */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6 -mr-1 rounded-full shrink-0">
                            <MoreVertical className="w-4 h-4 text-gray-400" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem onClick={() => onEdit(product)} className="text-xs">
                            <Edit className="w-3.5 h-3.5 mr-2" /> Modifier
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onTransfer(product)} className="text-xs cursor-pointer">
                            <ArrowRightLeft className="w-3.5 h-3.5 mr-2" /> Transférer
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onReturn(product)} className="text-xs text-orange-600 cursor-pointer">
                            <RotateCcw className="w-3.5 h-3.5 mr-2" /> Retour / Perte
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onDelete(product.id)} className="text-xs text-red-600 cursor-pointer">
                            <Trash2 className="w-3.5 h-3.5 mr-2" /> Supprimer
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Minimal Body */}
            <div className="p-3 flex flex-col gap-2 flex-1">
                <div className="flex justify-between items-end">
                    <div>
                        <div className="text-xs text-gray-500 mb-0.5">Prix de vente</div>
                        <div className="font-bold text-gray-900">{(product.price || 0).toLocaleString()} FCFA</div>
                    </div>
                    
                    <div className="text-right">
                        <div className="text-xs text-gray-500 mb-0.5">Stock</div>
                        <Badge 
                            variant="outline" 
                            className={`font-mono ${
                                isOutOfStock ? 'text-red-600 border-red-200 bg-red-50' : 
                                isLowStock ? 'text-orange-600 border-orange-200 bg-orange-50' : 
                                'text-green-600 border-green-200 bg-green-50'
                            }`}
                        >
                            {product.stock_quantity}
                        </Badge>
                    </div>
                </div>
            </div>

            {/* Compact Footer (Add to Cart) */}
            <div className="p-2 border-t bg-gray-50">
                {cartQuantity > 0 ? (
                    <div className="flex items-center justify-between bg-indigo-50 rounded-md overflow-hidden border border-indigo-100 h-9">
                        <button
                            onClick={() => onAddToCart(product, -1)}
                            className="px-3 h-full text-indigo-600 hover:bg-indigo-100 flex items-center justify-center transition-colors"
                        >
                            <Minus className="w-4 h-4" />
                        </button>
                        <span className="font-medium text-indigo-700 text-sm">{cartQuantity}</span>
                        <button
                            onClick={() => onAddToCart(product, 1)}
                            disabled={product.stock_quantity <= cartQuantity}
                            className={`px-3 h-full flex items-center justify-center transition-colors ${
                                product.stock_quantity <= cartQuantity
                                ? 'text-gray-400 cursor-not-allowed'
                                : 'text-indigo-600 hover:bg-indigo-100'
                            }`}
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>
                ) : (
                    <Button
                        onClick={() => onAddToCart(product, 1)}
                        disabled={isOutOfStock}
                        variant={isOutOfStock ? "outline" : "default"}
                        className="w-full h-9 text-xs"
                    >
                        {isOutOfStock ? (
                            'Rupture'
                        ) : (
                            <>
                                <Package className="w-3.5 h-3.5 mr-2" />
                                Ajouter
                            </>
                        )}
                    </Button>
                )}
            </div>
        </div>
    );
};

export default BoutiqueProductCard;