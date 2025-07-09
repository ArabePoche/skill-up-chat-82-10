import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { useNavigation } from '@/contexts/NavigationContext';
import Home from '@/pages/Home';
import Shop from '@/pages/Shop';
import Cours from '@/pages/Cours';
import Messages from '@/pages/Messages';
import Profil from '@/pages/Profil';
import Auth from '@/pages/Auth';
import CompleteProfile from '@/pages/CompleteProfile';
import Admin from '@/pages/Admin';
import AdminDashboard from '@/pages/AdminDashboard';
import Formation from '@/pages/Formation';
import FormationDetail from '@/pages/FormationDetail';
import FormationPricing from '@/pages/FormationPricing';
import Lesson from '@/pages/Lesson';
import Profile from '@/pages/Profile';
import Notifications from '@/pages/Notifications';
import NotFound from '@/pages/NotFound';

const MainContent: React.FC = () => {
  const { currentView } = useNavigation();

  const renderCurrentView = () => {
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
    <div className="h-full w-full overflow-hidden">
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="/complete-profile" element={<CompleteProfile />} />
        <Route path="/admin/*" element={<Admin />} />
        <Route path="/admin-dashboard/*" element={<AdminDashboard />} />
        <Route path="/formation/:id" element={<Formation />} />
        <Route path="/formation/:formationId/detail" element={<FormationDetail />} />
        <Route path="/formation/:formationId/pricing" element={<FormationPricing />} />
        <Route path="/formation/:formationId/lesson/:lessonId" element={<Lesson />} />
        <Route path="/profile/:userId" element={<Profile />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/*" element={renderCurrentView()} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
};

export default MainContent;
