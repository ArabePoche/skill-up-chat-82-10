
import React, { useState } from 'react';
import { Settings, BookOpen, Award, Bell, HelpCircle, LogOut, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useUserEnrollments } from '@/hooks/useFormations';
import { useUserStats } from '@/hooks/useProfileData';
import { useNavigate } from 'react-router-dom';
import ProfileHeader from '@/components/profile/ProfileHeader';
import ProfileStats from '@/components/profile/ProfileStats';
import ProfileProgress from '@/components/profile/ProfileProgress';
import ProfileMenu from '@/components/profile/ProfileMenu';
import TeacherWallet from '@/components/profile/TeacherWallet';
import NotificationPermissionDialog from '@/components/notifications/NotificationPermissionDialog';
import { usePushNotifications } from '@/hooks/usePushNotifications';

const Profil = () => {
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();
  const [showNotificationDialog, setShowNotificationDialog] = useState(false);
  const { hasPermission, isSupported } = usePushNotifications();
  const { data: enrollments } = useUserEnrollments(user?.id);
  const { data: userStats } = useUserStats(user?.id);

  const stats = [
    { label: 'Formations complétées', value: userStats?.completedFormations || 0 },
    { label: 'Heures d\'apprentissage', value: userStats?.learningHours || 0 },
    { label: 'Exercices validés', value: userStats?.validatedExercises || 0 },
    { label: 'Badges obtenus', value: userStats?.badges || 0 }
  ];

  const menuItems = [
    { icon: Settings, label: 'Paramètres', action: () => navigate('/complete-profile') },
    { icon: BookOpen, label: 'Mes formations', action: () => navigate('/cours') },
    { icon: Award, label: 'Badges et récompenses', action: () => {} },
    { icon: Bell, label: 'Notifications', action: () => setShowNotificationDialog(true) },
    { icon: HelpCircle, label: 'Aide et support', action: () => {} }
  ];

  // Ajouter le menu admin si l'utilisateur est admin
  if (profile?.role === 'admin') {
    menuItems.push({
      icon: Shield,
      label: 'Administration',
      action: () => navigate('/admin')
    });
  }

  const handleLogout = async () => {
    await logout();
    navigate('/auth');
  };

  const getInitials = () => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name.charAt(0)}${profile.last_name.charAt(0)}`.toUpperCase();
    }
    if (profile?.username) {
      return profile.username.charAt(0).toUpperCase();
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  const getDisplayName = () => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name} ${profile.last_name}`;
    }
    if (profile?.username) {
      return profile.username;
    }
    return user?.email || 'Utilisateur';
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-16 md:pt-16 md:pb-0">
      <ProfileHeader 
        profile={profile}
        user={user}
        getInitials={getInitials}
        getDisplayName={getDisplayName}
      />

      <div className="p-4">
        <ProfileStats stats={stats} />
        <ProfileProgress enrollments={enrollments} />
        
        {/* Section Notifications Push */}
        {isSupported && (
          <div className="bg-white rounded-lg shadow-sm p-4 mb-4 border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Bell className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Notifications Push 🔔</h3>
                  <p className="text-sm text-gray-600">
                    {hasPermission ? '✅ Activées - Recevez des rappels motivants !' : '⏰ Activez les rappels d\'étude style Duolingo'}
                  </p>
                </div>
              </div>
              <Button
                variant={hasPermission ? "outline" : "default"}
                size="sm"
                onClick={() => setShowNotificationDialog(true)}
                className="flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                {hasPermission ? 'Gérer' : 'Activer'}
              </Button>
            </div>
          </div>
        )}
        
        {/* Afficher le wallet si l'utilisateur est enseignant */}
        {profile?.is_teacher && user?.id && (
          <div className="mt-6">
            <TeacherWallet teacherId={user.id} />
          </div>
        )}
        
        <ProfileMenu menuItems={menuItems} />

        {/* Logout */}
        <div className="mt-6">
          <Button
            onClick={handleLogout}
            variant="outline"
            className="w-full border-red-200 text-red-600 hover:bg-red-50"
          >
            <LogOut size={16} className="mr-2" />
            Se déconnecter
          </Button>
        </div>
      </div>
      
      <NotificationPermissionDialog
        open={showNotificationDialog}
        onOpenChange={setShowNotificationDialog}
      />
    </div>
  );
};

export default Profil;