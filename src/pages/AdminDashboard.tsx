import React, { useState } from 'react';
import { Shield } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import FormationsManagement from '@/components/admin/FormationsManagement';
import ProductsManagement from '@/components/admin/ProductsManagement';
import UsersManagement from '@/components/admin/UsersManagement';
import DashboardStats from '@/components/admin/DashboardStats';
import OnlineUsersList from '@/components/admin/OnlineUsersList';
import VideosManagement from '@/components/admin/VideosManagement';
import TeachersManagement from '@/components/admin/TeachersManagement';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { PromotionManagementAdmin } from '@/components/promotions/PromotionManagementAdmin';
import { TeacherApplicationsList } from '@/teacher-application/components/TeacherApplicationsList';
import VerificationRequestsManagement from '@/components/admin/VerificationRequestsManagement';
import StudentPaymentTracking from '@/components/admin/payments/StudentPaymentTracking';
import PushNotificationSender from '@/components/admin/PushNotificationSender';

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

  const renderContent = () => {
    switch (activeTab) {
      case 'stats':
        return <DashboardStats />;
      case 'online-users':
        return <OnlineUsersList />;
      case 'payment-tracking':
        return <StudentPaymentTracking />;
      case 'create-formation':
        return <FormationsManagement />;
      case 'teachers':
        return <TeachersManagement />;
      case 'teacher-applications':
        return <TeacherApplicationsList />;
      case 'verification-requests':
        return <VerificationRequestsManagement />;
      case 'promotions':
        return <PromotionManagementAdmin />;
      case 'products':
        return <ProductsManagement />;
      case 'videos':
        return <VideosManagement />;
      case 'users':
        return <UsersManagement />;
      case 'push-notifications':
        return <PushNotificationSender />;
      default:
        return <DashboardStats />;
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AdminSidebar activeTab={activeTab} onTabChange={setActiveTab} />
        <SidebarInset>
          <AdminHeader 
            profileName={`${profile.first_name} ${profile.last_name}`}
            profileRole={profile.role}
          />
          <div className="flex-1 p-6">
            {renderContent()}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default AdminDashboard;