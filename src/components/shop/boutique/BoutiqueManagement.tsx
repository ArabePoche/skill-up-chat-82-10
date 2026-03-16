/**
 * Page principale de gestion de la boutique physique
 * Permet d'ajouter/modifier/supprimer des produits et de les transférer vers le marketplace
 */
import React, { useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Plus, Store, Package, WifiOff, Search, PackageSearch, Calculator, ShoppingCart, ChevronDown, Settings2, Users, Bell, Check, ChevronsUpDown, History, ScanBarcode, Wand2, Barcode, Truck } from 'lucide-react';
import TodaySalesDashboard from './TodaySalesDashboard';
import ProductImageUploader from './ProductImageUploader';
import InventoryDrawer from './InventoryDrawer';
import EmbeddedPos from './EmbeddedPos';
import CustomerManagement from './CustomerManagement';
import ShopOrdersPanel from './ShopOrdersPanel';
import { BoutiqueAgentsManager } from './BoutiqueAgentsManager';
import BoutiqueSalesHistory from './BoutiqueSalesHistory';
import { useShopOrders } from '@/hooks/shop/useShopOrders';
import { useShopAgents } from '@/hooks/shop/useShopAgents';
import { AgentSession } from '@/hooks/shop/useAgentAuth';
import { AgentLockScreen } from './AgentLockScreen';
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';
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
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { useCreatePhysicalShop } from '@/hooks/shop/usePhysicalShop';
import MultiShopDashboard from '../multi-boutique/MultiShopDashboard';
import { useUserShops } from '@/hooks/shop/useMultiShop';
import {
    useBoutiqueProducts,
    useCreateBoutiqueProduct,
    useUpdateBoutiqueProduct,
    useDeleteBoutiqueProduct,
    useTransferToMarketplace,
    useReturnFromMarketplace,
    type BoutiqueProduct,
} from '@/hooks/shop/useBoutiqueProducts';
import { useCreateCartSale } from '@/hooks/shop/useBoutiqueSales';
import { usePosCart } from '@/hooks/shop/usePosCart';
import BoutiqueProductCard from './BoutiqueProductCard';
import TransferDialog, { TransferDialogProps } from './TransferDialog';
import ReturnDialog, { ReturnDialogProps } from './ReturnDialog';
import { CameraBarcodeScanner } from './CameraBarcodeScanner';
// Composant Autocomplete simple et robuste pour éviter les problèmes de focus dans les Dialogs
const SimpleAutocomplete = ({
    value,
    onChange,
    options,
    placeholder,
    label
}: {
    value: string;
    onChange: (val: string) => void;
    options: string[];
    placeholder: string;
    label: string;
}) => {
    const [open, setOpen] = useState(false);
    const [focused, setFocused] = useState(false);

    // Filtrer les options basées sur la saisie
    const filtered = options.filter(o => o.toLowerCase().includes(value.toLowerCase()));

    return (
        <div className="relative">
            <Label>{label}</Label>
            <Input
                value={value}
                onChange={e => { onChange(e.target.value); setOpen(true); }}
                onFocus={() => { setFocused(true); setOpen(true); }}
                onBlur={() => {
                    setFocused(false);
                    // Petit délai pour permettre le clic sur l'option
                    setTimeout(() => setOpen(false), 200);
                }}
                placeholder={placeholder}
                className="mt-1"
            />
            {open && focused && filtered.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-40 overflow-y-auto">
                    {filtered.map(opt => (
                        <div
                            key={opt}
                            className="px-3 py-2 text-sm cursor-pointer hover:bg-emerald-50 text-gray-700"
                            onMouseDown={(e) => {
                                // onMouseDown fires before onBlur
                                e.preventDefault();
                                onChange(opt);
                                setOpen(false);
                            }}
                        >
                            {opt}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

interface BoutiqueManagementProps {
    activeAgent: AgentSession | null;
    inactivityMinutes: number;
    onInactivityMinutesChange: (minutes: number) => void;
    onLogin: (username: string, pass: string) => Promise<any>;
    onUnlock: (pin: string) => Promise<boolean>;
    onLock: () => void;
    onLogout: () => void;
    forgotPassword: () => Promise<void>;
    updateProfile: (updates: Partial<{ first_name: string; last_name: string; password_hash: string; pin_code: string; avatar_url: string; }>) => Promise<boolean>;
}

const BoutiqueManagement: React.FC<BoutiqueManagementProps> = ({
    activeAgent,
    inactivityMinutes,
    onInactivityMinutesChange,
    onLogin,
    onUnlock,
    onLock,
    onLogout,
    forgotPassword,
    updateProfile,
}) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { data: userShops, isLoading: shopsLoading } = useUserShops();
    const createShop = useCreatePhysicalShop();

    // Récupérer l'ID de boutique depuis l'URL
    const [searchParams] = useSearchParams();
    const shopIdFromUrl = searchParams.get('id');

    // Déterminer la boutique active : celle de l'URL ou la première disponible
    const shop = userShops?.find(s => s.id === shopIdFromUrl) || userShops?.[0] || null;

    const { data: products, isLoading: productsLoading, error: productsError } = useBoutiqueProducts(shop?.id);
    const createProduct = useCreateBoutiqueProduct();
    const updateProduct = useUpdateBoutiqueProduct();
    const deleteProduct = useDeleteBoutiqueProduct();
    const transferToMarketplace = useTransferToMarketplace();
    const returnFromMarketplace = useReturnFromMarketplace();
    const cartSale = useCreateCartSale();
    const posCart = usePosCart();

    // UI State
    const [searchQuery, setSearchQuery] = useState('');
    const [showProductForm, setShowProductForm] = useState(false);
    const [editingProduct, setEditingProduct] = useState<BoutiqueProduct | null>(null);
    const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
    const [transferProduct, setTransferProduct] = useState<BoutiqueProduct | null>(null);
    const [returningProduct, setReturningProduct] = useState<BoutiqueProduct | null>(null);
    const [shopName, setShopName] = useState('');
    const [shopAddress, setShopAddress] = useState('');
    const [inventoryOpen, setInventoryOpen] = useState(false);
    const [posOpen, setPosOpen] = useState(false);
    const [showCameraScanner, setShowCameraScanner] = useState(false);
    const [showMultiShopSettings, setShowMultiShopSettings] = useState(false);
    const [activeView, setActiveView] = useState<'shop' | 'customers' | 'orders' | 'sales' | 'agents'>('shop');
    const { data: currentShopAgents } = useShopAgents(shop?.id);
    const isOwnerOrPDG = useMemo(() => {
        if (!user || !shop) return false;
        if (shop.owner_id === user.id) return true;
        return currentShopAgents?.some(a => a.user_id === user.id && a.role === 'PDG' && a.status === 'active') || false;
    }, [user, shop, currentShopAgents]);
    const { pendingCount } = useShopOrders(shop?.id);
    // Form state
    const [formName, setFormName] = useState('');
    const [formDescription, setFormDescription] = useState('');
    const [formPrice, setFormPrice] = useState('');
    const [formCostPrice, setFormCostPrice] = useState('');
    const [formStock, setFormStock] = useState('');
    const [formCategory, setFormCategory] = useState('');
    const [formLocation, setFormLocation] = useState('');
    const [formBarcode, setFormBarcode] = useState('');
    const [formImageUrl, setFormImageUrl] = useState<string | null>(null);
    const [filterCategory, setFilterCategory] = useState('all');

    // State pour savoir d'ou vient la demande de scan (pos ou formulaire produit)
    const [scanTarget, setScanTarget] = useState<'pos' | 'form'>('pos');

    // Combobox states
    // Plus nécessaire avec SimpleAutocomplete

    // Dériver les catégories et emplacements uniques
    const uniqueCategories = useMemo(() => {
        const cats = new Set(products?.map(p => p.category).filter(Boolean) as string[]);
        return Array.from(cats).sort();
    }, [products]);

    const uniqueLocations = useMemo(() => {
        const locs = new Set(products?.map(p => p.location).filter(Boolean) as string[]);
        return Array.from(locs).sort();
    }, [products]);

    // Handle barcode scanner
    useBarcodeScanner((barcode) => {
        // En mode édition, si le formulaire est ouvert et a le focus, on pourrait vouloir remplir le champ.
        // Mais useBarcodeScanner capture les frappes HID.
        // Si le champ input est focus, pas de soucis, le navigateur gère.
        // Si le formulaire est ouvert mais pas focus, on capture ici.
        if (showProductForm) {
            setFormBarcode(barcode);
            return;
        }

        if (!products) return;
        
        // Trouver le produit correspondant
        const product = products.find(p => p.barcode === barcode);
        if (product) {
            // Ajouter 1 au panier
            posCart.addItem(product, 1);
            
            // Notification visuelle ou sonore légère optionnelle (optionnelle car le panier se met à jour)
            // L'ajout a déjà une notification de toast dans `usePosCart` 
            
            // Optionnellement effacer la recherche en cours si ça correspond 
            if (searchQuery === barcode) {
                setSearchQuery('');
            }
        }
    }, activeView === 'shop' && activeAgent?.isUnlocked === true);

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
        setFormCostPrice('');
        setFormStock('');
        setFormImageUrl('');
        setFormCategory('');
        setFormLocation('');
        setFormBarcode('');
        setShowProductForm(true);
    };

    /** Ouvrir le formulaire pour modifier un produit */
    const openEditProductForm = (product: BoutiqueProduct) => {
        setEditingProduct(product);
        setFormName(product.name);
        setFormDescription(product.description || '');
        setFormPrice(product.price.toString());
        setFormCostPrice((product.cost_price || 0).toString());
        setFormStock(product.stock_quantity.toString());
        setFormImageUrl(product.image_url || '');
        setFormCategory(product.category || '');
        setFormLocation(product.location || '');
        setFormBarcode(product.barcode || '');
        setShowProductForm(true);
    };

    /** Sauvegarder le produit (création ou mise à jour) */
    const handleSaveProduct = async () => {
        if (!formName.trim() || !shop?.id) return;

        const productData = {
            name: formName.trim(),
            description: formDescription.trim() || undefined,
            price: parseFloat(formPrice) || 0,
            cost_price: parseFloat(formCostPrice) || 0,
            stock_quantity: parseInt(formStock) || 0,
            image_url: formImageUrl.trim() || undefined,
            category: formCategory.trim() || undefined,
            location: formLocation.trim() || undefined,
            barcode: formBarcode.trim() || undefined,
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

    /** Retourner du marketplace vers la boutique */
    const handleReturn = async (productId: string, quantity: number) => {
        if (!shop?.id) return;
        await returnFromMarketplace.mutateAsync({
            boutiqueProductId: productId,
            shopId: shop.id,
            quantity,
        });
        setReturningProduct(null);
    };

    // Loading state
    if (shopsLoading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
        );
    }

    const hasMultipleShops = userShops && userShops.length > 1;

    // Si multi-shop settings est ouvert
    if (showMultiShopSettings) {
        return (
            <div className="pb-16 bg-background min-h-screen">
                <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 text-white p-3 sm:p-4 shadow-md">
                    <div className="flex items-center justify-between">
                        <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
                            <Settings2 size={18} />
                            Gestion multi-boutiques
                        </h2>
                        <Button
                            onClick={() => setShowMultiShopSettings(false)}
                            size="sm"
                            variant="ghost"
                            className="text-white hover:bg-white/20"
                        >
                            ← Retour
                        </Button>
                    </div>
                </div>
                <MultiShopDashboard />
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
        <div className="pb-16 bg-white min-h-screen">
            {!activeAgent?.isUnlocked && (
                <AgentLockScreen
                    shopId={shop.id}
                    activeAgent={activeAgent}
                    inactivityMinutes={inactivityMinutes}
                    onInactivityMinutesChange={onInactivityMinutesChange}
                    onLogin={onLogin}
                    onUnlock={onUnlock}
                    forgotPassword={forgotPassword}
                    updateProfile={updateProfile}
                    onLogout={onLogout}
                />
            )}

            {/* Header boutique */}
            <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 text-white p-3 sm:p-4 shadow-md">
                <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                        {hasMultipleShops ? (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button className="flex items-center gap-2 text-left hover:bg-white/10 rounded-lg px-2 py-1 -ml-2 transition-colors">
                                        <Store size={18} className="shrink-0" />
                                        <span className="text-base sm:text-lg font-bold truncate">{shop.name}</span>
                                        <ChevronDown size={14} className="shrink-0 opacity-70" />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="w-64">
                                    {userShops?.map(s => (
                                        <DropdownMenuItem
                                            key={s.id}
                                            onClick={() => {
                                                navigate(`/shop?id=${s.id}`);
                                            }}
                                            className={`flex items-center gap-3 p-3 ${s.id === shop.id ? 'bg-accent' : ''}`}
                                        >
                                            <Store size={16} className="text-emerald-600 shrink-0" />
                                            <div className="min-w-0">
                                                <div className="font-medium truncate">{s.name}</div>
                                                <div className="text-xs text-muted-foreground">
                                                    {s.products_count} produits · {s.total_stock_units} unités
                                                </div>
                                            </div>
                                        </DropdownMenuItem>
                                    ))}
                                    <DropdownMenuItem
                                        onClick={() => setShowMultiShopSettings(true)}
                                        className="flex items-center gap-3 p-3 border-t"
                                    >
                                        <Settings2 size={16} className="text-muted-foreground shrink-0" />
                                        <span className="font-medium">Paramètres multi-boutiques</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        ) : (
                            <h2 className="text-base sm:text-lg font-bold flex items-center gap-2 truncate">
                                <Store size={18} className="shrink-0" />
                                <span className="truncate">{shop.name}</span>
                            </h2>
                        )}
                        {shop.address && (
                            <p className="text-emerald-100 text-xs mt-0.5 truncate">{shop.address}</p>
                        )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                        {!isOnline && (
                            <span className="flex items-center gap-1 text-[10px] bg-orange-500/80 px-1.5 py-0.5 rounded-full">
                                <WifiOff size={10} /> Hors ligne
                            </span>
                        )}
                        <Button
                            onClick={() => setActiveView('orders')}
                            size="icon"
                            className={`bg-white/20 hover:bg-white/30 text-white border-0 h-8 w-8 ${activeView === 'orders' ? 'bg-white/40 ring-1 ring-white/50' : ''}`}
                            title="Commandes"
                        >
                            <Bell size={16} />
                            {pendingCount > 0 && (
                                <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-sm">
                                    {pendingCount}
                                </span>
                            )}
                        </Button>
                        <Button
                            onClick={() => setInventoryOpen(true)}
                            size="icon"
                            className="bg-white/20 hover:bg-white/30 text-white border-0 h-8 w-8"
                        >
                            <PackageSearch size={16} />
                        </Button>
                        <Button
                            onClick={openNewProductForm}
                            size="icon"
                            className="bg-white/20 hover:bg-white/30 text-white border-0 h-8 w-8"
                        >
                            <Plus size={16} />
                        </Button>
                        {activeAgent?.isUnlocked && (
                            <AgentLockScreen
                                shopId={shop.id}
                                activeAgent={activeAgent}
                                inactivityMinutes={inactivityMinutes}
                                onInactivityMinutesChange={onInactivityMinutesChange}
                                triggerMode="inline"
                                triggerClassName="bg-white/20 hover:bg-white/30 text-white border-0 h-8 w-8 rounded-md overflow-hidden"
                                onLogin={onLogin}
                                onUnlock={onUnlock}
                                onLock={onLock}
                                onLogout={onLogout}
                                forgotPassword={forgotPassword}
                                updateProfile={updateProfile}
                            />
                        )}
                    </div>
                </div>

                {/* Second ligne : Navigation */}
                <div className="flex bg-white/10 dark:bg-white/5 border-t border-white/10 mt-2 overflow-x-auto no-scrollbar">
                    <button
                        onClick={() => setActiveView('shop')}
                        className={`flex-1 min-w-[80px] py-2 text-xs font-medium text-center transition-colors ${activeView === 'shop' ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white/80'}`}
                    >
                        <Store size={14} className="inline mr-1" /> Boutique
                    </button>
                    <button
                        onClick={() => setActiveView('sales')}
                        className={`flex-1 py-2 text-xs font-medium text-center transition-colors ${activeView === 'sales' ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white/80'}`}
                    >
                        <History size={14} className="inline mr-1" /> Ventes
                    </button>
                    <button
                        onClick={() => setActiveView('customers')}
                        className={`flex-1 py-2 text-xs font-medium text-center transition-colors ${activeView === 'customers' ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white/80'}`}
                    >
                        <Users size={14} className="inline mr-1" /> Clients
                    </button>
                    {isOwnerOrPDG && (
                        <button
                            onClick={() => setActiveView('agents')}
                            className={`flex-1 py-2 text-xs font-medium text-center transition-colors ${activeView === 'agents' ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white/80'}`}
                        >
                            <Users size={14} className="inline mr-1" /> Agents
                        </button>
                    )}
                </div>
            </div>

            {activeView === 'agents' ? (
                <BoutiqueAgentsManager shopId={shop.id} />
            ) : activeView === 'customers' ? (
                <CustomerManagement shopId={shop.id} />
            ) : activeView === 'orders' ? (
                <ShopOrdersPanel />
            ) : activeView === 'sales' ? (
                <BoutiqueSalesHistory shopId={shop.id} />
            ) : (
                <div>
                    {/* Dashboard ventes du jour */}
                    <TodaySalesDashboard
                        shopId={shop.id}
                        onViewHistory={() => setActiveView('sales')}
                    />

                    {/* Filtre par catégorie */}
                    {(() => {
                        const cats = [...new Set((products || []).map(p => p.category).filter(Boolean))] as string[];
                        if (cats.length === 0) return null;
                        return (
                            <div className="px-3 sm:px-4 pt-3">
                                <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-hide">
                                    <button
                                        onClick={() => setFilterCategory('all')}
                                        className={`px-3 py-1 rounded-full text-xs whitespace-nowrap transition-colors ${filterCategory === 'all' ? 'bg-emerald-600 text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                                    >
                                        Tout ({products?.length || 0})
                                    </button>
                                    {cats.map(cat => (
                                        <button
                                            key={cat}
                                            onClick={() => setFilterCategory(cat)}
                                            className={`px-3 py-1 rounded-full text-xs whitespace-nowrap transition-colors ${filterCategory === cat ? 'bg-emerald-600 text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                                        >
                                            {cat} ({products?.filter(p => p.category === cat).length})
                                        </button>
                                    ))}
                                </div>
                            </div>
                        );
                    })()}

                    {/* Liste des produits et Caisse Intégrée */}
                    <div className="p-3 sm:p-4">
                        {/* Barre de recherche */}
                        <div className="relative mb-4 flex gap-2">
                            <div className="relative flex-1">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Rechercher un produit..."
                                    className="pl-9"
                                />
                            </div>
                            <Button 
                                onClick={() => setShowCameraScanner(true)}
                                variant="outline" 
                                size="icon"
                                className="shrink-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                title="Scanner un code-barres"
                            >
                                <ScanBarcode size={20} />
                            </Button>
                        </div>

                        {/* Caisse Intégrée */}
                        {productsLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                            </div>
                        ) : (
                            <EmbeddedPos
                                products={products || []}
                                shopId={shop.id}
                                shopName={shop.name}
                                shopAddress={shop.address}
                                cartItems={posCart.items}
                                totalAmount={posCart.totalAmount}
                                totalItems={posCart.totalItems}
                                onAddItem={(p, qty) => posCart.addItem(p, qty)}
                                onUpdateQuantity={posCart.updateQuantity}
                                onRemoveItem={posCart.removeItem}
                                onClearCart={posCart.clearCart}
                                onConfirmSale={async (data) => {
                                    if (!shop?.id) return;
                                    await cartSale.mutateAsync({
                                        shopId: shop.id,
                                        items: posCart.items,
                                        customerName: data.customerName,
                                        paymentMethod: data.paymentMethod,
                                        notes: data.notes,
                                        agentId: activeAgent?.agentId,
                                    });
                                    posCart.clearCart();
                                }}
                                isProcessing={cartSale.isPending}
                                searchQuery={searchQuery}
                                filterCategory={filterCategory}
                                onEditProduct={openEditProductForm}
                                onDeleteProduct={(id) => setDeletingProductId(id)}
                                onTransferProduct={(p) => setTransferProduct(p)}
                                onReturnProduct={(p) => setReturningProduct(p)}
                            />
                        )}
                    </div>
                </div>
            )}

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
                            <Label htmlFor="product-barcode">Code-barres / EAN</Label>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Barcode size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        id="product-barcode"
                                        value={formBarcode}
                                        onChange={(e) => setFormBarcode(e.target.value)}
                                        placeholder="Scanner ou saisir..."
                                        className="pl-9"
                                    />
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={() => {
                                        setScanTarget('form');
                                        setShowCameraScanner(true);
                                    }}
                                    title="Scanner avec la caméra"
                                >
                                    <ScanBarcode size={18} />
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={() => {
                                        // Générer un EAN-13 factice (prefixe 200 interne)
                                        const prefix = "200";
                                        const random = Math.floor(Math.random() * 1000000000).toString().padStart(9, '0');
                                        const code = prefix + random;
                                        // Calcul checksum ean13
                                        let sum = 0;
                                        for (let i = 0; i < 12; i++) {
                                            sum += parseInt(code[i]) * (i % 2 === 0 ? 1 : 3);
                                        }
                                        const check = (10 - (sum % 10)) % 10;
                                        setFormBarcode(code + check);
                                    }}
                                    title="Générer automatiquement"
                                >
                                    <Wand2 size={18} />
                                </Button>
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-1">
                                Laissez vide pour ignorer. Utilisez le bouton scan ou votre douchette.
                            </p>
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
                                <Label htmlFor="product-price">Prix de vente</Label>
                                <Input
                                    id="product-price"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={formPrice}
                                    onChange={(e) => setFormPrice(e.target.value)}
                                    placeholder="0"
                                />
                            </div>
                            <div>
                                <Label htmlFor="product-cost">Prix d'achat</Label>
                                <Input
                                    id="product-cost"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={formCostPrice}
                                    onChange={(e) => setFormCostPrice(e.target.value)}
                                    placeholder="0"
                                />
                            </div>
                        </div>
                        {formPrice && formCostPrice && parseFloat(formPrice) > 0 && parseFloat(formCostPrice) > 0 && (
                            <div className="bg-muted/50 rounded-lg p-2 text-xs text-center">
                                Marge : <span className="font-bold text-primary">
                                    {((parseFloat(formPrice) - parseFloat(formCostPrice)) / parseFloat(formPrice) * 100).toFixed(0)}%
                                </span> · Bénéfice/unité : <span className="font-bold text-primary">
                                    {(parseFloat(formPrice) - parseFloat(formCostPrice)).toLocaleString('fr-FR')} FCFA
                                </span>
                            </div>
                        )}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <SimpleAutocomplete
                                    label="Catégorie"
                                    value={formCategory}
                                    onChange={setFormCategory}
                                    options={uniqueCategories}
                                    placeholder="Ex: Électronique"
                                />
                            </div>
                            <div>
                                <SimpleAutocomplete
                                    label="Emplacement"
                                    value={formLocation}
                                    onChange={setFormLocation}
                                    options={uniqueLocations}
                                    placeholder="Ex: Rayon A"
                                />
                            </div>
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
                onConfirm={(productId, quantity) => {
                    handleTransfer(productId, quantity);
                }}
                isLoading={transferToMarketplace.isPending}
            />

            {/* Dialog retour */}
            <ReturnDialog
                product={returningProduct}
                isOpen={!!returningProduct}
                onClose={() => setReturningProduct(null)}
                onConfirm={(productId, quantity) => {
                    handleReturn(productId, quantity);
                }}
                isLoading={returnFromMarketplace.isPending}
            />

            {/* Scanner caméra */}
            {showCameraScanner && (
                <CameraBarcodeScanner
                    onClose={() => setShowCameraScanner(false)}
                    onScan={(barcode) => {
                        if (scanTarget === 'form') {
                          setFormBarcode(barcode);
                          setShowCameraScanner(false);
                          return;
                        }

                        if (!products) return;
                        const product = products.find(p => p.barcode === barcode);
                        if (product) {
                            posCart.addItem(product, 1);
                        }
                    }}
                />
            )}

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

            {/* Drawer Inventaire */}
            <InventoryDrawer
                open={inventoryOpen}
                onOpenChange={setInventoryOpen}
                shopId={shop.id}
            />
        </div>
    );
};

export default BoutiqueManagement;
