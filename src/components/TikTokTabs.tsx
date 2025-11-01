import React from 'react';
import { Search, Video, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface TikTokTabsProps {
  activeTab: 'videos' | 'posts' | 'search';
  onTabChange: (tab: 'videos' | 'posts' | 'search') => void;
}

const TikTokTabs: React.FC<TikTokTabsProps> = ({ activeTab, onTabChange }) => {
  const { t } = useTranslation();
  const tabs = [
    { id: 'videos' as const, label: t('common.videos'), icon: Video },
    { id: 'posts' as const, label: t('common.posts'), icon: FileText },
    { id: 'search' as const, label: t('common.search'), icon: Search },
  ];

  const isPostsActive = activeTab === 'posts';
  
  return (
    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-30">
      <div className={`flex items-center rounded-full p-1 transition-all duration-200 ${
        isPostsActive 
          ? 'bg-background/80 backdrop-blur-md border border-border' 
          : 'bg-transparent backdrop-blur-md'
      }`}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`
                flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200
                ${isPostsActive
                  ? isActive
                    ? 'bg-primary text-primary-foreground shadow-lg'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  : isActive
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