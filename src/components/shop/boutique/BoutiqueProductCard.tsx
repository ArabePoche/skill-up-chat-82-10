import React from 'react';
import { Package, ArrowUpRight, ArrowDownLeft, Edit2, Trash2, ShoppingCart, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
    onSell: (product: BoutiqueProduct) => void;
}

const BoutiqueProductCard: React.FC<BoutiqueProductCardProps> = ({
    product,
    onEdit,
    onDelete,
    onTransfer,
    onReturn,
    onSell,
}) => {
    const availableStock = product.stock_quantity - product.marketplace_quantity;

    return (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden flex flex-col group">
            {/* Image section */}
            <div className="aspect-[4/3] bg-gradient-to-br from-gray-100 to-gray-50 relative shrink-0">
                {product.image_url ? (
                    <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="flex items-center justify-center h-full">
                        <Package size={32} className="text-gray-300" />
                    </div>
                )}

                {/* Meatball Menu - Absolute Positioned */}
                <div className="absolute top-2 left-2 z-10">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="secondary" size="icon" className="h-8 w-8 rounded-full bg-white/80 backdrop-blur-sm border-none shadow-sm hover:bg-white">
                                <MoreVertical size={16} className="text-gray-600" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-32">
                            <DropdownMenuItem onClick={() => onEdit(product)} className="text-blue-600 focus:text-blue-700">
                                <Edit2 size={14} className="mr-2" />
                                Modifier
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onDelete(product.id)} className="text-rose-600 focus:text-rose-700">
                                <Trash2 size={14} className="mr-2" />
                                Supprimer
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {/* Badge marketplace */}
                {product.marketplace_quantity > 0 && (
                    <div className="absolute top-2 right-2 bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow">
                        {product.marketplace_quantity} en ligne
                    </div>
                )}
            </div>

            {/* Content section */}
            <div className="p-3">
                <div className="mb-3">
                    <div className="flex justify-between items-start gap-1 mb-1">
                        <h3 className="font-bold text-xs text-gray-900 line-clamp-1 flex-1">
                            {product.name}
                        </h3>
                        <span className="font-bold text-emerald-600 text-xs shrink-0">
                            {product.price.toFixed(2)}€
                        </span>
                    </div>

                    <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${availableStock <= 0 ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                        <Package size={10} />
                        Stock : {availableStock}
                    </div>
                </div>

                {/* Actions Section */}
                <div className="flex flex-col gap-2">
                    {/* Block Vendre */}
                    <Button
                        variant="default"
                        size="sm"
                        onClick={() => onSell(product)}
                        disabled={availableStock <= 0}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] h-8 shadow-sm font-bold"
                    >
                        <ShoppingCart size={12} className="mr-2" />
                        Vendre
                    </Button>

                    {/* Ligne Publier & Récupérer */}
                    <div className="grid grid-cols-2 gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onTransfer(product)}
                            disabled={availableStock <= 0}
                            className={`text-blue-600 border-blue-200 hover:bg-blue-50 text-[10px] h-8 ${product.marketplace_quantity <= 0 ? 'col-span-2' : ''}`}
                        >
                            <ArrowUpRight size={12} className="mr-1" />
                            Publier
                        </Button>

                        {product.marketplace_quantity > 0 && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onReturn(product)}
                                className="text-amber-600 border-amber-200 hover:bg-amber-50 text-[10px] h-8"
                            >
                                <ArrowDownLeft size={12} className="mr-1" />
                                Récupérer
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BoutiqueProductCard;
