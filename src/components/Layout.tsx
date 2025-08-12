import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import MainContent from '@/components/MainContent';
import { useNavigation } from '@/contexts/NavigationContext';

const Layout: React.FC = () => {
  const location = useLocation();
  const { setCurrentView } = useNavigation();

  // Synchroniser la vue actuelle avec la route
  useEffect(() => {
    const path = location.pathname;

    // Toutes ces routes affichent la Home (vidéos/posts/search)
    if (
      path === '/' ||
      path === '/home' ||
      path.startsWith('/video') ||
      path.startsWith('/post') ||
      path.startsWith('/search')
    ) {
      setCurrentView('home');
    } else if (path === '/shop') {
      setCurrentView('shop');
    } else if (path === '/cours') {
      setCurrentView('cours');
    } else if (path === '/messages') {
      setCurrentView('messages');
    } else if (path === '/profil') {
      setCurrentView('profil');
    }
  }, [location.pathname, setCurrentView]);

  return (
    <div className="h-screen w-full flex flex-col overflow-y-auto">
      {/* Contenu principal - prend tout l'espace disponible */}
      <div className="flex-1">
        <MainContent />
      </div>
      
      {/* Navbar fixe en bas - indépendante et toujours visible */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t shadow-lg">
        <Navbar />
      </div>
    </div>
  );
};

export default Layout;