
import React from 'react';
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

const Profil = () => {
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();
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
    { icon: Bell, label: 'Notifications', action: () => {} },
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
    </div>
  );
};

export default Profil;
