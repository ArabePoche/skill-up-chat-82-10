import React from 'react';
import { X, Calendar, Package, Tag, MapPin, Barcode, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import type { BoutiqueProduct } from '@/hooks/shop/useBoutiqueProducts';
import { getSectorConfig } from '@/config/product-sectors';

interface ProductDetailDialogProps {
    product: BoutiqueProduct | null;
    open: boolean;
    onClose: () => void;
}

const ProductDetailDialog: React.FC<ProductDetailDialogProps> = ({ product, open, onClose }) => {
    if (!product) return null;

    const sector = product.sector || 'default';
    const sectorConfig = getSectorConfig(sector);
    const sectorData = product.sector_data || {};
    const expiryDate = sectorData.expiry_date || sectorData.expiration_date;
    const isExpired = expiryDate && new Date(expiryDate) < new Date();
    const isExpiringSoon = expiryDate && new Date(expiryDate) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) && !isExpired;

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'XOF',
            minimumFractionDigits: 0,
        }).format(amount);

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center justify-between">
                        <span>Détails du produit</span>
                        <Button variant="ghost" size="icon" onClick={onClose}>
                            <X className="w-4 h-4" />
                        </Button>
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Image et informations principales */}
                    <div className="flex gap-4">
                        {product.image_url ? (
                            <div className="w-32 h-32 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                                <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                            </div>
                        ) : (
                            <div className="w-32 h-32 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                                <Package className="w-12 h-12 text-gray-300" />
                            </div>
                        )}
                        <div className="flex-1 space-y-2">
                            <div>
                                <h3 className="text-lg font-semibold">{product.name}</h3>
                                {product.description && (
                                    <p className="text-sm text-gray-600 mt-1">{product.description}</p>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge className={getSectorBadgeColor(sector)}>
                                    {sectorConfig.name}
                                </Badge>
                                {product.category && (
                                    <Badge variant="secondary">{product.category}</Badge>
                                )}
                            </div>
                        </div>
                    </div>

                    <Separator />

                    {/* Informations de base */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                <Tag className="w-4 h-4" />
                                <span>Prix de vente</span>
                            </div>
                            <p className="text-lg font-semibold">{formatCurrency(product.price)}</p>
                        </div>
                        <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                <Package className="w-4 h-4" />
                                <span>Stock</span>
                            </div>
                            <p className="text-lg font-semibold">{product.stock_quantity} unités</p>
                        </div>
                        <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                <Barcode className="w-4 h-4" />
                                <span>Code-barres</span>
                            </div>
                            <p className="text-sm">{product.barcode || 'Non défini'}</p>
                        </div>
                        <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                <MapPin className="w-4 h-4" />
                                <span>Emplacement</span>
                            </div>
                            <p className="text-sm">{product.location || 'Non défini'}</p>
                        </div>
                    </div>

                    {/* Informations spécifiques au secteur */}
                    {Object.keys(sectorData).length > 0 && (
                        <>
                            <Separator />
                            <div className="space-y-3">
                                <h4 className="font-semibold flex items-center gap-2">
                                    <Tag className="w-4 h-4" />
                                    Caractéristiques {sectorConfig.name.toLowerCase()}
                                </h4>
                                <div className="grid grid-cols-2 gap-3">
                                    {sectorConfig.fields.map((field) => {
                                        const value = sectorData[field.name];
                                        if (!value) return null;
                                        return (
                                            <div key={field.name} className="space-y-1">
                                                <div className="text-sm text-gray-500">{field.label}</div>
                                                <div className="text-sm font-medium">
                                                    {field.type === 'date' ? formatDate(value) : String(value)}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </>
                    )}

                    {/* Statut d'expiration */}
                    {expiryDate && (
                        <>
                            <Separator />
                            <div className="space-y-3">
                                <h4 className="font-semibold flex items-center gap-2">
                                    <Calendar className="w-4 h-4" />
                                    Statut d'expiration
                                </h4>
                                <div className={`p-4 rounded-lg border ${
                                    isExpired 
                                        ? 'bg-red-50 border-red-200' 
                                        : isExpiringSoon 
                                            ? 'bg-orange-50 border-orange-200' 
                                            : 'bg-green-50 border-green-200'
                                }`}>
                                    <div className="flex items-start gap-3">
                                        {isExpired ? (
                                            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                                        ) : isExpiringSoon ? (
                                            <Clock className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
                                        ) : (
                                            <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                                        )}
                                        <div className="flex-1">
                                            <p className={`font-medium ${
                                                isExpired ? 'text-red-700' : isExpiringSoon ? 'text-orange-700' : 'text-green-700'
                                            }`}>
                                                {isExpired ? 'Produit expiré' : isExpiringSoon ? 'Expiration proche' : 'Produit valide'}
                                            </p>
                                            <p className="text-sm text-gray-600 mt-1">
                                                Date d'expiration : {formatDate(expiryDate)}
                                            </p>
                                            {isExpired && (
                                                <p className="text-sm text-red-600 mt-2 font-medium">
                                                    Stock à rendre : {product.stock_quantity} unités
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Dates système */}
                    <Separator />
                    <div className="space-y-3">
                        <h4 className="font-semibold">Informations système</h4>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                                <div className="text-gray-500">Créé le</div>
                                <div>{formatDate(product.created_at)}</div>
                            </div>
                            <div>
                                <div className="text-gray-500">Modifié le</div>
                                <div>{formatDate(product.updated_at)}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

const getSectorBadgeColor = (sector: string) => {
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

export default ProductDetailDialog;
