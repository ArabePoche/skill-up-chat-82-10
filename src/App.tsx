import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';

import Formation from '@/pages/Formation';
import Profile from '@/pages/Profile';
import Lesson from '@/pages/Lesson';
import Auth from '@/pages/Auth';
import Admin from '@/pages/Admin';
import CompleteProfile from '@/pages/CompleteProfile';
import Layout from '@/components/Layout';
import { AuthProvider } from '@/hooks/useAuth';
import { NavigationProvider } from '@/contexts/NavigationContext';
import FormationPricingPage from '@/pages/FormationPricing';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <NavigationProvider>
          <Toaster />
          <BrowserRouter>
            <div className="App">
              <Routes>
                {/* Routes spéciales qui gardent le système de routage classique */}
                <Route path="/formation/:formationId" element={<Formation />} />
                <Route path="/profile/:profileId" element={<Profile />} />
                <Route path="/lesson/:lessonId" element={<Lesson />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/complete-profile" element={<CompleteProfile />} />
                <Route path="/formation/:formationId/pricing" element={<FormationPricingPage />} />
                
                {/* Route principale avec le nouveau système de navigation */}
                <Route path="/*" element={<Layout />} />
              </Routes>
            </div>
          </BrowserRouter>
        </NavigationProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;