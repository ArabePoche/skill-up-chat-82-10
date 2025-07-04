
import React, { useState } from 'react';
import { Users, BookOpen, Package, Settings, BarChart3, Shield, Activity, MessageCircle, CheckCircle, Clock, Crown, UserCheck, Video } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import FormationsManagement from '@/components/admin/FormationsManagement';
import ProductsManagement from '@/components/admin/ProductsManagement';
import UsersManagement from '@/components/admin/UsersManagement';
import ServicesManagement from '@/components/admin/ServicesManagement';
import DashboardStats from '@/components/admin/DashboardStats';
import OnlineUsersList from '@/components/admin/OnlineUsersList';
import FormationsList from '@/components/admin/FormationsList';
import VideosManagement from '@/components/admin/VideosManagement';

const AdminDashboard = () => {
  const { user, profile, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('stats');

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-edu-primary mx-auto mb-4"></div>
          <div className="text-lg font-semibold mb-2">Chargement...</div>
          <p className="text-gray-600">Vérification des permissions</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!profile || profile.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600 flex items-center">
              <Shield className="mr-2" size={24} />
              Accès refusé
            </CardTitle>
            <CardDescription>
              Vous n'avez pas les permissions nécessaires pour accéder à cette page.
              Seuls les administrateurs peuvent accéder au tableau de bord.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">
              Rôle actuel: {profile?.role || 'Non défini'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ScrollArea className="h-screen">
        <div className="p-3 sm:p-4 md:p-6 pb-20 md:pb-6">
          {/* Header */}
          <div className="mb-4 sm:mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center mb-4">
              <Shield className="text-red-600 mr-0 sm:mr-3 mb-2 sm:mb-0" size={24} />
              <div className="flex-1">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">
                  Tableau de bord administrateur
                </h1>
                <p className="text-sm sm:text-base text-gray-600 mt-1">
                  Gérez votre plateforme d'apprentissage
                </p>
              </div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-xs sm:text-sm text-red-700">
                <strong>Connecté en tant que:</strong> {profile.first_name} {profile.last_name} 
                <span className="ml-2 px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                  {profile.role.toUpperCase()}
                </span>
              </p>
            </div>
          </div>

          {/* Quick Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6">
            <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
              <CardContent className="p-2 sm:p-3 md:p-4">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-blue-100 text-xs truncate">Utilisateurs</p>
                    <p className="text-lg sm:text-xl md:text-2xl font-bold">1,247</p>
                  </div>
                  <Users className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-blue-200 flex-shrink-0" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
              <CardContent className="p-2 sm:p-3 md:p-4">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-green-100 text-xs truncate">En ligne</p>
                    <p className="text-lg sm:text-xl md:text-2xl font-bold">89</p>
                  </div>
                  <Activity className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-green-200 flex-shrink-0" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
              <CardContent className="p-2 sm:p-3 md:p-4">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-purple-100 text-xs truncate">Messages</p>
                    <p className="text-lg sm:text-xl md:text-2xl font-bold">5,432</p>
                  </div>
                  <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-purple-200 flex-shrink-0" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
              <CardContent className="p-2 sm:p-3 md:p-4">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-orange-100 text-xs truncate">Exercices</p>
                    <p className="text-lg sm:text-xl md:text-2xl font-bold">1,234</p>
                  </div>
                  <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-orange-200 flex-shrink-0" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-teal-500 to-teal-600 text-white">
              <CardContent className="p-2 sm:p-3 md:p-4">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-teal-100 text-xs truncate">Temps moy.</p>
                    <p className="text-lg sm:text-xl md:text-2xl font-bold">2h15</p>
                  </div>
                  <Clock className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-teal-200 flex-shrink-0" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white">
              <CardContent className="p-2 sm:p-3 md:p-4">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-yellow-100 text-xs truncate">Top Prof</p>
                    <p className="text-lg sm:text-xl md:text-2xl font-bold">Marie</p>
                  </div>
                  <Crown className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-yellow-200 flex-shrink-0" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <ScrollArea className="w-full">
              <TabsList className="grid w-full grid-cols-6 mb-4 sm:mb-6 h-auto min-w-max">
                <TabsTrigger value="stats" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 p-2 sm:p-3 min-w-0">
                  <BarChart3 size={14} className="flex-shrink-0" />
                  <span className="text-xs sm:text-sm truncate">Stats</span>
                </TabsTrigger>
                <TabsTrigger value="online-users" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 p-2 sm:p-3 min-w-0">
                  <UserCheck size={14} className="flex-shrink-0" />
                  <span className="text-xs sm:text-sm truncate">En ligne</span>
                </TabsTrigger>
                <TabsTrigger value="create-formation" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 p-2 sm:p-3 min-w-0">
                  <BookOpen size={14} className="flex-shrink-0" />
                  <span className="text-xs sm:text-sm truncate">Créer</span>
                </TabsTrigger>
                <TabsTrigger value="products" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 p-2 sm:p-3 min-w-0">
                  <Package size={14} className="flex-shrink-0" />
                  <span className="text-xs sm:text-sm truncate">Produits</span>
                </TabsTrigger>
                <TabsTrigger value="videos" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 p-2 sm:p-3 min-w-0">
                  <Video size={14} className="flex-shrink-0" />
                  <span className="text-xs sm:text-sm truncate">Vidéos</span>
                </TabsTrigger>
                <TabsTrigger value="users" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 p-2 sm:p-3 min-w-0">
                  <Users size={14} className="flex-shrink-0" />
                  <span className="text-xs sm:text-sm truncate">Utilisateurs</span>
                </TabsTrigger>
              </TabsList>
            </ScrollArea>

            <div className="space-y-4">
              <TabsContent value="stats" className="mt-4">
                <DashboardStats />
              </TabsContent>

              <TabsContent value="online-users" className="mt-4">
                <OnlineUsersList />
              </TabsContent>

              <TabsContent value="create-formation" className="mt-4">
                <FormationsManagement />
              </TabsContent>

              <TabsContent value="products" className="mt-4">
                <ProductsManagement />
              </TabsContent>

              <TabsContent value="videos" className="mt-4">
                <VideosManagement />
              </TabsContent>

              <TabsContent value="users" className="mt-4">
                <UsersManagement />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </ScrollArea>
    </div>
  );
};

export default AdminDashboard;
