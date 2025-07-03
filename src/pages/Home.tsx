import React, { useState } from 'react';
import TikTokTabs from '@/components/TikTokTabs';
import TikTokVideosView from '@/components/TikTokVideosView';
import PostsSection from '@/components/PostsSection';
import SearchView from '@/components/SearchView';

const Home = () => {
  const [activeTab, setActiveTab] = useState<'videos' | 'posts' | 'search'>('videos');

  const renderContent = () => {
    switch (activeTab) {
      case 'videos':
        return <TikTokVideosView />;
      case 'posts':
        return <PostsSection />;
      case 'search':
        return <SearchView />;
      default:
        return <TikTokVideosView />;
    }
  };

  return (
    <div className="relative h-screen w-full bg-black overflow-hidden">
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