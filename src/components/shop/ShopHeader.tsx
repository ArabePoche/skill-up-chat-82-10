
import React from 'react';
import { Search, Filter, ShoppingCart, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTranslation } from 'react-i18next';

interface ShopHeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  cartItemsCount?: number;
  onCartClick: () => void;
}

const ShopHeader: React.FC<ShopHeaderProps> = ({
  activeTab,
  setActiveTab,
  searchQuery,
  setSearchQuery,
  cartItemsCount = 0,
  onCartClick
}) => {
  const { t } = useTranslation();
  
  return (
    <div className="bg-gradient-to-r from-blue-900 to-blue-700 text-white sticky top-0 z-40 shadow-lg">
      {/* Header principal */}
      <div className="px-[0.5rem] sm:px-[1rem] py-[0.5rem] sm:py-[0.75rem]">
        <div className="flex items-center justify-between mb-[0.5rem] sm:mb-[0.75rem]">
          <div className="flex items-center space-x-[0.5rem] sm:space-x-[1rem]">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 w-[2rem] h-[2rem] sm:w-[2.5rem] sm:h-[2.5rem]">
              <Menu className="w-[1rem] h-[1rem] sm:hidden" />
              <Menu className="w-[1.25rem] h-[1.25rem] hidden sm:block" />
            </Button>
            <h1 className="text-[1.125rem] sm:text-[1.25rem] font-bold">EducaShop</h1>
          </div>
          
          {/* Panier */}
          <div className="relative">
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-white hover:bg-white/20 w-[2rem] h-[2rem] sm:w-[2.5rem] sm:h-[2.5rem]"
              onClick={onCartClick}
            >
              <ShoppingCart className="w-[1rem] h-[1rem] sm:hidden" />
              <ShoppingCart className="w-[1.25rem] h-[1.25rem] hidden sm:block" />
              {cartItemsCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-orange-500 text-white rounded-full min-w-[1rem] min-h-[1rem] w-auto h-auto sm:min-w-[1.25rem] sm:min-h-[1.25rem] flex items-center justify-center font-bold text-[0.625rem] sm:text-[0.75rem] p-[0.125rem]">
                  {cartItemsCount > 9 ? '9+' : cartItemsCount}
                </span>
              )}
            </Button>
          </div>
        </div>

        {/* Barre de recherche */}
        <div className="flex items-center space-x-[0.25rem] sm:space-x-[0.5rem]">
          <div className="relative flex-1">
            <Input
              type="text"
              placeholder={t('shop.searchPlaceholder', { type: activeTab === 'formations' ? t('shop.formations') : t('shop.products') })}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white text-black border-0 focus:ring-2 focus:ring-orange-500 rounded-sm text-[0.875rem] sm:text-base h-[2rem] sm:h-[2.5rem]"
            />
            <Button 
              size="icon" 
              className="absolute right-0 top-0 h-full bg-orange-500 hover:bg-orange-600 rounded-l-none w-[2rem] sm:w-[2.5rem]"
            >
              <Search className="w-[0.875rem] h-[0.875rem] sm:hidden" />
              <Search className="w-[1rem] h-[1rem] hidden sm:block" />
            </Button>
          </div>
        </div>
      </div>

      {/* Onglets */}
      <div className="px-[0.5rem] sm:px-[1rem] pb-[0.25rem] sm:pb-[0.5rem]">
        <div className="flex space-x-[0.5rem] sm:space-x-[1rem] border-b border-white/20 overflow-x-auto">
          <button
            onClick={() => setActiveTab('formations')}
            className={`pb-[0.5rem] sm:pb-[0.75rem] px-[1rem] sm:px-[1.5rem] font-semibold transition-all duration-200 border-b-[3px] whitespace-nowrap text-[0.875rem] sm:text-base rounded-t-md ${
              activeTab === 'formations'
                ? 'border-orange-500 text-white bg-white/10 shadow-lg'
                : 'border-transparent text-white/70 hover:text-white hover:bg-white/5'
            }`}
          >
            {t('shop.formations')}
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`pb-[0.5rem] sm:pb-[0.75rem] px-[1rem] sm:px-[1.5rem] font-semibold transition-all duration-200 border-b-[3px] whitespace-nowrap text-[0.875rem] sm:text-base rounded-t-md ${
              activeTab === 'products'
                ? 'border-orange-500 text-white bg-white/10 shadow-lg'
                : 'border-transparent text-white/70 hover:text-white hover:bg-white/5'
            }`}
          >
            {t('shop.products')}
          </button>
          <button
            onClick={() => setActiveTab('services')}
            className={`pb-[0.5rem] sm:pb-[0.75rem] px-[1rem] sm:px-[1.5rem] font-semibold transition-all duration-200 border-b-[3px] whitespace-nowrap text-[0.875rem] sm:text-base rounded-t-md ${
              activeTab === 'services'
                ? 'border-orange-500 text-white bg-white/10 shadow-lg'
                : 'border-transparent text-white/70 hover:text-white hover:bg-white/5'
            }`}
          >
            {t('shop.services', 'Services')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShopHeader;