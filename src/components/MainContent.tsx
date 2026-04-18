import React from 'react';
import { useNavigation } from '@/contexts/NavigationContext';
import Home from '@/pages/Home';
import Shop from '@/pages/Shop';
import Cours from '@/pages/Cours';
import Messages from '@/pages/Messages';
import Profil from '@/pages/Profil';
import Admin from '@/pages/Admin';

const MainContent: React.FC = () => {
  const { currentView } = useNavigation();

  const renderContent = () => {
    switch (currentView) {
      case 'home':
        return <Home />;
      case 'shop':
        return <Shop />;
      case 'cours':
        return <Cours />;
      case 'messages':
        return <Messages />;
      case 'profil':
        return <Profil />;
      default:
        return <Home />;
    }
  };

  return (
    <div className="h-full min-h-0 w-full overflow-y-auto lg:overflow-hidden flex flex-col">
      {renderContent()}
    </div>
  );
};

export default MainContent;