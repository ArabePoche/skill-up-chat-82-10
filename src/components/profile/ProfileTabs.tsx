import React from 'react';
import { Video, FileText, CheckCircle, Heart, Bookmark } from 'lucide-react';

type TabType = 'videos' | 'posts' | 'exercises' | 'likes' | 'favorites';

interface ProfileTabsProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

const ProfileTabs: React.FC<ProfileTabsProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'videos' as const, label: 'Vidéos', icon: Video },
    { id: 'posts' as const, label: 'Posts', icon: FileText },
    { id: 'exercises' as const, label: 'Exercices', icon: CheckCircle },
    { id: 'likes' as const, label: "J'aime", icon: Heart },
    { id: 'favorites' as const, label: 'Favoris', icon: Bookmark },
  ];

  return (
    <div className="sticky top-0 z-20 bg-background border-b border-border">
      <div className="flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`
                flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors relative
                ${isActive 
                  ? 'text-foreground' 
                  : 'text-muted-foreground hover:text-foreground'
                }
              `}
            >
              <Icon size={20} />
              <span className="hidden sm:inline">{tab.label}</span>
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ProfileTabs;
