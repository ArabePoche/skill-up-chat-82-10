
import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShopFormations, useFormationCategories } from '@/hooks/useShopFormations';
import { useProducts } from '@/hooks/useProducts';
import { useProductCategories } from '@/hooks/useProductCategories';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/hooks/useCart';
import { useUserInterests } from '@/hooks/useUserInterests';
import { Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ShopHeader from '@/components/shop/ShopHeader';
import ShopSidebar from '@/components/shop/ShopSidebar';
import CategoryFilter from '@/components/shop/CategoryFilter';
import FormationSections from '@/components/shop/FormationSections';
import ProductSections from '@/components/shop/ProductSections';
import CartDrawer from '@/components/shop/cart/CartDrawer';
import { useTranslation } from 'react-i18next';

const Shop = () => {
  const { t } = useTranslation();
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('formations');
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 500]);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { cartItemsCount, addToCart } = useCart();
  const { data: userInterests = [] } = useUserInterests();
  
  const { data: formations, isLoading: formationsLoading } = useShopFormations(activeCategory);
  const { data: formationCategories, isLoading: formationCategoriesLoading } = useFormationCategories();
  const { data: products, isLoading: productsLoading } = useProducts(activeCategory);
  const { data: productCategories, isLoading: productCategoriesLoading } = useProductCategories();

  const handleViewDetails = useCallback((formationId: string) => {
    console.log('Shop: Navigating to formation details:', formationId);
    navigate(`/formation/${formationId}`);
  }, [navigate]);

  const filteredFormations = formations?.filter(formation => {
    const title = formation.title || '';
    const description = formation.description || '';
    const query = searchQuery.toLowerCase();
    
    return title.toLowerCase().includes(query) ||
           description.toLowerCase().includes(query);
  }) || [];

  const filteredProducts = products?.filter(product => {
    const title = product.title || '';
    const description = product.description || '';
    const query = searchQuery.toLowerCase();
    const inPriceRange = product.price >= priceRange[0] && product.price <= priceRange[1];
    
    return (title.toLowerCase().includes(query) ||
           description.toLowerCase().includes(query)) && inPriceRange;
  }) || [];

  const currentCategories = activeTab === 'formations' 
    ? [{ id: 'all', name: 'all', label: t('shop.all') }, ...(formationCategories || [])]
    : [{ id: 'all', name: 'all', label: t('shop.all') }, ...(productCategories || [])];

  const isLoading = activeTab === 'formations' 
    ? formationsLoading || formationCategoriesLoading
    : productsLoading || productCategoriesLoading;

  return (
    <div className="min-h-screen bg-gray-50 pb-16 md:pt-16 md:pb-0">
      <ShopHeader
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        cartItemsCount={cartItemsCount}
        onCartClick={() => setCartDrawerOpen(true)}
      />

      <CartDrawer 
        isOpen={cartDrawerOpen}
        onClose={() => setCartDrawerOpen(false)}
      />

      <div className="flex flex-col md:flex-row">
        {/* Sidebar Desktop */}
        <div className="hidden md:block w-80 flex-shrink-0">
          <ShopSidebar
            categories={currentCategories}
            activeCategory={activeCategory}
            setActiveCategory={setActiveCategory}
            priceRange={priceRange}
            setPriceRange={setPriceRange}
            isVisible={true}
            onClose={() => {}}
          />
        </div>

        {/* Sidebar Mobile */}
        {sidebarVisible && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarVisible(false)} />
            <div className="relative">
              <ShopSidebar
                categories={currentCategories}
                activeCategory={activeCategory}
                setActiveCategory={setActiveCategory}
                priceRange={priceRange}
                setPriceRange={setPriceRange}
                isVisible={true}
                onClose={() => setSidebarVisible(false)}
              />
            </div>
          </div>
        )}

        {/* Contenu principal */}
        <div className="flex-1 min-w-0">
          {/* Filters top bar mobile */}
          <div className="md:hidden p-2 sm:p-4 bg-white border-b">
            <div className="flex items-center justify-between gap-2">
              <Button
                variant="outline"
                onClick={() => setSidebarVisible(true)}
                className="flex items-center space-x-2 text-xs sm:text-sm"
                size="sm"
              >
                <Filter size={14} />
                <span>{t('shop.filters')}</span>
              </Button>
              <div className="flex-1 max-w-xs">
                <CategoryFilter
                  categories={currentCategories.slice(0, 3)}
                  activeCategory={activeCategory}
                  setActiveCategory={setActiveCategory}
                  isLoading={isLoading}
                />
              </div>
            </div>
          </div>

          <div className="p-2 sm:p-4 lg:p-6">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <div className="text-gray-500">{t('common.loading')}</div>
              </div>
            ) : activeTab === 'formations' ? (
              <FormationSections
                formations={filteredFormations}
                onViewDetails={handleViewDetails}
                userInterests={userInterests}
              />
            ) : (
              <ProductSections
                products={filteredProducts}
                user={user}
                onAddToCart={addToCart}
                userInterests={userInterests}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Shop;
