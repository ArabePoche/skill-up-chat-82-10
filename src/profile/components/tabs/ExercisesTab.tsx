import React from 'react';
import { CheckCircle } from 'lucide-react';
import { useUserStats } from '@/profile/hooks/useProfileData';

interface ExercisesTabProps {
  userId?: string;
}

const ExercisesTab: React.FC<ExercisesTabProps> = ({ userId }) => {
  const { data: userStats } = useUserStats(userId);

  return (
    <div className="p-4">
      <div className="bg-card rounded-lg p-6 border border-border text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-950/20 flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={32} className="text-green-600" />
        </div>
        <h3 className="text-2xl font-bold mb-2">{userStats?.validatedExercises || 0}</h3>
        <p className="text-sm text-muted-foreground">
          Exercices validés
        </p>
      </div>
    </div>
  );
};

export default ExercisesTab;
