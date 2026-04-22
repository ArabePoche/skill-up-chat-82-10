import React from 'react';
import { Package, Plus, Minus, MoreVertical, Edit, Trash2, ArrowRightLeft, RotateCcw, Pill, Shirt, Zap, ShoppingCart, Apple, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { BoutiqueProduct } from '@/hooks/shop/useBoutiqueProducts';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { getSectorConfig } from '@/config/product-sectors';
import ProductDetailDialog from './ProductDetailDialog';

interface SectorProductCardProps {
    product: BoutiqueProduct;
    onEdit: (product: BoutiqueProduct) => void;
    onDelete: (productId: string) => void;
    onTransfer: (product: BoutiqueProduct) => void;
    onReturn: (product: BoutiqueProduct) => void;
    onAddToCart: (product: BoutiqueProduct, qty?: number) => void;
    cartQuantity?: number;
}

const SectorProductCard: React.FC<SectorProductCardProps> = ({
    product,
    onEdit,
    onDelete,
    onTransfer,
    onReturn,
    onAddToCart,
    cartQuantity = 0,
}) => {
    const [showDetailDialog, setShowDetailDialog] = React.useState(false);
    const isOutOfStock = product.stock_quantity <= 0;
    const isLowStock = product.stock_quantity > 0 && product.stock_quantity <= 5;
    const sector = product.sector || 'default';
    const sectorConfig = getSectorConfig(sector);
    const sectorData = product.sector_data || {};

    // Vérifier si le produit est expiré (supporte à la fois expiry_date et expiration_date)
    const expiryDate = sectorData.expiry_date || sectorData.expiration_date;
    const isExpired = expiryDate && new Date(expiryDate) < new Date();
    const isExpiringSoon = expiryDate && new Date(expiryDate) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) && !isExpired;

    // Icône du secteur
    const getSectorIcon = () => {
        switch (sector) {
            case 'pharmaceutical':
                return <Pill className="w-4 h-4" />;
            case 'clothing':
                return <Shirt className="w-4 h-4" />;
            case 'electronics':
                return <Zap className="w-4 h-4" />;
            case 'food':
                return <Apple className="w-4 h-4" />;
            case 'hardware':
                return <Wrench className="w-4 h-4" />;
            default:
                return <Package className="w-4 h-4" />;
        }
    };

    // Couleur du badge de secteur
    const getSectorColor = () => {
        switch (sector) {
            case 'pharmaceutical':
                return 'bg-red-100 text-red-700 border-red-200';
            case 'clothing':
                return 'bg-purple-100 text-purple-700 border-purple-200';
            case 'electronics':
                return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'food':
                return 'bg-green-100 text-green-700 border-green-200';
            case 'hardware':
                return 'bg-orange-100 text-orange-700 border-orange-200';
            default:
                return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    // Afficher les informations spécifiques au secteur
    const renderSectorInfo = () => {
        if (!sectorData || Object.keys(sectorData).length === 0) return null;

        const infoItems: React.ReactNode[] = [];
        const expiryDate = sectorData.expiry_date || sectorData.expiration_date;

        switch (sector) {
            case 'pharmaceutical':
                if (sectorData.dosage) {
                    infoItems.push(
                        <div key="dosage" className="flex items-center gap-1 text-xs text-gray-600">
                            <span className="font-medium">Dosage:</span> {sectorData.dosage}
                        </div>
                    );
                }
                if (expiryDate) {
                    const date = new Date(expiryDate);
                    const isExpired = date < new Date();
                    const isExpiringSoon = date < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                    infoItems.push(
                        <div key="expiry" className={`flex items-center gap-1 text-xs ${isExpired ? 'text-red-600 font-bold' : isExpiringSoon ? 'text-orange-600' : 'text-gray-600'}`}>
                            <span className="font-medium">Expiration:</span> {date.toLocaleDateString('fr-FR')}
                            {isExpired && <Badge variant="destructive" className="ml-1 text-[10px] px-1 h-4">Expiré</Badge>}
                            {isExpiringSoon && !isExpired && <Badge variant="outline" className="ml-1 text-[10px] px-1 h-4 text-orange-600 border-orange-200">Bientôt</Badge>}
                        </div>
                    );
                }
                if (sectorData.prescription_required !== undefined) {
                    infoItems.push(
                        <div key="prescription" className="flex items-center gap-1 text-xs text-gray-600">
                            <span className="font-medium">Ordonnance:</span> {sectorData.prescription_required ? 'Obligatoire' : 'Non requise'}
                        </div>
                    );
                }
                break;

            case 'food':
                if (expiryDate) {
                    const date = new Date(expiryDate);
                    const isExpired = date < new Date();
                    const isExpiringSoon = date < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
                    infoItems.push(
                        <div key="expiry" className={`flex items-center gap-1 text-xs ${isExpired ? 'text-red-600 font-bold' : isExpiringSoon ? 'text-orange-600' : 'text-gray-600'}`}>
                            <span className="font-medium">DLUO:</span> {date.toLocaleDateString('fr-FR')}
                            {isExpired && <Badge variant="destructive" className="ml-1 text-[10px] px-1 h-4">Périmé</Badge>}
                            {isExpiringSoon && !isExpired && <Badge variant="outline" className="ml-1 text-[10px] px-1 h-4 text-orange-600 border-orange-200">Bientôt</Badge>}
                        </div>
                    );
                }
                if (sectorData.allergens) {
                    infoItems.push(
                        <div key="allergens" className="flex items-center gap-1 text-xs text-gray-600">
                            <span className="font-medium">Allergènes:</span> {sectorData.allergens}
                        </div>
                    );
                }
                if (sectorData.storage_conditions) {
                    infoItems.push(
                        <div key="storage" className="flex items-center gap-1 text-xs text-gray-600">
                            <span className="font-medium">Conservation:</span> {sectorData.storage_conditions}
                        </div>
                    );
                }
                break;

            case 'clothing':
                if (sectorData.size) {
                    infoItems.push(
                        <div key="size" className="flex items-center gap-1 text-xs text-gray-600">
                            <span className="font-medium">Taille:</span> {sectorData.size}
                        </div>
                    );
                }
                if (sectorData.color) {
                    infoItems.push(
                        <div key="color" className="flex items-center gap-1 text-xs text-gray-600">
                            <span className="font-medium">Couleur:</span> {sectorData.color}
                        </div>
                    );
                }
                if (sectorData.material) {
                    infoItems.push(
                        <div key="material" className="flex items-center gap-1 text-xs text-gray-600">
                            <span className="font-medium">Matière:</span> {sectorData.material}
                        </div>
                    );
                }
                break;

            case 'electronics':
                if (sectorData.brand) {
                    infoItems.push(
                        <div key="brand" className="flex items-center gap-1 text-xs text-gray-600">
                            <span className="font-medium">Marque:</span> {sectorData.brand}
                        </div>
                    );
                }
                if (sectorData.model) {
                    infoItems.push(
                        <div key="model" className="flex items-center gap-1 text-xs text-gray-600">
                            <span className="font-medium">Modèle:</span> {sectorData.model}
                        </div>
                    );
                }
                if (sectorData.warranty) {
                    infoItems.push(
                        <div key="warranty" className="flex items-center gap-1 text-xs text-gray-600">
                            <span className="font-medium">Garantie:</span> {sectorData.warranty}
                        </div>
                    );
                }
                break;

            case 'hardware':
                if (sectorData.brand) {
                    infoItems.push(
                        <div key="brand" className="flex items-center gap-1 text-xs text-gray-600">
                            <span className="font-medium">Marque:</span> {sectorData.brand}
                        </div>
                    );
                }
                if (sectorData.material) {
                    infoItems.push(
                        <div key="material" className="flex items-center gap-1 text-xs text-gray-600">
                            <span className="font-medium">Matière:</span> {sectorData.material}
                        </div>
                    );
                }
                break;
        }

        if (infoItems.length === 0) return null;

        return (
            <div className="mt-2 pt-2 border-t border-gray-100 space-y-1">
                {infoItems}
            </div>
        );
    };

    return (
        <div className="bg-white rounded-lg border shadow-sm flex flex-col h-full overflow-hidden hover:shadow-md transition-shadow">
            {/* Image (condensée) */}
            {product.image_url ? (
                <div className="h-32 w-full bg-gray-100 relative shrink-0 cursor-pointer hover:opacity-90 transition-opacity" onClick={() => setShowDetailDialog(true)}>
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
                    {isExpired && (
                        <div className="absolute inset-0 bg-red-900/60 flex items-center justify-center">
                            <span className="text-white font-bold tracking-wider uppercase text-sm px-2 py-1 bg-red-700 rounded animate-pulse">⚠️ Expiré</span>
                        </div>
                    )}
                    {/* Badge de secteur */}
                    <div className="absolute top-2 left-2">
                        <Badge className={`text-[10px] px-2 py-0.5 ${getSectorColor()}`}>
                            {getSectorIcon()}
                            <span className="ml-1">{sectorConfig.name}</span>
                        </Badge>
                    </div>
                    {isExpiringSoon && (
                        <div className="absolute top-2 right-2">
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0.5 bg-orange-100 text-orange-700 border-orange-300">
                                ⚠️ Expiration proche
                            </Badge>
                        </div>
                    )}
                </div>
            ) : (
                <div className="h-32 w-full bg-gray-50 flex items-center justify-center text-gray-300 shrink-0 border-b relative cursor-pointer hover:opacity-90 transition-opacity" onClick={() => setShowDetailDialog(true)}>
                    <Package className="w-8 h-8 opacity-50" />
                    {isExpired && (
                        <div className="absolute inset-0 bg-red-900/60 flex items-center justify-center">
                            <span className="text-white font-bold tracking-wider uppercase text-sm px-2 py-1 bg-red-700 rounded animate-pulse">⚠️ Expiré</span>
                        </div>
                    )}
                    {/* Badge de secteur */}
                    <div className="absolute top-2 left-2">
                        <Badge className={`text-[10px] px-2 py-0.5 ${getSectorColor()}`}>
                            {getSectorIcon()}
                            <span className="ml-1">{sectorConfig.name}</span>
                        </Badge>
                    </div>
                    {isExpiringSoon && (
                        <div className="absolute top-2 right-2">
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0.5 bg-orange-100 text-orange-700 border-orange-300">
                                ⚠️ Expiration proche
                            </Badge>
                        </div>
                    )}
                </div>
            )}

            {/* Minimal Header */}
            <div className="p-3 border-b flex items-start justify-between bg-white gap-2">
                <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm text-gray-900 truncate" title={product.name}>
                        {product.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-mono text-gray-500">{product.barcode || ''}</span>
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

            {/* Minimal Body avec infos secteur */}
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
                
                {/* Informations spécifiques au secteur */}
                {renderSectorInfo()}
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
                            disabled={product.stock_quantity <= cartQuantity || isExpired}
                            className={`px-3 h-full flex items-center justify-center transition-colors ${
                                product.stock_quantity <= cartQuantity || isExpired
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
                        disabled={isOutOfStock || isExpired}
                        variant={isOutOfStock || isExpired ? "outline" : "default"}
                        className="w-full h-9 text-xs"
                    >
                        {isExpired ? (
                            <>
                                ⚠️ Expiré
                            </>
                        ) : isOutOfStock ? (
                            'Rupture'
                        ) : (
                            <>
                                <ShoppingCart className="w-3.5 h-3.5 mr-2" />
                                Ajouter
                            </>
                        )}
                    </Button>
                )}
            </div>

            {/* Modal de détail du produit */}
            <ProductDetailDialog
                product={product}
                open={showDetailDialog}
                onClose={() => setShowDetailDialog(false)}
            />
        </div>
    );
};

export default SectorProductCard;
