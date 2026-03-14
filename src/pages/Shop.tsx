
import React, { useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useShopFormations, useFormationCategories } from '@/hooks/useShopFormations';
import { useProducts } from '@/hooks/useProducts';
import { useProductCategories } from '@/hooks/useProductCategories';
import { useServices } from '@/components/shop/services/hooks/useServices';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/hooks/useCart';
import { useUserInterests } from '@/hooks/useUserInterests';
import { useIsShopOwner } from '@/hooks/shop/usePhysicalShop';
import { Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ShopHeader from '@/components/shop/ShopHeader';
import ShopSidebar from '@/components/shop/ShopSidebar';
import CategoryFilter from '@/components/shop/CategoryFilter';
import FormationSections from '@/components/shop/FormationSections';
import ProductSections from '@/components/shop/ProductSections';
import ServiceSections from '@/components/shop/ServiceSections';
import CartDrawer from '@/components/shop/cart/CartDrawer';
import BoutiqueTopTabs from '@/components/shop/boutique/BoutiqueTopTabs';
import BoutiqueManagement from '@/components/shop/boutique/BoutiqueManagement';
import { useTranslation } from 'react-i18next';
import { useAgentAuth } from '@/hooks/shop/useAgentAuth';
import { AgentLockScreen } from '@/components/shop/boutique/AgentLockScreen';
import { usePhysicalShop } from '@/hooks/shop/usePhysicalShop';
import { useUserShops } from '@/hooks/shop/useMultiShop';
import { useIsShopAgent } from '@/hooks/shop/useShopAgentRequests';
import { useMyAgentStatus } from '@/hooks/shop/useShopAgentRequests';
import AgentRequestDialog from '@/components/shop/boutique/AgentRequestDialog';
import PendingAgentRequestsPanel from '@/components/shop/boutique/PendingAgentRequestsPanel';
import { Badge } from '@/components/ui/badge';
import { Clock, UserPlus } from 'lucide-react';

const Shop = () => {
  const { t } = useTranslation();
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('formations');
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 5000000]);
  const [mainView, setMainView] = useState<'marketplace' | 'gestion'>('marketplace');
  const [showAgentRequestDialog, setShowAgentRequestDialog] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { cartItemsCount, addToCart } = useCart();
  const { data: userInterests = [] } = useUserInterests();
  const { data: isShopOwner, isLoading: isShopOwnerLoading } = useIsShopOwner();

  const { data: formations, isLoading: formationsLoading } = useShopFormations(activeCategory);
  const { data: formationCategories, isLoading: formationCategoriesLoading } = useFormationCategories();
  const { data: products, isLoading: productsLoading } = useProducts(activeCategory);
  const { data: productCategories, isLoading: productCategoriesLoading } = useProductCategories();
  const { data: services, isLoading: servicesLoading } = useServices(activeCategory);
  const { data: physicalShop } = usePhysicalShop();
  const { data: userShops } = useUserShops();
  const { data: agentStatuses } = useIsShopAgent();
  const shopIdFromUrl = searchParams.get('id');
  const shop = userShops?.find((candidate) => candidate.id === shopIdFromUrl) || userShops?.[0] || physicalShop;

  // Vérifier si l'utilisateur est agent actif dans la boutique courante
  const isActiveAgent = agentStatuses?.some(
    (a) => a.shop_id === shop?.id && a.status === 'active'
  );
  const isPendingAgent = agentStatuses?.some(
    (a) => a.shop_id === shop?.id && a.status === 'pending'
  );

  // L'utilisateur peut voir les onglets s'il est propriétaire OU agent actif
  const canAccessGestion = isShopOwner || isActiveAgent;
  // Montrer les onglets si propriétaire, agent actif, ou agent en attente
  const showTabs = isShopOwner || isActiveAgent || isPendingAgent;

  const {
    activeAgent,
    inactivityMinutes,
    updateInactivityMinutes,
    login,
    unlock,
    forgotPassword,
    updateProfile,
  } = useAgentAuth(shop?.id, { lockScopeActive: canAccessGestion && mainView === 'gestion' });

  const handleViewDetails = useCallback((formationId: string) => {
    console.log('Shop: Navigating to formation details:', formationId);
    navigate(`/formation/${formationId}`);
  }, [navigate]);

  // Quand un agent en attente ou non-agent clique sur Gestion
  const handleViewChange = (view: 'marketplace' | 'gestion') => {
    if (view === 'gestion' && !canAccessGestion) {
      if (isPendingAgent) {
        // Agent en attente: juste informer
        return;
      }
      // Pas encore agent : ouvrir le dialog de demande
      setShowAgentRequestDialog(true);
      return;
    }
    setMainView(view);
  };

  const filteredFormations = formations?.filter(formation => {
    const title = formation.title || '';
    const description = formation.description || '';
    const query = searchQuery.toLowerCase();
    return title.toLowerCase().includes(query) || description.toLowerCase().includes(query);
  }) || [];

  const filteredProducts = products?.filter(product => {
    const title = product.title || '';
    const description = product.description || '';
    const query = searchQuery.toLowerCase();
    const inPriceRange = product.price >= priceRange[0] && product.price <= priceRange[1];
    return (title.toLowerCase().includes(query) || description.toLowerCase().includes(query)) && inPriceRange;
  }) || [];

  const filteredServices = services?.filter(service => {
    const name = service.name || '';
    const description = service.description || '';
    const query = searchQuery.toLowerCase();
    const inPriceRange = service.price >= priceRange[0] && service.price <= priceRange[1];
    return (name.toLowerCase().includes(query) || description.toLowerCase().includes(query)) && inPriceRange;
  }) || [];

  const currentCategories = activeTab === 'formations'
    ? [{ id: 'all', name: 'all', label: t('shop.all') }, ...(formationCategories || [])]
    : activeTab === 'products'
      ? [{ id: 'all', name: 'all', label: t('shop.all') }, ...(productCategories || [])]
      : [{ id: 'all', name: 'all', label: t('shop.all') }];

  const isLoading = activeTab === 'formations'
    ? formationsLoading || formationCategoriesLoading
    : activeTab === 'products'
      ? productsLoading || productCategoriesLoading
      : servicesLoading;

  return (
    <div className={`min-h-screen bg-background pb-16 md:pb-0 relative ${showTabs ? 'md:pt-0' : 'md:pt-16'}`}>
      {/* Onglets TikTok-style pour les propriétaires/agents */}
      {showTabs && (
        <>
          <div className="md:hidden sticky top-0 left-0 right-0 z-[100] bg-background">
            <BoutiqueTopTabs activeView={mainView} onViewChange={handleViewChange} />
            {isPendingAgent && !canAccessGestion && mainView === 'marketplace' && (
              <div className="bg-muted/50 px-4 py-2 text-xs text-muted-foreground flex items-center gap-2">
                <Clock size={14} />
                Votre demande d'accès est en attente d'approbation
              </div>
            )}
          </div>
          <div className="hidden md:block">
            <BoutiqueTopTabs activeView={mainView} onViewChange={handleViewChange} />
            {isPendingAgent && !canAccessGestion && (
              <div className="bg-muted/50 px-4 py-2 text-xs text-muted-foreground flex items-center gap-2 justify-center">
                <Clock size={14} />
                Votre demande d'accès est en attente d'approbation
              </div>
            )}
          </div>
        </>
      )}

      {/* Lock screen pour les agents/proprios */}
      {canAccessGestion && shop && mainView !== 'gestion' && !activeAgent?.isUnlocked && (
        <AgentLockScreen
          shopId={shop.id}
          activeAgent={activeAgent}
          inactivityMinutes={inactivityMinutes}
          onInactivityMinutesChange={updateInactivityMinutes}
          onLogin={login}
          onUnlock={unlock}
          forgotPassword={forgotPassword}
          updateProfile={updateProfile}
        />
      )}

      {/* Vue Gestion boutique */}
      {canAccessGestion && mainView === 'gestion' ? (
        <div>
          {/* Panneau des demandes en attente (visible par le propriétaire) */}
          {isShopOwner && shop && (
            <div className="p-4">
              <PendingAgentRequestsPanel shopId={shop.id} />
            </div>
          )}
          <BoutiqueManagement
            activeAgent={activeAgent}
            inactivityMinutes={inactivityMinutes}
            onInactivityMinutesChange={updateInactivityMinutes}
            onLogin={login}
            onUnlock={unlock}
            forgotPassword={forgotPassword}
            updateProfile={updateProfile}
          />
        </div>
      ) : (
        <>
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
                onClose={() => { }}
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
              <div className="md:hidden p-2 sm:p-4 bg-background border-b">
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
                    <div className="text-muted-foreground">{t('common.loading')}</div>
                  </div>
                ) : activeTab === 'formations' ? (
                  <FormationSections
                    formations={filteredFormations}
                    onViewDetails={handleViewDetails}
                    userInterests={userInterests}
                  />
                ) : activeTab === 'products' ? (
                  <ProductSections
                    products={filteredProducts}
                    user={user}
                    onAddToCart={addToCart}
                    userInterests={userInterests}
                  />
                ) : (
                  <ServiceSections
                    services={filteredServices}
                    onBookService={(serviceId) => console.log('Book service:', serviceId)}
                  />
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Dialog de demande d'accès agent */}
      {shop && (
        <AgentRequestDialog
          open={showAgentRequestDialog}
          onOpenChange={setShowAgentRequestDialog}
          shopId={shop.id}
          shopName={shop.name}
        />
      )}
    </div>
  );
};

export default Shop;
