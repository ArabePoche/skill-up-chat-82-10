/**
 * Drawer pour la gestion de l'inventaire
 * Affiche les statistiques, l'historique des mouvements et permet d'ajouter des mouvements
 */
import React, { useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
    Package,
    TrendingUp,
    TrendingDown,
    AlertTriangle,
    RefreshCw,
    Plus,
    Minus,
    ArrowUpDown,
    X,
    PackageSearch,
} from 'lucide-react';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    useInventoryMovements,
    useInventoryStats,
    useAddInventoryMovement,
    getMovementTypeLabel,
    getMovementTypeColor,
    type MovementType,
} from '@/hooks/shop/useInventory';
import { useBoutiqueProducts, type BoutiqueProduct } from '@/hooks/shop/useBoutiqueProducts';

interface InventoryDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    shopId: string;
}

const InventoryDrawer: React.FC<InventoryDrawerProps> = ({
    open,
    onOpenChange,
    shopId,
}) => {
    const { data: stats, isLoading: statsLoading } = useInventoryStats(shopId);
    const { data: movements, isLoading: movementsLoading } = useInventoryMovements(shopId);
    const { data: products } = useBoutiqueProducts(shopId);
    const addMovement = useAddInventoryMovement();

    const [showAddDialog, setShowAddDialog] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<string>('');
    const [movementType, setMovementType] = useState<MovementType>('in');
    const [quantity, setQuantity] = useState('');
    const [reason, setReason] = useState('');

    const handleAddMovement = async () => {
        if (!selectedProduct || !quantity) return;

        await addMovement.mutateAsync({
            shopId,
            productId: selectedProduct,
            movementType,
            quantity: parseInt(quantity),
            reason: reason.trim() || undefined,
        });

        setShowAddDialog(false);
        setSelectedProduct('');
        setQuantity('');
        setReason('');
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'XOF',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    return (
        <>
            <Sheet open={open} onOpenChange={onOpenChange}>
                <SheetContent side="right" className="w-full sm:max-w-lg p-0">
                    <SheetHeader className="p-4 border-b bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                        <SheetTitle className="text-white flex items-center gap-2">
                            <PackageSearch size={20} />
                            Inventaire
                        </SheetTitle>
                    </SheetHeader>

                    <ScrollArea className="h-[calc(100vh-80px)]">
                        <div className="p-4 space-y-4">
                            {/* Stats cards */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-3 border border-emerald-200">
                                    <div className="flex items-center gap-2 text-emerald-700 mb-1">
                                        <Package size={16} />
                                        <span className="text-xs font-medium">Produits</span>
                                    </div>
                                    <p className="text-2xl font-bold text-emerald-800">
                                        {statsLoading ? '...' : stats?.totalProducts || 0}
                                    </p>
                                </div>

                                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-3 border border-blue-200">
                                    <div className="flex items-center gap-2 text-blue-700 mb-1">
                                        <TrendingUp size={16} />
                                        <span className="text-xs font-medium">Valeur stock</span>
                                    </div>
                                    <p className="text-lg font-bold text-blue-800">
                                        {statsLoading ? '...' : formatCurrency(stats?.totalStockValue || 0)}
                                    </p>
                                </div>

                                <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-3 border border-amber-200">
                                    <div className="flex items-center gap-2 text-amber-700 mb-1">
                                        <AlertTriangle size={16} />
                                        <span className="text-xs font-medium">Stock bas</span>
                                    </div>
                                    <p className="text-2xl font-bold text-amber-800">
                                        {statsLoading ? '...' : stats?.lowStockProducts || 0}
                                    </p>
                                </div>

                                <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-3 border border-red-200">
                                    <div className="flex items-center gap-2 text-red-700 mb-1">
                                        <TrendingDown size={16} />
                                        <span className="text-xs font-medium">Rupture</span>
                                    </div>
                                    <p className="text-2xl font-bold text-red-800">
                                        {statsLoading ? '...' : stats?.outOfStockProducts || 0}
                                    </p>
                                </div>
                            </div>

                            {/* Action button */}
                            <Button
                                onClick={() => setShowAddDialog(true)}
                                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                            >
                                <ArrowUpDown size={16} className="mr-2" />
                                Nouveau mouvement
                            </Button>

                            {/* Historique des mouvements */}
                            <div>
                                <h3 className="font-semibold text-sm text-muted-foreground mb-3 flex items-center gap-2">
                                    <RefreshCw size={14} />
                                    Historique récent
                                </h3>

                                {movementsLoading ? (
                                    <div className="flex justify-center py-8">
                                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
                                    </div>
                                ) : movements && movements.length > 0 ? (
                                    <div className="space-y-2">
                                        {movements.map((movement) => (
                                            <div
                                                key={movement.id}
                                                className="bg-card border rounded-lg p-3 flex items-start gap-3"
                                            >
                                                <div className={`p-2 rounded-lg ${getMovementTypeColor(movement.movement_type)}`}>
                                                    {movement.movement_type === 'in' || movement.movement_type === 'return' || movement.movement_type === 'transfer_in' ? (
                                                        <Plus size={16} />
                                                    ) : movement.movement_type === 'adjustment' ? (
                                                        <ArrowUpDown size={16} />
                                                    ) : (
                                                        <Minus size={16} />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-sm truncate">
                                                        {movement.product?.name || 'Produit'}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {getMovementTypeLabel(movement.movement_type)}
                                                        {movement.reason && ` • ${movement.reason}`}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        {format(new Date(movement.created_at), 'dd MMM à HH:mm', { locale: fr })}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className={`font-bold text-sm ${
                                                        movement.new_stock > movement.previous_stock
                                                            ? 'text-emerald-600'
                                                            : movement.new_stock < movement.previous_stock
                                                            ? 'text-red-600'
                                                            : 'text-blue-600'
                                                    }`}>
                                                        {movement.new_stock > movement.previous_stock ? '+' : ''}
                                                        {movement.new_stock - movement.previous_stock}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {movement.previous_stock} → {movement.new_stock}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <PackageSearch size={32} className="mx-auto mb-2 opacity-50" />
                                        <p className="text-sm">Aucun mouvement enregistré</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </ScrollArea>
                </SheetContent>
            </Sheet>

            {/* Dialog ajout mouvement */}
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Nouveau mouvement</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div>
                            <Label>Produit *</Label>
                            <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Sélectionner un produit" />
                                </SelectTrigger>
                                <SelectContent>
                                    {products?.map((product) => (
                                        <SelectItem key={product.id} value={product.id}>
                                            {product.name} (Stock: {product.stock_quantity})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label>Type de mouvement *</Label>
                            <Select value={movementType} onValueChange={(v) => setMovementType(v as MovementType)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="in">Entrée de stock</SelectItem>
                                    <SelectItem value="out">Sortie de stock</SelectItem>
                                    <SelectItem value="adjustment">Ajustement (nouveau stock)</SelectItem>
                                    <SelectItem value="return">Retour client</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label>
                                {movementType === 'adjustment' ? 'Nouveau stock *' : 'Quantité *'}
                            </Label>
                            <Input
                                type="number"
                                min="0"
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                                placeholder={movementType === 'adjustment' ? 'Nouveau niveau de stock' : 'Quantité'}
                            />
                        </div>

                        <div>
                            <Label>Raison (optionnel)</Label>
                            <Textarea
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="Ex: Réapprovisionnement fournisseur..."
                                rows={2}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                            Annuler
                        </Button>
                        <Button
                            onClick={handleAddMovement}
                            disabled={!selectedProduct || !quantity || addMovement.isPending}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            {addMovement.isPending ? 'Enregistrement...' : 'Enregistrer'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default InventoryDrawer;
