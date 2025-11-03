import React, { useState } from 'react';
import { Menu, Edit, ArrowLeft, UserPlus, UserCheck, MessageCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import VerifiedBadge from '@/components/VerifiedBadge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/hooks/useAuth';
import { useUserEnrollments } from '@/hooks/useFormations';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useFollow, useFollowersCount, useFollowingCount, usePendingSentRequests } from '@/friends/hooks/useFollow';
import { Button } from '@/components/ui/button';
import ProfileCounters from '@/profile/components/ProfileCounters';
import ProfileTabs from '@/profile/components/ProfileTabs';
import ProfileMenuDrawer from '@/profile/components/ProfileMenuDrawer';
import NotificationPermissionDialog from '@/components/notifications/NotificationPermissionDialog';
import AvatarUploadModal from '@/profile/components/AvatarUploadModal';
import FriendRequestsPanel from '@/friends/components/FriendRequestsPanel';
import VideosTab from '@/profile/components/tabs/VideosTab';
import PostsTab from '@/profile/components/tabs/PostsTab';
import ExercisesTab from '@/profile/components/tabs/ExercisesTab';
import LikesTab from '@/profile/components/tabs/LikesTab';
import FavoritesTab from '@/profile/components/tabs/FavoritesTab';
import { StreakBadge } from '@/streak';

type TabType = 'videos' | 'posts' | 'exercises' | 'likes' | 'favorites';

const Profil = () => {
  const { t } = useTranslation();
  const { user, profile: currentUserProfile } = useAuth();
  const navigate = useNavigate();
  const { profileId } = useParams();
  const [activeTab, setActiveTab] = useState<TabType>('videos');
  const [showMenuDrawer, setShowMenuDrawer] = useState(false);
  const [showNotificationDialog, setShowNotificationDialog] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  
  // Rediriger vers la page de connexion si non connecté et qu'on consulte son propre profil
  React.useEffect(() => {
    if (!profileId && !user) {
      navigate('/auth');
    }
  }, [user, profileId, navigate]);
  
  // Si profileId existe, c'est le profil d'un autre utilisateur, sinon c'est le profil de l'utilisateur connecté
  const viewedUserId = profileId || user?.id;
  const isOwnProfile = !profileId || profileId === user?.id;
  
  // Récupérer le profil de l'utilisateur visualisé (SEULEMENT si ce n'est pas son propre profil)
  const { data: viewedProfile, isLoading: isLoadingViewedProfile } = useQuery({
    queryKey: ['viewed-profile', viewedUserId], // Différente de 'profile' pour éviter les conflits
    queryFn: async () => {
      if (!viewedUserId) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, username, avatar_url, is_teacher, role, is_verified, email')
        .eq('id', viewedUserId)
        .single();
      if (error) {
        console.error('Error fetching viewed profile:', error);
        throw error;
      }
      console.log('Viewed profile loaded:', data); // Debug log
      return data;
    },
    enabled: !isOwnProfile && !!viewedUserId, // Ne charge que si ce n'est PAS son propre profil
    staleTime: 5000, // Cache pendant 5 secondes
  });
  
  // Utiliser directement currentUserProfile si c'est son propre profil, sinon viewedProfile
  const profile = isOwnProfile ? currentUserProfile : viewedProfile;
  const isLoadingProfile = isOwnProfile ? !currentUserProfile : isLoadingViewedProfile;
  
  console.log('🔍 Profil Debug:', {
    isOwnProfile,
    viewedUserId,
    currentUserProfile,
    viewedProfile,
    finalProfile: profile
  });
  const { data: enrollments } = useUserEnrollments(viewedUserId);
  
  // Hooks pour le système d'amitié
  const { friendshipStatus, sendRequest, acceptRequest, cancelRequest, removeFriend, isLoading: isFollowLoading } = useFollow(viewedUserId);
  const { data: friendsCount = 0 } = useFollowersCount(viewedUserId);
  const { data: pendingSentCount = 0 } = usePendingSentRequests(viewedUserId);
  const [showRemoveFriendDialog, setShowRemoveFriendDialog] = useState(false);

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
    console.log('🔍 getDisplayName called with profile:', profile); // Debug
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name} ${profile.last_name}`;
    }
    if (profile?.username) {
      return profile.username;
    }
    if (profile?.email) {
      return profile.email;
    }
    return user?.email || t('profile.user');
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

  // Afficher un loading si le profil n'est pas encore chargé
  if (isLoadingProfile && !profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t('profile.loadingProfile')}</p>
        </div>
      </div>
    );
  }

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
              <h1 className="text-xl font-bold flex items-center justify-center gap-2">
                {getDisplayName()}
                {/* @ts-ignore - is_verified sera disponible après régénération des types */}
                {(profile as any)?.is_verified && <VerifiedBadge size={18} />}
              </h1>
              <p className="text-sm text-muted-foreground">@{profile?.username || t('profile.user')}</p>
            </div>
          </div>
        </div>

        {/* Bouton demande d'amitié pour les autres profils */}
        {!isOwnProfile && (
          <div className="px-4 pb-4">
            {friendshipStatus === 'friends' ? (
              <div className="flex gap-2">
                <Button
                  onClick={() => navigate(`/conversations/${viewedUserId}`)}
                  className="flex-1 bg-blue-500 hover:bg-blue-600"
                >
                  <MessageCircle size={18} className="mr-2" />
                  {t('profile.chat')}
                </Button>
                <Button
                  onClick={() => setShowRemoveFriendDialog(true)}
                  disabled={isFollowLoading}
                  className="flex-1 bg-green-500 hover:bg-green-600"
                >
                  <UserCheck size={18} className="mr-2" />
                  {t('profile.friends')}
                </Button>
              </div>
            ) : friendshipStatus === 'pending_sent' ? (
              <Button
                onClick={() => cancelRequest()}
                disabled={isFollowLoading}
                className="w-full bg-yellow-500 hover:bg-yellow-600"
              >
                {t('profile.requestSent')}
              </Button>
            ) : friendshipStatus === 'pending_received' ? (
              <div className="flex gap-2">
                <Button
                  onClick={() => acceptRequest()}
                  disabled={isFollowLoading}
                  className="flex-1 bg-green-500 hover:bg-green-600"
                >
                  {t('profile.accept')}
                </Button>
                <Button
                  onClick={() => cancelRequest()}
                  disabled={isFollowLoading}
                  className="flex-1 bg-red-500 hover:bg-red-600"
                >
                  {t('profile.reject')}
                </Button>
              </div>
            ) : (
              <Button
                onClick={() => sendRequest()}
                disabled={isFollowLoading}
                className="w-full bg-primary hover:bg-primary/90"
              >
                <UserPlus size={18} className="mr-2" />
                {t('profile.sendRequest')}
              </Button>
            )}
          </div>
        )}

        {/* Compteurs */}
        <ProfileCounters 
          followingCount={pendingSentCount}
          friendsCount={friendsCount}
          formationsCount={enrollments?.length || 0}
          userId={viewedUserId}
        />

        {/* Badge de streak */}
        {viewedUserId && (
          <div className="px-4 pb-4">
            <StreakBadge userId={viewedUserId} variant="compact" />
          </div>
        )}
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

      {/* Dialog de confirmation de retrait d'ami */}
      <AlertDialog open={showRemoveFriendDialog} onOpenChange={setShowRemoveFriendDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('profile.removeFriend')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('profile.removeFriendConfirm', { name: `${profile?.first_name} ${profile?.last_name}` })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                removeFriend();
                setShowRemoveFriendDialog(false);
              }}
              className="bg-red-500 hover:bg-red-600"
            >
              {t('profile.remove')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Profil;
