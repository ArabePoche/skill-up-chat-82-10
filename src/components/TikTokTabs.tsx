
import React from 'react';
import { Search, Video, FileText } from 'lucide-react';

interface TikTokTabsProps {
  activeTab: 'videos' | 'posts' | 'search';
  onTabChange: (tab: 'videos' | 'posts' | 'search') => void;
}

const TikTokTabs: React.FC<TikTokTabsProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'videos' as const, label: 'Vidéos', icon: Video },
    { id: 'posts' as const, label: 'Posts', icon: FileText },
    { id: 'search' as const, label: 'Recherche', icon: Search },
  ];

  return (
    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-30">
      <div className="flex items-center bg-transparent backdrop-blur-md rounded-full p-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`
                flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200
                ${activeTab === tab.id 
                  ? 'bg-white/30 text-white shadow-lg backdrop-blur-sm' 
                  : 'text-white/70 hover:text-white hover:bg-white/10'
                }
              `}
            >
              <Icon size={16} />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default TikTokTabs;