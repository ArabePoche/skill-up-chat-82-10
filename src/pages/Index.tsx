
import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import StatusBar from '@/components/StatusBar';
import TikTokTabs from '@/components/TikTokTabs';
import StoriesSection from '@/components/StoriesSection';
import TikTokVideosView from '@/components/TikTokVideosView';
import PostsSection from '@/components/PostsSection';
import CreatePostModal from '@/components/CreatePostModal';
import CreateStoryModal from '@/components/CreateStoryModal';
import { useAuth } from '@/hooks/useAuth';

const Index = () => {
  const [activeTab, setActiveTab] = useState('following');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showStoryModal, setShowStoryModal] = useState(false);
  const { user } = useAuth();

  const handleCreatePost = () => {
    setShowCreateModal(true);
  };

  const handleCreateStory = () => {
    setShowStoryModal(true);
  };

  return (
    <div className="min-h-screen bg-black text-white relative">
      <StatusBar />
      
      {/* Header with create button */}
      <div className="flex justify-between items-center p-4 pb-2">
        <TikTokTabs activeTab={activeTab} onTabChange={setActiveTab} />
        {user && (
          <div className="relative">
            <button
              onClick={handleCreatePost}
              className="w-8 h-8 bg-white rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors relative z-10"
              aria-label="Créer un post"
            >
              <Plus size={20} className="text-black" />
            </button>
          </div>
        )}
      </div>

      {/* Stories Section */}
      <StoriesSection onCreateStory={handleCreateStory} />

      {/* Main Content */}
      <div className="flex-1">
        {activeTab === 'following' ? (
          <PostsSection />
        ) : (
          <TikTokVideosView />
        )}
      </div>

      {/* Modals */}
      <CreatePostModal 
        isOpen={showCreateModal} 
        onClose={() => setShowCreateModal(false)} 
      />
      <CreateStoryModal 
        isOpen={showStoryModal} 
        onClose={() => setShowStoryModal(false)} 
      />
    </div>
  );
};

export default Index;
