import React, { useState, useEffect } from 'react';
import { Check, Package, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import type { SupplierOrder } from '@/hooks/shop/useSuppliers';
import { getSectorConfig } from '@/config/product-sectors';
import DynamicField from '@/components/products/DynamicField';
import type { BoutiqueProduct } from '@/hooks/shop/useBoutiqueProducts';
import type { FieldConfig } from '@/types/product-form';

interface ReceiveOrderDialogProps {
    order: SupplierOrder | null;
    products: BoutiqueProduct[];
    open: boolean;
    onClose: () => void;
    onConfirm: (receivedItems: Array<{ itemId: string; receivedQuantity: number; productId: string; sectorData: any }>) => void;
}

interface SectorDataState {
    [itemId: string]: Record<string, any>;
}

const ReceiveOrderDialog: React.FC<ReceiveOrderDialogProps> = ({ order, products, open, onClose, onConfirm }) => {
    const [itemSectorData, setItemSectorData] = useState<Record<string, any>>({});

    // Reset form on open
    useEffect(() => {
        if (open && order) {
            const initialData: Record<string, any> = {};
            order.items?.forEach(item => {
                if (item.product_id) {
                    const product = products.find(p => p.id === item.product_id);
                    if (product && product.sector_data) {
                        initialData[item.id] = { ...product.sector_data };
                    } else {
                        initialData[item.id] = {};
                    }
                }
            });
            setItemSectorData(initialData);
        }
    }, [open, order, products]);

    const handleConfirm = () => {
        if (!order?.items) return;

        const receivedItems = order.items.map(item => ({
            itemId: item.id,
            receivedQuantity: item.quantity,
            productId: item.product_id || '',
            sectorData: itemSectorData[item.id] || {},
        }));

        onConfirm(receivedItems);
    };

    const handleSectorDataChange = (itemId: string, field: string, value: any) => {
        setItemSectorData(prev => ({
            ...prev,
            [itemId]: {
                ...prev[itemId],
                [field]: value,
            },
        }));
    };

    const handleFieldChange = (itemId: string, fieldName: string, value: any) => {
        handleSectorDataChange(itemId, fieldName, value);
    };

    if (!order) return null;

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Package className="w-5 h-5" />
                        Réception de commande
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
                        <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                        <div className="text-sm text-blue-800">
                            <p className="font-medium mb-1">Informations requises</p>
                            <p className="text-blue-700">
                                Veuillez saisir les dates d'expiration et autres informations spécifiques pour chaque produit selon son secteur.
                            </p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {order.items?.map(item => {
                            const product = products.find(p => p.id === item.product_id);
                            if (!product) return null;

                            const sector = product.sector || 'default';
                            const sectorConfig = getSectorConfig(sector);
                            const currentSectorData = itemSectorData[item.id] || {};

                            return (
                                <div key={item.id} className="border rounded-lg p-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="font-semibold">{product.name}</h4>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Badge className={`text-xs ${getSectorBadgeColor(sector)}`}>
                                                    {sectorConfig.name}
                                                </Badge>
                                                <span className="text-sm text-gray-500">
                                                    Quantité reçue : {item.quantity}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {sectorConfig.fields.length > 0 && (
                                        <div className="space-y-3 pt-2">
                                            <p className="text-sm font-medium text-gray-700">
                                                Informations {sectorConfig.name.toLowerCase()}
                                            </p>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {sectorConfig.fields.map(field => (
                                                    <div key={field.name}>
                                                        <Label className="text-sm">
                                                            {field.label}
                                                            {field.required && <span className="text-red-500 ml-1">*</span>}
                                                        </Label>
                                                        <DynamicField
                                                            config={field}
                                                            value={currentSectorData[field.name]}
                                                            onChange={(name, value) => handleFieldChange(item.id, name, value)}
                                                            formData={currentSectorData}
                                                            error={field.required && !currentSectorData[field.name] ? `${field.label} est requis` : undefined}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        Annuler
                    </Button>
                    <Button className="gap-2" onClick={handleConfirm}>
                        <Check className="w-4 h-4" />
                        Réceptionner la commande
                    </Button>
                </DialogFooter>
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

export default ReceiveOrderDialog;
