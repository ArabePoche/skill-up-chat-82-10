import React, { useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import TikTokTabs from '@/components/TikTokTabs';
import TikTokVideosView from '@/components/TikTokVideosView';
import PostsSection from '@/components/PostsSection';
import SearchView from '@/components/SearchView';

const Home = () => {
  const { id } = useParams<{ id?: string }>();
  const location = useLocation();
  const isVideoRoute = location.pathname.startsWith('/video/');
  const isPostRoute = location.pathname.startsWith('/post/');
  const [activeTab, setActiveTab] = useState<'videos' | 'posts' | 'search'>(isPostRoute ? 'posts' : 'videos');

  const renderContent = () => {
    switch (activeTab) {
      case 'videos':
        return (
          <div className="h-full overflow-y-auto snap-y snap-mandatory">
            <TikTokVideosView targetVideoId={isVideoRoute ? id : undefined} />
          </div>
        );
      case 'posts':
        return (
          <div className="h-full overflow-y-auto">
            <PostsSection targetPostId={isPostRoute ? id : undefined} />
          </div>
        );
      case 'search':
        return <SearchView />;
      default:
        return (
          <div className="h-full overflow-y-auto snap-y snap-mandatory">
            <TikTokVideosView targetVideoId={isVideoRoute ? id : undefined} />
          </div>
        );
    }
  };

  return (
    <div className="relative h-screen w-full bg-black">
      {/* Onglets flottants en haut */}
      <TikTokTabs activeTab={activeTab} onTabChange={setActiveTab} />
      
      {/* Contenu principal */}
      <div className="h-full w-full">
        {renderContent()}
      </div>
    </div>
  );
};

export default Home;