
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import PermissionManager from '@/components/PermissionManager';


import Formation from '@/pages/Formation';
import FormationDetail from '@/pages/FormationDetail';
import Profile from '@/pages/Profile';
import Lesson from '@/pages/Lesson';
import Auth from '@/pages/Auth';
import Admin from '@/pages/Admin';
import CompleteProfile from '@/pages/CompleteProfile';
import NotFound from '@/pages/NotFound';
import Layout from '@/components/Layout';
import { AuthProvider } from '@/hooks/useAuth';
import { NavigationProvider } from '@/contexts/NavigationContext';
import FormationPricingPage from '@/pages/FormationPricing';

// Nouvelles pages cours
import CoursIndex from '@/pages/cours/CoursIndex';
import FormationDetailPage from '@/pages/cours/FormationDetail';
import TeacherInterface from '@/pages/cours/TeacherInterface';
import LessonChat from '@/pages/cours/LessonChat';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <NavigationProvider>
          <Toaster />
          <BrowserRouter>
            <div className="App">
              <PermissionManager /> {/* Demande les permissions à l’ouverture */}
              <Routes>
                {/* Routes spéciales qui gardent le système de routage classique */}
                <Route path="/formation/:formationId" element={<FormationDetail />} />
                <Route path="/profile/:profileId" element={<Profile />} />
                <Route path="/lesson/:lessonId" element={<Lesson />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/complete-profile" element={<CompleteProfile />} />
                <Route path="/formation/:formationId/pricing" element={<FormationPricingPage />} />
                
                {/* Nouvelles routes cours explicites */}
                <Route path="/cours" element={<CoursIndex />} />
                <Route path="/cours/formation/:formationId" element={<FormationDetailPage />} />
                <Route path="/cours/teacher/:formationId" element={<TeacherInterface />} />
                <Route path="/cours/lesson/:lessonId" element={<LessonChat />} />
                
                {/* Route principale avec le nouveau système de navigation */}
                <Route path="/" element={<Layout />} />
                <Route path="/home" element={<Layout />} />
                <Route path="/shop" element={<Layout />} />
                <Route path="/messages" element={<Layout />} />
                <Route path="/profil" element={<Layout />} />
                
                {/* Page 404 */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </div>
          </BrowserRouter>
        </NavigationProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
