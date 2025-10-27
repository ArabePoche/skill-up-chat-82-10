import React, { useEffect, useMemo, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import TikTokTabs from '@/components/TikTokTabs';
import TikTokVideosView from '@/components/TikTokVideosView';
import PostsSection from '@/components/PostsSection';
import SearchView from '@/components/SearchView';
import { useTabScroll } from '@/contexts/TabScrollContext';

const Home = () => {
  const { id } = useParams<{ id?: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { getScroll, setScroll } = useTabScroll();

  const pathname = location.pathname;
  const activeTab = useMemo<'videos' | 'posts' | 'search'>(() => {
    if (pathname.startsWith('/post')) return 'posts';
    if (pathname.startsWith('/search')) return 'search';
    return 'videos';
  }, [pathname]);

  const isVideoRoute = pathname.startsWith('/video/') || pathname.startsWith('/videos/');
  const isPostRoute = pathname.startsWith('/post/');

  const videosRef = useRef<HTMLDivElement>(null);
  const postsRef = useRef<HTMLDivElement>(null);

  const handleTabChange = (tab: 'videos' | 'posts' | 'search') => {
    if (tab === 'videos') navigate('/video');
    else if (tab === 'posts') navigate('/post');
    else navigate('/search');
  };

  useEffect(() => {
    // Restaurer le scroll du bon onglet quand on arrive dessus
    const container = activeTab === 'videos' ? videosRef.current : activeTab === 'posts' ? postsRef.current : null;
    if (container) {
      const y = getScroll(activeTab) ?? 0;
      container.scrollTop = y;
    }

    // Sauvegarder le scroll de l'onglet courant lors du changement d'onglet ou du démontage
    return () => {
      const current = activeTab === 'videos' ? videosRef.current : activeTab === 'posts' ? postsRef.current : null;
      if (current) setScroll(activeTab, current.scrollTop);
    };
  }, [activeTab, getScroll, setScroll]);

  const renderContent = () => {
    switch (activeTab) {
      case 'videos':
        return (
          <div ref={videosRef} className="h-full overflow-y-auto snap-y snap-mandatory">
            <TikTokVideosView targetVideoId={isVideoRoute ? id : undefined} />
          </div>
        );
      case 'posts':
        return (
          <div ref={postsRef} className="h-full overflow-y-auto">
            <PostsSection targetPostId={isPostRoute ? id : undefined} />
          </div>
        );
      case 'search':
        return <SearchView />;
      default:
        return (
          <div ref={videosRef} className="h-full overflow-y-auto snap-y snap-mandatory">
            <TikTokVideosView targetVideoId={isVideoRoute ? id : undefined} />
          </div>
        );
    }
  };

  return (
    <div className="relative h-screen w-full bg-black">
      {/* Onglets flottants en haut */}
      <TikTokTabs activeTab={activeTab} onTabChange={handleTabChange} />
      
      {/* Contenu principal */}
      <div className="h-full w-full">
        {renderContent()}
      </div>
    </div>
  );
};

export default Home;