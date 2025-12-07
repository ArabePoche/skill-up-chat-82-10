import React from 'react';
import { Video, FileText, Heart, Bookmark, Store, School } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useI18nReady } from '@/hooks/useI18nReady';

type TabType = 'videos' | 'posts' | 'school' | 'likes' | 'favorites' | 'shop';

interface ProfileTabsProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  showShopTab?: boolean;
}

const ProfileTabs: React.FC<ProfileTabsProps> = ({ activeTab, onTabChange, showShopTab = false }) => {
  const { t } = useTranslation();
  const i18nReady = useI18nReady();
  
  if (!i18nReady) {
    return null;
  }
  
  const baseTabs = [
    { id: 'videos' as const, label: t('profile.videos'), icon: Video },
    { id: 'posts' as const, label: t('profile.posts'), icon: FileText },
    { id: 'school' as const, label: t('school.title', { defaultValue: 'École' }), icon: School },
    { id: 'likes' as const, label: t('profile.likes'), icon: Heart },
    { id: 'favorites' as const, label: t('profile.favorites'), icon: Bookmark },
  ];
  
  const tabs = showShopTab 
    ? [...baseTabs, { id: 'shop' as const, label: 'Boutique', icon: Store }]
    : baseTabs;

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
