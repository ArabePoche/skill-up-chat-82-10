/**
 * Tableau de bord multi-boutiques
 */
import React, { useState } from 'react';
import { Store, Package, TrendingUp, AlertTriangle, Plus, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUserShops, useMultiShopStats, useCreateNewShop } from '@/hooks/shop/useMultiShop';
import { useUnreadShopMessagesCount } from '@/hooks/shop/useShopChat';
import ShopSelector from './ShopSelector';
import GlobalInventoryView from './GlobalInventoryView';
import InterShopTransferHistory from './InterShopTransferHistory';
import ShopChatInterface from './ShopChatInterface';
import CreateShopDialog from './CreateShopDialog';

const MultiShopDashboard: React.FC = () => {
  const { data: shops, isLoading: shopsLoading } = useUserShops();
  const { data: stats } = useMultiShopStats();
  const { data: unreadCount = 0 } = useUnreadShopMessagesCount();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedTab, setSelectedTab] = useState('overview');

  if (shopsLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
      </div>
    );
  }

  if (!shops || shops.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Store size={32} className="text-emerald-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Aucune boutique</h2>
        <p className="text-gray-500 mb-6">Créez votre première boutique pour commencer</p>
        <Button 
          onClick={() => setShowCreateDialog(true)}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          <Plus size={16} className="mr-2" />
          Créer une boutique
        </Button>
        <CreateShopDialog 
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
        />
      </div>
    );
  }

  if (shops.length === 1) {
    // Rediriger vers la gestion de boutique unique
    return (
      <div className="text-center py-16">
        <p className="text-gray-500 mb-4">Vous avez une seule boutique</p>
        <Button 
          onClick={() => window.location.href = '/shop'}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          Gérer ma boutique
        </Button>
      </div>
    );
  }

  return (
    <div className="pb-16 bg-white min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 text-white p-4 shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Store size={24} />
              Multi-Boutiques
            </h1>
            <p className="text-emerald-100 text-sm">
              Gérez {stats?.totalShops || 0} boutique(s)
            </p>
          </div>
          <Button
            onClick={() => setShowCreateDialog(true)}
            size="sm"
            className="bg-white/20 hover:bg-white/30 text-white border-0"
          >
            <Plus size={16} className="mr-2" />
            Nouvelle boutique
          </Button>
        </div>

        {/* Stats rapides */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
            <div className="bg-white/15 rounded-lg p-3 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <Package size={16} className="text-emerald-200" />
                <div>
                  <div className="text-lg font-bold">{stats.totalProducts}</div>
                  <div className="text-xs text-emerald-100">Produits</div>
                </div>
              </div>
            </div>
            <div className="bg-white/15 rounded-lg p-3 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <TrendingUp size={16} className="text-emerald-200" />
                <div>
                  <div className="text-lg font-bold">{stats.totalStockUnits}</div>
                  <div className="text-xs text-emerald-100">Unités</div>
                </div>
              </div>
            </div>
            <div className="bg-white/15 rounded-lg p-3 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <span className="text-emerald-200">€</span>
                <div>
                  <div className="text-lg font-bold">{stats.totalStockValue.toFixed(0)}</div>
                  <div className="text-xs text-emerald-100">Valeur</div>
                </div>
              </div>
            </div>
            <div className="bg-white/15 rounded-lg p-3 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-orange-300" />
                <div>
                  <div className="text-lg font-bold">{stats.lowStockProducts}</div>
                  <div className="text-xs text-emerald-100">Stock faible</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sélecteur de boutique */}
      <div className="p-4 border-b bg-gray-50">
        <ShopSelector shops={shops} />
      </div>

      {/* Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="px-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="inventory">Inventaire global</TabsTrigger>
          <TabsTrigger value="transfers">Transferts</TabsTrigger>
          <TabsTrigger value="chat" className="relative">
            Chat
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="grid gap-4">
            {shops.map(shop => (
              <div key={shop.id} className="bg-white border rounded-lg p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-lg">{shop.name}</h3>
                    {shop.address && (
                      <p className="text-sm text-gray-500">{shop.address}</p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.location.href = `/shop?id=${shop.id}`}
                  >
                    Gérer
                  </Button>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  <div className="text-center bg-gray-50 rounded p-2">
                    <div className="font-bold text-lg">{shop.products_count}</div>
                    <div className="text-gray-500">Produits</div>
                  </div>
                  <div className="text-center bg-blue-50 rounded p-2">
                    <div className="font-bold text-lg">{shop.total_stock_units}</div>
                    <div className="text-blue-600">Unités</div>
                  </div>
                  <div className="text-center bg-green-50 rounded p-2">
                    <div className="font-bold text-lg">{shop.total_stock_value.toFixed(0)}€</div>
                    <div className="text-green-600">Valeur</div>
                  </div>
                  <div className="text-center bg-orange-50 rounded p-2">
                    <div className="font-bold text-lg">{shop.low_stock_products}</div>
                    <div className="text-orange-600">Stock faible</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="inventory" className="mt-4">
          <GlobalInventoryView />
        </TabsContent>

        <TabsContent value="transfers" className="mt-4">
          <InterShopTransferHistory />
        </TabsContent>

        <TabsContent value="chat" className="mt-4">
          <ShopChatInterface />
        </TabsContent>
      </Tabs>

      <CreateShopDialog 
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />
    </div>
  );
};

export default MultiShopDashboard;