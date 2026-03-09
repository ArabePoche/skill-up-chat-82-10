/**
 * Sélecteur de boutique pour navigation rapide
 */
import React from 'react';
import { Store, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ShopWithProducts } from '@/hooks/shop/useMultiShop';

interface ShopSelectorProps {
  shops: ShopWithProducts[];
  selectedShopId?: string;
  onSelectShop?: (shopId: string) => void;
  showNavigation?: boolean;
}

const ShopSelector: React.FC<ShopSelectorProps> = ({
  shops,
  selectedShopId,
  onSelectShop,
  showNavigation = true,
}) => {
  const selectedShop = shops.find(s => s.id === selectedShopId);

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Store size={20} className="text-emerald-600" />
        <div>
          <p className="text-sm text-gray-500">Boutiques disponibles</p>
          <p className="font-medium">{shops.length} boutique(s)</p>
        </div>
      </div>

      {showNavigation && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              {selectedShop ? selectedShop.name : 'Choisir une boutique'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            {shops.map(shop => (
              <DropdownMenuItem
                key={shop.id}
                onClick={() => onSelectShop?.(shop.id)}
                className="flex items-start gap-3 p-3"
              >
                <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center shrink-0">
                  <Store size={16} className="text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{shop.name}</div>
                  {shop.address && (
                    <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                      <MapPin size={10} />
                      <span className="truncate">{shop.address}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-xs">
                    <span className="text-gray-500">{shop.products_count} produits</span>
                    <span className="text-emerald-600">{shop.total_stock_units} unités</span>
                  </div>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
};

export default ShopSelector;