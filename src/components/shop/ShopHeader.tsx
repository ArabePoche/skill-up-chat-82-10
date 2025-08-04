
import React from 'react';
import { Search, Filter, ShoppingCart, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ShopHeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  cartItemsCount?: number;
}

const ShopHeader: React.FC<ShopHeaderProps> = ({
  activeTab,
  setActiveTab,
  searchQuery,
  setSearchQuery,
  cartItemsCount = 0
}) => {
  return (
    <div className="bg-gradient-to-r from-blue-900 to-blue-700 text-white sticky top-0 z-40 shadow-lg">
      {/* Header principal */}
      <div className="px-2 sm:px-4 py-2 sm:py-3">
        <div className="flex items-center justify-between mb-2 sm:mb-3">
          <div className="flex items-center space-x-2 sm:space-x-4">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 w-8 h-8 sm:w-10 sm:h-10">
              <Menu size={16} className="sm:hidden" />
              <Menu size={20} className="hidden sm:block" />
            </Button>
            <h1 className="text-lg sm:text-xl font-bold">EduShop</h1>
          </div>
          
          {/* Panier */}
          <div className="relative">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 w-8 h-8 sm:w-10 sm:h-10">
              <ShoppingCart size={16} className="sm:hidden" />
              <ShoppingCart size={20} className="hidden sm:block" />
              {cartItemsCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center font-bold text-[10px] sm:text-xs">
                  {cartItemsCount > 9 ? '9+' : cartItemsCount}
                </span>
              )}
            </Button>
          </div>
        </div>

        {/* Barre de recherche */}
        <div className="flex items-center space-x-1 sm:space-x-2">
          <div className="relative flex-1">
            <Input
              type="text"
              placeholder={`Rechercher des ${activeTab === 'formations' ? 'formations' : 'produits'}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white text-black border-0 focus:ring-2 focus:ring-orange-500 rounded-sm text-sm sm:text-base h-8 sm:h-10"
            />
            <Button 
              size="icon" 
              className="absolute right-0 top-0 h-full bg-orange-500 hover:bg-orange-600 rounded-l-none w-8 sm:w-10"
            >
              <Search size={14} className="sm:hidden" />
              <Search size={16} className="hidden sm:block" />
            </Button>
          </div>
        </div>
      </div>

      {/* Onglets */}
      <div className="px-2 sm:px-4 pb-1 sm:pb-2">
        <div className="flex space-x-4 sm:space-x-6 border-b border-white/20 overflow-x-auto">
          <button
            onClick={() => setActiveTab('formations')}
            className={`pb-1 sm:pb-2 px-1 font-medium transition-colors border-b-2 whitespace-nowrap text-sm sm:text-base ${
              activeTab === 'formations'
                ? 'border-orange-500 text-orange-200'
                : 'border-transparent text-white/80 hover:text-white'
            }`}
          >
            Formations
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`pb-1 sm:pb-2 px-1 font-medium transition-colors border-b-2 whitespace-nowrap text-sm sm:text-base ${
              activeTab === 'products'
                ? 'border-orange-500 text-orange-200'
                : 'border-transparent text-white/80 hover:text-white'
            }`}
          >
            Produits
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShopHeader;