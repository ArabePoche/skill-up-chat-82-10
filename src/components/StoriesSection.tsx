
import React, { useState } from 'react';
import { Plus, Eye } from 'lucide-react';
import { useStories, useCreateStory, type Story } from '@/hooks/useStories';
import { useAuth } from '@/hooks/useAuth';
import StoryViewer from './StoryViewer';
import CreateStoryModal from './CreateStoryModal';

interface GroupedStories {
  user: {
    id: string;
    first_name?: string;
    last_name?: string;
    username?: string;
    avatar_url?: string;
  };
  stories: Story[];
  hasViewed: boolean;
}

const StoriesSection = () => {
  const { data: stories = [], isLoading, error } = useStories();
  const { user } = useAuth();
  const [selectedStories, setSelectedStories] = useState<Story[]>([]);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Grouper les stories par utilisateur
  const groupedStories = React.useMemo(() => {
    const groups: { [key: string]: GroupedStories } = {};
    
    stories.forEach((story) => {
      if (!story.profiles) return;
      
      const userId = story.user_id;
      if (!groups[userId]) {
        groups[userId] = {
          user: story.profiles,
          stories: [],
          hasViewed: false
        };
      }
      
      groups[userId].stories.push(story);
      
      // Vérifier si l'utilisateur a vu au moins une story de cet utilisateur
      if (story.story_views?.some(view => view.viewer_id === user?.id)) {
        groups[userId].hasViewed = true;
      }
    });
    
    return Object.values(groups);
  }, [stories, user?.id]);

  // Stories de l'utilisateur connecté
  const myStories = stories.filter(story => story.user_id === user?.id);

  const formatUserName = (userProfile: any) => {
    if (!userProfile) return 'Utilisateur';
    const firstName = userProfile.first_name || '';
    const lastName = userProfile.last_name || '';
    return `${firstName} ${lastName}`.trim() || userProfile.username || 'Utilisateur';
  };

  const handleStoryClick = (userStories: Story[], startIndex = 0) => {
    setSelectedStories(userStories);
    setCurrentStoryIndex(startIndex);
  };

  const handleMyStoryClick = () => {
    if (myStories.length > 0) {
      handleStoryClick(myStories);
    } else {
      setShowCreateModal(true);
    }
  };

  const handleNext = () => {
    if (currentStoryIndex < selectedStories.length - 1) {
      setCurrentStoryIndex(currentStoryIndex + 1);
    } else {
      // Passer au groupe de stories suivant
      const currentUserId = selectedStories[0]?.user_id;
      const currentGroupIndex = groupedStories.findIndex(group => group.user.id === currentUserId);
      
      if (currentGroupIndex < groupedStories.length - 1) {
        const nextGroup = groupedStories[currentGroupIndex + 1];
        setSelectedStories(nextGroup.stories);
        setCurrentStoryIndex(0);
      } else {
        setSelectedStories([]);
        setCurrentStoryIndex(0);
      }
    }
  };

  const handlePrevious = () => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(currentStoryIndex - 1);
    } else {
      // Passer au groupe de stories précédent
      const currentUserId = selectedStories[0]?.user_id;
      const currentGroupIndex = groupedStories.findIndex(group => group.user.id === currentUserId);
      
      if (currentGroupIndex > 0) {
        const previousGroup = groupedStories[currentGroupIndex - 1];
        setSelectedStories(previousGroup.stories);
        setCurrentStoryIndex(previousGroup.stories.length - 1);
      }
    }
  };

  const handleClose = () => {
    setSelectedStories([]);
    setCurrentStoryIndex(0);
  };

  if (isLoading) {
    return (
      <div className="flex space-x-3 p-4 overflow-x-auto">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex-shrink-0">
            <div className="w-14 h-14 bg-gray-200 rounded-full animate-pulse mb-2"></div>
            <div className="w-12 h-3 bg-gray-200 rounded animate-pulse mx-auto"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    console.error('Error loading stories:', error);
    return (
      <div className="p-4 text-center text-red-500">
        Erreur lors du chargement des statuts
      </div>
    );
  }

  return (
    <>
      <div className="flex space-x-3 p-4 overflow-x-auto bg-white border-b">
        {/* Mon statut - Style WhatsApp */}
        <div className="flex-shrink-0 text-center">
          <button
            onClick={handleMyStoryClick}
            className="relative"
          >
            <div className={`w-14 h-14 rounded-full p-0.5 ${
              myStories.length > 0 
                ? 'bg-[#25d366]' 
                : 'bg-gray-300'
            }`}>
              <div className="w-full h-full rounded-full overflow-hidden bg-white p-0.5">
                {user?.user_metadata?.avatar_url ? (
                  <img 
                    src={user.user_metadata.avatar_url} 
                    alt="Mon statut"
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200 rounded-full flex items-center justify-center">
                    <span className="text-gray-600 font-semibold text-xs">
                      {user?.user_metadata?.first_name?.charAt(0) || 'M'}
                    </span>
                  </div>
                )}
              </div>
            </div>
            {myStories.length === 0 && (
              <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-[#25d366] rounded-full flex items-center justify-center border-2 border-white">
                <Plus size={10} className="text-white" />
              </div>
            )}
          </button>
          <p className="text-xs mt-1 text-center text-gray-600 max-w-[56px] truncate">
            {myStories.length > 0 ? 'Mon statut' : 'Ajouter'}
          </p>
        </div>

        {/* Stories des autres utilisateurs - Style WhatsApp */}
        {groupedStories.map((group) => (
          <div key={group.user.id} className="flex-shrink-0 text-center">
            <button
              onClick={() => handleStoryClick(group.stories)}
              className="relative"
            >
              <div className={`w-14 h-14 rounded-full p-0.5 ${
                group.hasViewed 
                  ? 'bg-gray-300' 
                  : 'bg-[#25d366]'
              }`}>
                <div className="w-full h-full rounded-full overflow-hidden bg-white p-0.5">
                  {group.user.avatar_url ? (
                    <img 
                      src={group.user.avatar_url} 
                      alt={formatUserName(group.user)}
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200 rounded-full flex items-center justify-center">
                      <span className="text-gray-600 font-semibold text-xs">
                        {formatUserName(group.user).charAt(0)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </button>
            <p className="text-xs mt-1 text-center text-gray-600 max-w-[56px] truncate">
              {formatUserName(group.user).split(' ')[0]}
            </p>
          </div>
        ))}
      </div>

      {selectedStories.length > 0 && (
        <StoryViewer
          stories={selectedStories}
          currentStoryIndex={currentStoryIndex}
          onClose={handleClose}
          onNext={handleNext}
          onPrevious={handlePrevious}
        />
      )}

      {showCreateModal && (
        <CreateStoryModal 
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)} 
        />
      )}
    </>
  );
};

export default StoriesSection;
