import React from 'react';

interface ProfileCountersProps {
  followingCount: number;
  friendsCount: number;
  formationsCount: number;
}

const ProfileCounters: React.FC<ProfileCountersProps> = ({
  followingCount,
  friendsCount,
  formationsCount
}) => {
  const counters = [
    { label: 'Suivis', value: followingCount },
    { label: 'Amis', value: friendsCount },
    { label: 'Formations', value: formationsCount },
  ];

  return (
    <div className="flex items-center justify-center gap-6 py-4">
      {counters.map((counter, index) => (
        <button 
          key={index}
          className="flex flex-col items-center gap-1 min-w-[60px] hover:opacity-80 transition-opacity"
        >
          <span className="text-xl font-bold">{counter.value}</span>
          <span className="text-xs text-muted-foreground">{counter.label}</span>
        </button>
      ))}
    </div>
  );
};

export default ProfileCounters;
