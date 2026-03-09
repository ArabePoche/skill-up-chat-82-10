/**
 * Vue globale de l'inventaire multi-boutiques
 */
import React, { useState } from 'react';
import { Package, Search, ArrowUpDown, Store } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useUserShops } from '@/hooks/shop/useMultiShop';
import { useBoutiqueProducts } from '@/hooks/shop/useBoutiqueProducts';
import TransferBetweenShopsDialog from './TransferBetweenShopsDialog';

interface GlobalProduct {
  name: string;
  shops: {
    shop_id: string;
    shop_name: string;
    product_id: string;
    stock_quantity: number;
    marketplace_quantity: number;
    price: number;
    image_url?: string;
  }[];
  total_stock: number;
  total_value: number;
}

const GlobalInventoryView: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [transferDialog, setTransferDialog] = useState<{
    productId: string;
    productName: string;
    fromShopId: string;
    fromShopName: string;
  } | null>(null);

  const { data: shops = [] } = useUserShops();

  // Récupérer les produits de toutes les boutiques
  const productQueries = shops.map(shop => 
    useBoutiqueProducts(shop.id)
  );

  const isLoading = productQueries.some(q => q.isLoading);
  const allProducts = productQueries.flatMap(q => q.data || []);

  // Grouper les produits par nom
  const globalProducts: GlobalProduct[] = React.useMemo(() => {
    const productMap = new Map<string, GlobalProduct>();

    allProducts.forEach(product => {
      const shop = shops.find(s => s.id === product.shop_id);
      if (!shop) return;

      const key = product.name.toLowerCase();
      
      if (!productMap.has(key)) {
        productMap.set(key, {
          name: product.name,
          shops: [],
          total_stock: 0,
          total_value: 0,
        });
      }

      const globalProduct = productMap.get(key)!;
      globalProduct.shops.push({
        shop_id: product.shop_id,
        shop_name: shop.name,
        product_id: product.id,
        stock_quantity: product.stock_quantity,
        marketplace_quantity: product.marketplace_quantity,
        price: product.price,
        image_url: product.image_url,
      });

      globalProduct.total_stock += product.stock_quantity;
      globalProduct.total_value += product.stock_quantity * product.price;
    });

    return Array.from(productMap.values())
      .filter(product => 
        product.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
  }, [allProducts, shops, searchQuery]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Barre de recherche */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Rechercher un produit..."
          className="pl-9"
        />
      </div>

      {/* Liste des produits */}
      {globalProducts.length === 0 ? (
        <div className="text-center py-16">
          <Package size={48} className="mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">
            {searchQuery ? `Aucun produit trouvé pour "${searchQuery}"` : 'Aucun produit dans vos boutiques'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {globalProducts.map(product => (
            <div key={product.name} className="bg-card border rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{product.name}</h3>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                    <span>{product.total_stock} unités au total</span>
                    <span>{product.total_value.toFixed(2)}€ de valeur</span>
                  </div>
                </div>
                {product.shops[0]?.image_url && (
                  <img
                    src={product.shops[0].image_url}
                    alt={product.name}
                    className="w-16 h-16 object-cover rounded-lg"
                  />
                )}
              </div>

              {/* Répartition par boutique */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  Répartition par boutique :
                </p>
                <div className="grid gap-2">
                  {product.shops.map(shopProduct => (
                    <div
                      key={`${shopProduct.shop_id}-${shopProduct.product_id}`}
                      className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                          <Store size={14} className="text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{shopProduct.shop_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {shopProduct.price.toFixed(2)}€ / unité
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-sm font-medium">
                            {shopProduct.stock_quantity} unités
                          </p>
                          {shopProduct.marketplace_quantity > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {shopProduct.marketplace_quantity} en ligne
                            </Badge>
                          )}
                        </div>
                        
                        {shopProduct.stock_quantity > 0 && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setTransferDialog({
                              productId: shopProduct.product_id,
                              productName: product.name,
                              fromShopId: shopProduct.shop_id,
                              fromShopName: shopProduct.shop_name,
                            })}
                          >
                            <ArrowUpDown size={14} className="mr-1" />
                            Transférer
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dialog de transfert */}
      {transferDialog && (
        <TransferBetweenShopsDialog
          isOpen={!!transferDialog}
          onClose={() => setTransferDialog(null)}
          productId={transferDialog.productId}
          productName={transferDialog.productName}
          fromShopId={transferDialog.fromShopId}
          fromShopName={transferDialog.fromShopName}
          availableShops={shops.filter(s => s.id !== transferDialog.fromShopId)}
        />
      )}
    </div>
  );
};

export default GlobalInventoryView;