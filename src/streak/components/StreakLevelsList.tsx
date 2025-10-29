/**
 * Composant pour afficher la liste des niveaux disponibles
 */
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock } from 'lucide-react';
import { useStreakConfig } from '../hooks/useStreakConfig';

interface StreakLevelsListProps {
  currentLevel?: number;
  currentStreak?: number;
  className?: string;
}

export const StreakLevelsList: React.FC<StreakLevelsListProps> = ({ 
  currentLevel = 0,
  currentStreak = 0,
  className = '' 
}) => {
  const { levels, isLoading } = useStreakConfig();

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Niveaux de progression</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-muted rounded-lg"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Niveaux de progression</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {levels?.map((level) => {
            const isUnlocked = currentLevel >= level.level_number;
            const isNext = level.level_number === currentLevel + 1;
            const daysRemaining = Math.max(0, level.days_required - currentStreak);

            return (
              <div
                key={level.id}
                className={`flex items-center gap-4 p-4 rounded-lg border transition-all ${
                  isUnlocked
                    ? 'border-primary/50 bg-primary/5'
                    : isNext
                    ? 'border-orange-500/50 bg-orange-500/5'
                    : 'border-border bg-muted/30'
                }`}
              >
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${
                    isUnlocked ? '' : 'opacity-40 grayscale'
                  }`}
                  style={{
                    backgroundColor: isUnlocked ? `${level.level_color}20` : undefined,
                  }}
                >
                  {isUnlocked ? level.level_badge : <Lock size={20} />}
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">
                      Niveau {level.level_number} - {level.level_name}
                    </span>
                    {isUnlocked && currentLevel === level.level_number && (
                      <span className="px-2 py-0.5 bg-primary/20 text-primary text-xs rounded-full">
                        Actuel
                      </span>
                    )}
                    {isNext && (
                      <span className="px-2 py-0.5 bg-orange-500/20 text-orange-500 text-xs rounded-full">
                        Prochain
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {level.days_required} jours consécutifs requis
                    {!isUnlocked && isNext && (
                      <span className="ml-2 text-orange-500 font-medium">
                        (plus que {daysRemaining} jour{daysRemaining > 1 ? 's' : ''})
                      </span>
                    )}
                  </div>
                </div>

                {isUnlocked && (
                  <div className="text-green-500 font-semibold">
                    ✓ Débloqué
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
