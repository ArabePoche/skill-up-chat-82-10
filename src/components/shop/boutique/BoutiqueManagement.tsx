/**
 * Page principale de gestion de la boutique physique
 * Permet d'ajouter/modifier/supprimer des produits et de les transférer vers le marketplace
 */
import React, { useState } from 'react';
import { Plus, Store, Package, WifiOff } from 'lucide-react';
import ProductImageUploader from './ProductImageUploader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/hooks/useAuth';
import { usePhysicalShop, useCreatePhysicalShop } from '@/hooks/shop/usePhysicalShop';
import {
    useBoutiqueProducts,
    useCreateBoutiqueProduct,
    useUpdateBoutiqueProduct,
    useDeleteBoutiqueProduct,
    useTransferToMarketplace,
    type BoutiqueProduct,
} from '@/hooks/shop/useBoutiqueProducts';
import BoutiqueProductCard from './BoutiqueProductCard';
import TransferDialog from './TransferDialog';

const BoutiqueManagement: React.FC = () => {
    const { user } = useAuth();
    const { data: shop, isLoading: shopLoading } = usePhysicalShop();
    const { data: products, isLoading: productsLoading } = useBoutiqueProducts(shop?.id);
    const createShop = useCreatePhysicalShop();
    const createProduct = useCreateBoutiqueProduct();
    const updateProduct = useUpdateBoutiqueProduct();
    const deleteProduct = useDeleteBoutiqueProduct();
    const transferToMarketplace = useTransferToMarketplace();

    // UI State
    const [showProductForm, setShowProductForm] = useState(false);
    const [editingProduct, setEditingProduct] = useState<BoutiqueProduct | null>(null);
    const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
    const [transferProduct, setTransferProduct] = useState<BoutiqueProduct | null>(null);
    const [shopName, setShopName] = useState('');
    const [shopAddress, setShopAddress] = useState('');

    // Form state
    const [formName, setFormName] = useState('');
    const [formDescription, setFormDescription] = useState('');
    const [formPrice, setFormPrice] = useState('');
    const [formStock, setFormStock] = useState('');
    const [formImageUrl, setFormImageUrl] = useState('');

    const isOnline = navigator.onLine;

    /** Création de la boutique */
    const handleCreateShop = async () => {
        if (!shopName.trim()) return;
        await createShop.mutateAsync({
            name: shopName.trim(),
            address: shopAddress.trim() || undefined,
        });
    };

    /** Ouvrir le formulaire pour un nouveau produit */
    const openNewProductForm = () => {
        setEditingProduct(null);
        setFormName('');
        setFormDescription('');
        setFormPrice('');
        setFormStock('');
        setFormImageUrl('');
        setShowProductForm(true);
    };

    /** Ouvrir le formulaire pour modifier un produit */
    const openEditProductForm = (product: BoutiqueProduct) => {
        setEditingProduct(product);
        setFormName(product.name);
        setFormDescription(product.description || '');
        setFormPrice(product.price.toString());
        setFormStock(product.stock_quantity.toString());
        setFormImageUrl(product.image_url || '');
        setShowProductForm(true);
    };

    /** Sauvegarder le produit (création ou mise à jour) */
    const handleSaveProduct = async () => {
        if (!formName.trim() || !shop?.id) return;

        const productData = {
            name: formName.trim(),
            description: formDescription.trim() || undefined,
            price: parseFloat(formPrice) || 0,
            stock_quantity: parseInt(formStock) || 0,
            image_url: formImageUrl.trim() || undefined,
        };

        try {
            if (editingProduct) {
                await updateProduct.mutateAsync({
                    id: editingProduct.id,
                    shop_id: shop.id,
                    ...productData,
                });
            } else {
                await createProduct.mutateAsync({
                    shop_id: shop.id,
                    ...productData,
                });
            }

            setShowProductForm(false);
            setEditingProduct(null);
        } catch (error) {
            // L'erreur est déjà gérée par le hook (toast.error),
            // on ne ferme pas le dialog pour permettre de réessayer
            console.error('Erreur sauvegarde produit:', error);
        }
    };

    /** Supprimer un produit */
    const handleDeleteProduct = async () => {
        if (!deletingProductId || !shop?.id) return;
        await deleteProduct.mutateAsync({ id: deletingProductId, shopId: shop.id });
        setDeletingProductId(null);
    };

    /** Transférer vers le marketplace */
    const handleTransfer = async (productId: string, quantity: number) => {
        if (!shop?.id || !user?.id) return;
        await transferToMarketplace.mutateAsync({
            boutiqueProductId: productId,
            shopId: shop.id,
            quantity,
            sellerId: user.id,
        });
        setTransferProduct(null);
    };

    // Loading state
    if (shopLoading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
            </div>
        );
    }

    // Pas de boutique : formulaire de création
    if (!shop) {
        return (
            <div className="max-w-md mx-auto p-6 mt-8">
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Store size={32} className="text-emerald-600" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">Créer votre boutique</h2>
                    <p className="text-sm text-gray-500 mt-1">
                        Gérez vos produits physiques et transférez-les vers le marketplace
                    </p>
                </div>

                <div className="space-y-4">
                    <div>
                        <Label htmlFor="shop-name">Nom de la boutique *</Label>
                        <Input
                            id="shop-name"
                            value={shopName}
                            onChange={(e) => setShopName(e.target.value)}
                            placeholder="Ma boutique"
                        />
                    </div>
                    <div>
                        <Label htmlFor="shop-address">Adresse (optionnel)</Label>
                        <Input
                            id="shop-address"
                            value={shopAddress}
                            onChange={(e) => setShopAddress(e.target.value)}
                            placeholder="123 Rue du Commerce"
                        />
                    </div>
                    <Button
                        onClick={handleCreateShop}
                        disabled={!shopName.trim() || createShop.isPending}
                        className="w-full bg-emerald-600 hover:bg-emerald-700"
                    >
                        {createShop.isPending ? 'Création...' : 'Créer ma boutique'}
                    </Button>
                </div>
            </div>
        );
    }

    // Boutique existante : vue de gestion
    return (
        <div className="pb-16">
            {/* Header boutique */}
            <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 text-white p-4 shadow-md">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold flex items-center gap-2">
                            <Store size={20} />
                            {shop.name}
                        </h2>
                        {shop.address && (
                            <p className="text-emerald-100 text-xs mt-0.5">{shop.address}</p>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {!isOnline && (
                            <span className="flex items-center gap-1 text-xs bg-orange-500/80 px-2 py-1 rounded-full">
                                <WifiOff size={12} /> Hors ligne
                            </span>
                        )}
                        <Button
                            onClick={openNewProductForm}
                            size="sm"
                            className="bg-white/20 hover:bg-white/30 text-white border-0"
                        >
                            <Plus size={16} className="mr-1" />
                            Produit
                        </Button>
                    </div>
                </div>

                {/* Stats rapides */}
                <div className="flex gap-4 mt-3 text-xs">
                    <div className="bg-white/15 rounded-lg px-3 py-1.5 backdrop-blur-sm">
                        <span className="text-emerald-100">Produits : </span>
                        <span className="font-bold">{products?.length || 0}</span>
                    </div>
                    <div className="bg-white/15 rounded-lg px-3 py-1.5 backdrop-blur-sm">
                        <span className="text-emerald-100">En ligne : </span>
                        <span className="font-bold">
                            {products?.filter(p => p.marketplace_quantity > 0).length || 0}
                        </span>
                    </div>
                </div>
            </div>

            {/* Liste des produits */}
            <div className="p-3 sm:p-4">
                {productsLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
                    </div>
                ) : products && products.length > 0 ? (
                    <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
                        {products.map(product => (
                            <BoutiqueProductCard
                                key={product.id}
                                product={product}
                                onEdit={openEditProductForm}
                                onDelete={(id) => setDeletingProductId(id)}
                                onTransfer={(p) => setTransferProduct(p)}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16">
                        <Package size={48} className="mx-auto text-gray-300 mb-4" />
                        <p className="text-gray-500 mb-4">Aucun produit dans votre boutique</p>
                        <Button onClick={openNewProductForm} className="bg-emerald-600 hover:bg-emerald-700">
                            <Plus size={16} className="mr-2" />
                            Ajouter un produit
                        </Button>
                    </div>
                )}
            </div>

            {/* Dialog produit (ajout/modification) */}
            <Dialog open={showProductForm} onOpenChange={(open) => {
                if (!open) {
                    setShowProductForm(false);
                    setEditingProduct(null);
                }
            }}>
                <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {editingProduct ? 'Modifier le produit' : 'Nouveau produit'}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div>
                            <Label htmlFor="product-name">Nom du produit *</Label>
                            <Input
                                id="product-name"
                                value={formName}
                                onChange={(e) => setFormName(e.target.value)}
                                placeholder="Nom du produit"
                            />
                        </div>
                        <div>
                            <Label htmlFor="product-desc">Description</Label>
                            <Textarea
                                id="product-desc"
                                value={formDescription}
                                onChange={(e) => setFormDescription(e.target.value)}
                                placeholder="Description du produit"
                                rows={3}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label htmlFor="product-price">Prix (€)</Label>
                                <Input
                                    id="product-price"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={formPrice}
                                    onChange={(e) => setFormPrice(e.target.value)}
                                    placeholder="0.00"
                                />
                            </div>
                            <div>
                                <Label htmlFor="product-stock">Stock</Label>
                                <Input
                                    id="product-stock"
                                    type="number"
                                    min="0"
                                    value={formStock}
                                    onChange={(e) => setFormStock(e.target.value)}
                                    placeholder="0"
                                />
                            </div>
                        </div>
                        <div>
                            <Label>Image du produit</Label>
                            <ProductImageUploader
                                imageUrl={formImageUrl}
                                onImageChange={setFormImageUrl}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowProductForm(false)}>
                            Annuler
                        </Button>
                        <Button
                            onClick={handleSaveProduct}
                            disabled={!formName.trim() || createProduct.isPending || updateProduct.isPending}
                            className="bg-emerald-600 hover:bg-emerald-700"
                        >
                            {(createProduct.isPending || updateProduct.isPending) ? 'Enregistrement...' : 'Enregistrer'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dialog transfert */}
            <TransferDialog
                product={transferProduct}
                isOpen={!!transferProduct}
                onClose={() => setTransferProduct(null)}
                onConfirm={handleTransfer}
                isLoading={transferToMarketplace.isPending}
            />

            {/* Confirmation suppression */}
            <AlertDialog open={!!deletingProductId} onOpenChange={(open) => !open && setDeletingProductId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Supprimer le produit</AlertDialogTitle>
                        <AlertDialogDescription>
                            Êtes-vous sûr de vouloir supprimer ce produit ? Cette action est irréversible.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteProduct}
                            className="bg-destructive hover:bg-destructive/90"
                        >
                            Supprimer
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default BoutiqueManagement;
