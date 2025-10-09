import React, { useState } from 'react';
import { Menu, Edit, ArrowLeft, UserPlus, UserCheck } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUserEnrollments } from '@/hooks/useFormations';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useFollow, useFollowersCount, useFollowingCount } from '@/hooks/useFollow';
import { Button } from '@/components/ui/button';
import ProfileCounters from '@/profile/components/ProfileCounters';
import ProfileTabs from '@/profile/components/ProfileTabs';
import ProfileMenuDrawer from '@/components/profile/ProfileMenuDrawer';
import NotificationPermissionDialog from '@/components/notifications/NotificationPermissionDialog';
import AvatarUploadModal from '@/components/profile/AvatarUploadModal';
import VideosTab from '@/profile/components/tabs/VideosTab';
import PostsTab from '@/profile/components/tabs/PostsTab';
import ExercisesTab from '@/profile/components/tabs/ExercisesTab';
import LikesTab from '@/profile/components/tabs/LikesTab';
import FavoritesTab from '@/profile/components/tabs/FavoritesTab';

type TabType = 'videos' | 'posts' | 'exercises' | 'likes' | 'favorites';

const Profil = () => {
  const { user, profile: currentUserProfile } = useAuth();
  const navigate = useNavigate();
  const { profileId } = useParams();
  const [activeTab, setActiveTab] = useState<TabType>('videos');
  const [showMenuDrawer, setShowMenuDrawer] = useState(false);
  const [showNotificationDialog, setShowNotificationDialog] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  
  // Si profileId existe, c'est le profil d'un autre utilisateur, sinon c'est le profil de l'utilisateur connecté
  const viewedUserId = profileId || user?.id;
  const isOwnProfile = !profileId || profileId === user?.id;
  
  // Récupérer le profil de l'utilisateur visualisé
  const { data: viewedProfile } = useQuery({
    queryKey: ['profile', viewedUserId],
    queryFn: async () => {
      if (!viewedUserId) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', viewedUserId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!viewedUserId,
  });
  
  const profile = isOwnProfile ? currentUserProfile : viewedProfile;
  const { data: enrollments } = useUserEnrollments(viewedUserId);
  
  // Hooks pour le système de suivi
  const { isFollowing, toggleFollow, isLoading: isFollowLoading } = useFollow(viewedUserId);
  const { data: followersCount = 0 } = useFollowersCount(viewedUserId);
  const { data: followingCount = 0 } = useFollowingCount(viewedUserId);

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
        return <VideosTab userId={viewedUserId} />;
      case 'posts':
        return <PostsTab userId={viewedUserId} />;
      case 'exercises':
        return <ExercisesTab userId={viewedUserId} />;
      case 'likes':
        return <LikesTab userId={viewedUserId} />;
      case 'favorites':
        return <FavoritesTab userId={viewedUserId} />;
      default:
        return <VideosTab userId={viewedUserId} />;
    }
  };

  return (
    <div className="min-h-screen bg-background pb-16 md:pt-16 md:pb-0">
      {/* Header avec avatar et menu hamburger */}
      <div className="sticky top-0 z-30 bg-background border-b border-border">
        <div className="relative p-4">
          {!isOwnProfile && (
            <button 
              onClick={() => navigate(-1)}
              className="absolute left-4 top-4 p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <ArrowLeft size={24} />
            </button>
          )}
          {isOwnProfile && (
            <button 
              onClick={() => setShowMenuDrawer(true)}
              className="absolute right-4 top-4 p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <Menu size={24} />
            </button>
          )}
          
          <div className="flex flex-col items-center gap-2 pt-8">
            <div className="relative">
              <div 
                className="w-24 h-24 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center overflow-hidden cursor-pointer"
                onClick={() => isOwnProfile && setShowAvatarModal(true)}
              >
                {profile?.avatar_url ? (
                  <img 
                    src={profile.avatar_url} 
                    alt="Avatar" 
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <span className="text-white text-2xl font-bold">{getInitials()}</span>
                )}
              </div>
              {isOwnProfile && (
                <button 
                  onClick={() => setShowAvatarModal(true)}
                  className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground p-2 rounded-full hover:opacity-80 transition-opacity"
                >
                  <Edit size={14} />
                </button>
              )}
            </div>
            <div className="text-center">
              <h1 className="text-xl font-bold">{getDisplayName()}</h1>
              <p className="text-sm text-muted-foreground">@{profile?.username || 'utilisateur'}</p>
            </div>
          </div>
        </div>

        {/* Bouton suivre pour les autres profils */}
        {!isOwnProfile && (
          <div className="px-4 pb-4">
            <Button
              onClick={() => toggleFollow()}
              disabled={isFollowLoading}
              className={`w-full ${
                isFollowing 
                  ? 'bg-gray-500 hover:bg-gray-600' 
                  : 'bg-primary hover:bg-primary/90'
              }`}
            >
              {isFollowing ? (
                <>
                  <UserCheck size={18} className="mr-2" />
                  Abonné
                </>
              ) : (
                <>
                  <UserPlus size={18} className="mr-2" />
                  Suivre
                </>
              )}
            </Button>
          </div>
        )}

        {/* Compteurs */}
        <ProfileCounters 
          followingCount={followingCount}
          friendsCount={followersCount}
          formationsCount={enrollments?.length || 0}
        />
      </div>

      {/* Onglets */}
      <ProfileTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Contenu de l'onglet actif */}
      <div className="pb-4">
        {renderTabContent()}
      </div>

      {/* Menu Drawer - uniquement pour son propre profil */}
      {isOwnProfile && (
        <>
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
        </>
      )}
    </div>
  );
};

export default Profil;