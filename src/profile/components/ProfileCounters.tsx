import React, { useState } from 'react';
import FriendsModal from '@/friends/components/FriendsModal';
import { useTranslation } from 'react-i18next';

interface ProfileCountersProps {
  followingCount: number;
  friendsCount: number;
  formationsCount: number;
  userId?: string;
}

const ProfileCounters: React.FC<ProfileCountersProps> = ({
  followingCount,
  friendsCount,
  formationsCount,
  userId
}) => {
  const { t } = useTranslation();
  const [modalOpen, setModalOpen] = useState(false);
  const [defaultTab, setDefaultTab] = useState<'following' | 'friends' | 'suggestions'>('friends');

  const openModal = (tab: 'following' | 'friends' | 'suggestions') => {
    setDefaultTab(tab);
    setModalOpen(true);
  };

  const counters = [
    { label: t('profile.following'), value: followingCount, tab: 'following' as const },
    { label: t('profile.friends'), value: friendsCount, tab: 'friends' as const },
    { label: t('profile.formations'), value: formationsCount, tab: null },
  ];

  return (
    <>
      <div className="flex items-center justify-center gap-6 py-4">
        {counters.map((counter, index) => (
          <button 
            key={index}
            onClick={() => counter.tab && openModal(counter.tab)}
            className="flex flex-col items-center gap-1 min-w-[60px] hover:opacity-80 transition-opacity"
            disabled={!counter.tab}
          >
            <span className="text-xl font-bold">{counter.value}</span>
            <span className="text-xs text-muted-foreground">{counter.label}</span>
          </button>
        ))}
      </div>

      <FriendsModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        defaultTab={defaultTab}
        userId={userId}
      />
    </>
  );
};

export default ProfileCounters;
