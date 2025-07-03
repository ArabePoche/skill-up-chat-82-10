
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';

import Home from '@/pages/Home';
import Formation from '@/pages/Formation';
import Profile from '@/pages/Profile';
import Shop from '@/pages/Shop';
import Lesson from '@/pages/Lesson';
import Auth from '@/pages/Auth';
import Admin from '@/pages/Admin';
import Cours from '@/pages/Cours';
import Messages from '@/pages/Messages';
import Profil from '@/pages/Profil';
import Navbar from '@/components/Navbar';
import { AuthProvider } from '@/hooks/useAuth';
import FormationPricingPage from '@/pages/FormationPricing';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Toaster />
        <BrowserRouter>
          <div className="App">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/formation/:formationId" element={<Formation />} />
              <Route path="/profile/:profileId" element={<Profile />} />
              <Route path="/shop" element={<Shop />} />
              <Route path="/cours" element={<Cours />} />
              <Route path="/messages" element={<Messages />} />
              <Route path="/profil" element={<Profil />} />
              <Route path="/lesson/:lessonId" element={<Lesson />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/formation/:formationId/pricing" element={<FormationPricingPage />} />
            </Routes>
            <Navbar />
          </div>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
