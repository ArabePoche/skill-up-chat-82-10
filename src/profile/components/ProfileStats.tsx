
import React from 'react';

interface ProfileStatsProps {
  stats: Array<{
    label: string;
    value: number;
  }>;
}

const ProfileStats: React.FC<ProfileStatsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-2 gap-4 mb-6">
      {stats.map((stat, index) => (
        <div key={index} className="bg-white rounded-lg p-4 shadow-sm border">
          <div className="text-2xl font-bold text-edu-primary mb-1">{stat.value}</div>
          <div className="text-sm text-gray-600">{stat.label}</div>
        </div>
      ))}
    </div>
  );
};

export default ProfileStats;
