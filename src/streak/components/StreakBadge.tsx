/**
 * Composant pour afficher le badge de streak et niveau
 */
import React from 'react';
import { Flame, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useUserStreak } from '../hooks/useUserStreak';
import { useStreakTracker } from '../hooks/useStreakTracker';

interface StreakBadgeProps {
  userId: string;
  variant?: 'full' | 'compact' | 'mini';
  className?: string;
}

export const StreakBadge: React.FC<StreakBadgeProps> = ({ 
  userId, 
  variant = 'full',
  className = '' 
}) => {
  const { streak, currentLevelDetails, nextLevelDetails, isLoading } = useUserStreak(userId);
  const { todayUsage, requiredMinutes, isStreakValidated } = useStreakTracker(userId);

  if (isLoading || !streak) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded w-20"></div>
            <div className="h-6 bg-muted rounded w-32"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calcul de la progression vers le prochain niveau
  const progressToNextLevel = nextLevelDetails
    ? ((streak.current_streak / nextLevelDetails.streaks_required) * 100)
    : 100;

  const streaksUntilNextLevel = nextLevelDetails
    ? Math.max(0, nextLevelDetails.streaks_required - streak.current_streak)
    : 0;

  // Mini variant - juste le badge
  if (variant === 'mini') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {currentLevelDetails && (
          <div
            className="flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold"
            style={{ 
              backgroundColor: `${currentLevelDetails.level_color}20`,
              color: currentLevelDetails.level_color 
            }}
          >
            <span className="text-lg">{currentLevelDetails.level_badge}</span>
            <span>{currentLevelDetails.level_name}</span>
          </div>
        )}
        <div className="flex items-center gap-1 text-orange-500">
          <Flame size={16} />
          <span className="font-bold">{streak.current_streak}</span>
        </div>
      </div>
    );
  }

  // Compact variant
  if (variant === 'compact') {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {currentLevelDetails && (
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
                  style={{ 
                    backgroundColor: `${currentLevelDetails.level_color}20`,
                  }}
                >
                  {currentLevelDetails.level_badge}
                </div>
              )}
              <div>
                <div className="text-sm text-muted-foreground">Palier atteint</div>
                <div className="font-bold">
                  {currentLevelDetails?.level_name}
                </div>
              </div>
            </div>
            <div className="text-center">
              <div className="flex items-center gap-1 text-orange-500">
                <Flame size={20} />
                <span className="text-2xl font-bold">{streak.current_streak}</span>
              </div>
              <div className="text-xs text-muted-foreground">jours</div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Full variant - toutes les informations
  return (
    <Card className={className}>
      <CardContent className="p-6 space-y-4">
        {/* Header avec niveau et streak */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {currentLevelDetails && (
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-3xl"
                style={{ 
                  backgroundColor: `${currentLevelDetails.level_color}20`,
                }}
              >
                {currentLevelDetails.level_badge}
              </div>
            )}
            <div>
              <div className="text-sm text-muted-foreground">Palier atteint</div>
              <div className="text-xl font-bold">
                {currentLevelDetails?.level_name}
              </div>
            </div>
          </div>
          
          <div className="text-right">
            <div className="flex items-center justify-end gap-2 text-orange-500">
              <Flame size={24} />
              <span className="text-3xl font-bold">{streak.current_streak}</span>
            </div>
            <div className="text-sm text-muted-foreground">
              jours consécutifs
            </div>
          </div>
        </div>

        {/* Progression vers le prochain palier */}
        {nextLevelDetails && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Prochain palier</span>
              <span className="font-semibold">
                {nextLevelDetails.level_badge} {nextLevelDetails.level_name}
              </span>
            </div>
            <Progress value={progressToNextLevel} className="h-2" />
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <TrendingUp size={12} />
              <span>
                Plus que {streaksUntilNextLevel} streak{streaksUntilNextLevel > 1 ? 's' : ''} pour débloquer
              </span>
            </div>
          </div>
        )}

        {/* Activité du jour */}
        <div className="pt-4 border-t space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Activité aujourd'hui</span>
            <span className={`font-semibold ${isStreakValidated ? 'text-green-500' : 'text-orange-500'}`}>
              {todayUsage}/{requiredMinutes} min
            </span>
          </div>
          <Progress 
            value={(todayUsage / requiredMinutes) * 100} 
            className="h-2"
          />
          {isStreakValidated ? (
            <div className="text-xs text-green-500 font-medium">
              ✓ Objectif validé pour aujourd'hui !
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">
              {requiredMinutes - todayUsage} min restantes pour valider aujourd'hui
            </div>
          )}
        </div>

        {/* Statistiques */}
        <div className="pt-4 border-t grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-500">
              {streak.longest_streak}
            </div>
            <div className="text-xs text-muted-foreground">Meilleur streak</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-500">
              {streak.total_days_active}
            </div>
            <div className="text-xs text-muted-foreground">Jours actifs</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
