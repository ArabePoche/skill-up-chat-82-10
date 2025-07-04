
import React from 'react';
import Navbar from '@/components/Navbar';
import MainContent from '@/components/MainContent';

const Layout: React.FC = () => {
  return (
    <div className="h-screen w-full flex flex-col overflow-hidden">
      {/* Contenu principal - prend tout l'espace disponible */}
      <div className="flex-1 overflow-hidden">
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
