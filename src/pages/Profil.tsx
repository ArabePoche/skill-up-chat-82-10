import React, { useState } from 'react';
import { Menu, Edit } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUserEnrollments } from '@/hooks/useFormations';
import { useNavigate } from 'react-router-dom';
import ProfileCounters from '@/components/profile/ProfileCounters';
import ProfileTabs from '@/components/profile/ProfileTabs';
import ProfileMenuDrawer from '@/components/profile/ProfileMenuDrawer';
import NotificationPermissionDialog from '@/components/notifications/NotificationPermissionDialog';
import AvatarUploadModal from '@/components/profile/AvatarUploadModal';
import VideosTab from '@/components/profile/tabs/VideosTab';
import PostsTab from '@/components/profile/tabs/PostsTab';
import ExercisesTab from '@/components/profile/tabs/ExercisesTab';
import LikesTab from '@/components/profile/tabs/LikesTab';
import FavoritesTab from '@/components/profile/tabs/FavoritesTab';

type TabType = 'videos' | 'posts' | 'exercises' | 'likes' | 'favorites';

const Profil = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('videos');
  const [showMenuDrawer, setShowMenuDrawer] = useState(false);
  const [showNotificationDialog, setShowNotificationDialog] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const { data: enrollments } = useUserEnrollments(user?.id);

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

  const renderTabContent = () => {
    switch (activeTab) {
      case 'videos':
        return <VideosTab />;
      case 'posts':
        return <PostsTab />;
      case 'exercises':
        return <ExercisesTab />;
      case 'likes':
        return <LikesTab />;
      case 'favorites':
        return <FavoritesTab />;
      default:
        return <VideosTab />;
    }
  };

  return (
    <div className="min-h-screen bg-background pb-16 md:pt-16 md:pb-0">
      {/* Header avec avatar et menu hamburger */}
      <div className="sticky top-0 z-30 bg-background border-b border-border">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div 
                className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center overflow-hidden cursor-pointer"
                onClick={() => setShowAvatarModal(true)}
              >
                {profile?.avatar_url ? (
                  <img 
                    src={profile.avatar_url} 
                    alt="Avatar" 
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <span className="text-white text-lg font-bold">{getInitials()}</span>
                )}
              </div>
              <button 
                onClick={() => setShowAvatarModal(true)}
                className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground p-1 rounded-full hover:opacity-80 transition-opacity"
              >
                <Edit size={10} />
              </button>
            </div>
            <div>
              <h1 className="text-lg font-bold">{getDisplayName()}</h1>
              <p className="text-xs text-muted-foreground">@{profile?.username || 'utilisateur'}</p>
            </div>
          </div>
          <button 
            onClick={() => setShowMenuDrawer(true)}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <Menu size={24} />
          </button>
        </div>

        {/* Compteurs */}
        <ProfileCounters 
          followingCount={0}
          friendsCount={0}
          formationsCount={enrollments?.length || 0}
        />
      </div>

      {/* Onglets */}
      <ProfileTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Contenu de l'onglet actif */}
      <div className="pb-4">
        {renderTabContent()}
      </div>

      {/* Menu Drawer */}
      <ProfileMenuDrawer 
        isOpen={showMenuDrawer}
        onClose={() => setShowMenuDrawer(false)}
        onShowNotificationDialog={() => setShowNotificationDialog(true)}
      />

      {/* Avatar Modal */}
      <AvatarUploadModal
        isOpen={showAvatarModal}
        onClose={() => setShowAvatarModal(false)}
        currentAvatarUrl={profile?.avatar_url}
      />

      {/* Notification Dialog */}
      <NotificationPermissionDialog
        open={showNotificationDialog}
        onOpenChange={setShowNotificationDialog}
      />
    </div>
  );
};

export default Profil;