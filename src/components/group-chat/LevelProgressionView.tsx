
import React from 'react';
import { CheckCircle, Circle, Lock, BookOpen, Play, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useGroupProgression } from '@/hooks/group-chat/useGroupProgression';
import { useStudentPromotion } from '@/hooks/usePromotion';

interface Level {
  id: string | number;
  title: string;
  description?: string;
  order_index: number;
  lessons?: Array<{
    id: string | number;
    title: string;
    description?: string;
    order_index: number;
    exercises?: { id: string }[];
  }>;
}

interface LevelProgressionViewProps {
  levels: Level[];
  formationId: string;
  onLevelSelect: (level: Level) => void;
  selectedLevel?: Level;
}

export const LevelProgressionView: React.FC<LevelProgressionViewProps> = ({
  levels,
  formationId,
  onLevelSelect,
  selectedLevel,
}) => {
  const { data: studentPromotion } = useStudentPromotion(formationId);
  const { data: groupProgression = [] } = useGroupProgression(
    formationId, 
    studentPromotion?.promotion_id
  );

  // Déterminer quels niveaux sont débloqués basés sur la progression
  const getUnlockedLevels = () => {
    const unlockedLevelIds = new Set<string>();
    
    // Premier niveau toujours débloqué
    if (levels.length > 0) {
      unlockedLevelIds.add(levels[0].id.toString());
    }
    
    // Débloquage basé sur la progression dans lesson_messages
    groupProgression.forEach(progress => {
      unlockedLevelIds.add(progress.levelId);
    });
    
    return unlockedLevelIds;
  };

  const unlockedLevels = getUnlockedLevels();

  const getLevelProgress = (levelId: string) => {
    const levelProgression = groupProgression.filter(p => p.levelId === levelId);
    const totalExercises = levelProgression.length;
    const completedExercises = levelProgression.filter(p => p.isCompleted).length;
    
    return {
      total: totalExercises,
      completed: completedExercises,
      percentage: totalExercises > 0 ? (completedExercises / totalExercises) * 100 : 0
    };
  };

  const getLevelStatus = (level: Level) => {
    const levelId = level.id.toString();
    const isUnlocked = unlockedLevels.has(levelId);
    
    if (!isUnlocked) return 'locked';
    
    const progress = getLevelProgress(levelId);
    if (progress.completed === progress.total && progress.total > 0) {
      return 'completed';
    } else if (progress.completed > 0) {
      return 'in_progress';
    } else {
      return 'available';
    }
  };

  const getStatusIcon = (level: Level) => {
    const status = getLevelStatus(level);
    
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'in_progress':
        return <Play className="h-5 w-5 text-blue-600" />;
      case 'available':
        return <Circle className="h-5 w-5 text-gray-600" />;
      default:
        return <Lock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (level: Level) => {
    const status = getLevelStatus(level);
    
    switch (status) {
      case 'completed':
        return 'default' as const;
      case 'in_progress':
        return 'secondary' as const;
      case 'available':
        return 'outline' as const;
      default:
        return 'secondary' as const;
    }
  };

  // Trier les niveaux par order_index
  const sortedLevels = [...levels].sort((a, b) => a.order_index - b.order_index);

  return (
    <div className="space-y-4 p-6">
      <div className="text-center mb-8">
        <Users className="h-12 w-12 text-primary mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-foreground mb-2">Progression Groupe</h1>
        <p className="text-muted-foreground">
          Suivez votre progression dans les différents niveaux de formation
        </p>
      </div>

      <div className="grid gap-4">
        {sortedLevels.map((level) => {
          const status = getLevelStatus(level);
          const isUnlocked = status !== 'locked';
          const progress = getLevelProgress(level.id.toString());
          
          return (
            <Card 
              key={level.id} 
              className={`cursor-pointer transition-all hover:shadow-md ${
                selectedLevel?.id === level.id ? 'ring-2 ring-primary' : ''
              } ${isUnlocked ? '' : 'opacity-60'}`}
              onClick={() => {
                if (isUnlocked) {
                  onLevelSelect(level);
                }
              }}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(level)}
                    <div>
                      <CardTitle className="text-lg">{level.title}</CardTitle>
                      {level.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {level.description}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Badge variant={getStatusColor(level)}>
                      {status === 'completed' 
                        ? 'Terminé'
                        : status === 'in_progress'
                          ? 'En cours'
                          : status === 'available'
                            ? 'Disponible'
                            : 'Verrouillé'
                      }
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <BookOpen className="h-4 w-4" />
                    <span>
                      {level.lessons?.length || 0} leçon{(level.lessons?.length || 0) !== 1 ? 's' : ''}
                    </span>
                  </div>
                  
                  {progress.total > 0 && (
                    <div className="text-sm text-muted-foreground">
                      {progress.completed}/{progress.total} exercices
                    </div>
                  )}
                </div>
                
                {progress.total > 0 && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Progression</span>
                      <span>{Math.round(progress.percentage)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${progress.percentage}%` }}
                      />
                    </div>
                  </div>
                )}
                
                {isUnlocked && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full mt-3"
                    onClick={(e) => {
                      e.stopPropagation();
                      onLevelSelect(level);
                    }}
                  >
                    {selectedLevel?.id === level.id ? 'Niveau sélectionné' : 'Accéder au niveau'}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
