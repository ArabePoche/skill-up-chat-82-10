import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createIDBPersister } from '@/offline/utils/idbPersister';
import { Toaster } from 'sonner';
import PermissionManager from '@/components/PermissionManager';
import useBackButtonHandler from '@/hooks/useBackButtonHandler';
import { useDeepLinks } from '@/hooks/useDeeplinks';
import { registerServiceWorker } from '@/offline/utils/registerSW';
import { syncManager } from '@/offline/utils/syncManager';
import LanguageOnboarding from '@/components/LanguageOnboarding';


import Formation from '@/pages/Formation';
import FormationDetail from '@/pages/FormationDetail';
import Profil from '@/pages/Profil';
import Lesson from '@/pages/Lesson';
import Auth from '@/pages/Auth';
import ResetPassword from '@/pages/ResetPassword';
import Admin from '@/pages/Admin';
import CompleteProfile from '@/pages/CompleteProfile';
import NotFound from '@/pages/NotFound';
import Layout from '@/components/Layout';
import { AuthProvider } from '@/hooks/useAuth';
import { NavigationProvider } from '@/contexts/NavigationContext';
import FormationPricingPage from '@/pages/FormationPricing';
import { TabScrollProvider } from '@/contexts/TabScrollContext';
import { PresenceProvider } from '@/contexts/PresenceContext';
// Nouvelles pages cours
import CoursIndex from '@/pages/cours/CoursIndex';
import FormationDetailPage from '@/pages/cours/FormationDetail';
import TeacherInterface from '@/pages/cours/TeacherInterface';
import LessonChat from '@/pages/cours/LessonChat';
import GroupLessonChat from '@/pages/cours/GroupLessonChat';
import Conversations from '@/pages/Conversations';
import UploadVideo from '@/pages/UploadVideo';
import PublicCv from '@/pages/PublicCv';
import School from '@/pages/School';
import { StreakTrackerWrapper } from '@/streak/components/StreakTrackerWrapper';
import { ActivityTrackerWrapper } from '@/components/ActivityTrackerWrapper';
import { VisitorTrackerWrapper } from '@/components/VisitorTrackerWrapper';
import { OfflineIndicator, OfflineGate, ConversationSyncProvider } from '@/offline';
import { OfflineAuthBanner } from '@/offline/components/OfflineAuthBanner';
import { PushNotificationPrompt } from '@/components/notifications/PushNotificationPrompt';


// Cache-first : affichage instantané depuis IndexedDB, revalidation en arrière-plan
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      // Données considérées fraîches pendant 5 min (formations, profils…)
      staleTime: 1000 * 60 * 5,
      // Garder le cache en mémoire 24h pour persistance
      gcTime: 1000 * 60 * 60 * 24,
      // Revalider au montage seulement si stale (respecte staleTime)
      refetchOnMount: true,
      // Revalider quand le réseau revient
      refetchOnReconnect: true,
    },
  },
});

// Persister IndexedDB pour restauration instantanée au démarrage
const idbPersister = createIDBPersister();

const persistOptions = {
  persister: idbPersister,
  // Conserver le cache persisté 7 jours
  maxAge: 1000 * 60 * 60 * 24 * 7,
  // Invalider le cache persisté si la structure de l'app change (incrémenter à chaque breaking change)
  buster: 'v1',
};

const AppWithRouter: React.FC = () => {
  useBackButtonHandler();
  useDeepLinks();

  // Sync offline data au lancement de l'app
  useEffect(() => {
    syncManager.startupSync();
  }, []);
  
  return (
    <div className="App">
      <PermissionManager />
      <StreakTrackerWrapper />
      <ActivityTrackerWrapper />
      <VisitorTrackerWrapper />
      <OfflineIndicator />
      <OfflineAuthBanner />
      <PushNotificationPrompt />
      <Routes>
        {/* Routes spéciales qui gardent le système de routage classique */}
        <Route path="/formation/:formationId" element={<FormationDetail />} />
        <Route path="/profil/:profileId" element={<Profil />} />
        <Route path="/profile/:profileId" element={<Profil />} />
        <Route path="/lesson/:lessonId" element={<Lesson />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/complete-profile" element={<CompleteProfile />} />
        <Route path="/formation/:formationId/pricing" element={<FormationPricingPage />} />
        <Route path="/cv/:cvId" element={<PublicCv />} />
        
        {/* Nouvelles routes cours explicites */}
        <Route path="/cours" element={<CoursIndex />} />
        <Route path="/cours/formation/:formationId" element={<FormationDetailPage />} />
        <Route path="/cours/teacher/:formationId" element={<TeacherInterface />} />
        <Route path="/cours/lesson/:lessonId" element={<LessonChat />} />
        <Route path="/cours/group-lesson/:levelId" element={<GroupLessonChat />} />
        
        {/* Routes pour conversations */}
        <Route path="/conversations/:otherUserId" element={<Conversations />} />
        
        {/* Route pour upload vidéo */}
        <Route path="/upload-video" element={<UploadVideo />} />
        
        {/* Route pour le système de gestion d'école */}
        <Route path="/school" element={<School />} />
        
        {/* Partage vidéo et post dédiés + onglets */}
        <Route path="/video/:id" element={<Layout />} />
        <Route path="/videos/:id" element={<Layout />} />
        <Route path="/post/:id" element={<Layout />} />
        <Route path="/video" element={<Layout />} />
        <Route path="/post" element={<Layout />} />
        <Route path="/search" element={<Layout />} />
        
        {/* Route principale */}
        <Route path="/" element={<Navigate to="/video" replace />} />
        <Route path="/home" element={<Layout />} />
        <Route path="/shop" element={<Layout />} />
        <Route path="/messages" element={<Layout />} />
        <Route path="/profil" element={<Layout />} />
        
        {/* Page 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
};

const App: React.FC = () => {
  const [showLanguageOnboarding, setShowLanguageOnboarding] = useState(
    !localStorage.getItem('languageSelected')
  );

  useEffect(() => {
    // Enregistrer le Service Worker au démarrage
    registerServiceWorker();
  }, []);


  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
      <OfflineGate>
        <BrowserRouter>
          <AuthProvider>
            <ConversationSyncProvider>
              <PresenceProvider>
                <NavigationProvider>
                  <TabScrollProvider>
                    {showLanguageOnboarding ? (
                      <LanguageOnboarding onComplete={() => setShowLanguageOnboarding(false)} />
                    ) : (
                      <>
                        <AppWithRouter />
                        <Toaster />
                      </>
                    )}
                  </TabScrollProvider>
                </NavigationProvider>
              </PresenceProvider>
            </ConversationSyncProvider>
          </AuthProvider>
        </BrowserRouter>
      </OfflineGate>
    </PersistQueryClientProvider>
  );
};

export default App;
