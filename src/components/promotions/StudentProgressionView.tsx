
import React from 'react';
import { CheckCircle, Circle, Lock, BookOpen, Trophy } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useStudentProgression } from '@/hooks/useStudentProgression';
import { PromotionChat } from './PromotionChat';

interface StudentProgressionViewProps {
  formationId: string;
  onLessonSelect: (lessonId: string, lessonTitle: string) => void;
  selectedLessonId?: string;
  selectedLessonTitle?: string;
}

export const StudentProgressionView: React.FC<StudentProgressionViewProps> = ({
  formationId,
  onLessonSelect,
  selectedLessonId,
  selectedLessonTitle,
}) => {
  const { data: progression = [], isLoading } = useStudentProgression(formationId);

  const getStatusIcon = (status: string, canAccess: boolean) => {
    if (!canAccess) return <Lock className="h-4 w-4 text-muted-foreground" />;
    
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'in_progress':
      case 'awaiting_review':
        return <Circle className="h-4 w-4 text-blue-600" />;
      default:
        return <Circle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string, canAccess: boolean) => {
    if (!canAccess) return 'secondary';
    
    switch (status) {
      case 'completed':
        return 'default' as const;
      case 'in_progress':
      case 'awaiting_review':
        return 'secondary' as const;
      default:
        return 'outline' as const;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-muted-foreground">Chargement de votre progression...</p>
        </div>
      </div>
    );
  }

  if (selectedLessonId && selectedLessonTitle) {
    return (
      <PromotionChat
        lessonId={selectedLessonId}
        formationId={formationId}
        lessonTitle={selectedLessonTitle}
        promotionId="default-promotion" // TODO: Récupérer la vraie promotion
      />
    );
  }

  // Grouper par niveau
  const groupedByLevel = progression.reduce((acc, lesson) => {
    const levelId = lesson.levelId;
    if (!acc[levelId]) {
      acc[levelId] = {
        levelTitle: lesson.levelTitle,
        lessons: [],
      };
    }
    acc[levelId].lessons.push(lesson);
    return acc;
  }, {} as Record<string, { levelTitle: string; lessons: typeof progression }>);

  return (
    <div className="space-y-6 p-6">
      <div className="text-center mb-8">
        <Trophy className="h-12 w-12 text-primary mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-foreground mb-2">Ma Progression</h1>
        <p className="text-muted-foreground">
          Suivez votre progression et accédez aux leçons débloquées
        </p>
      </div>

      {Object.entries(groupedByLevel).map(([levelId, levelData]) => (
        <Card key={levelId} className="overflow-hidden">
          <CardHeader className="bg-primary/5">
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              {levelData.levelTitle}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="space-y-0">
              {levelData.lessons.map((lesson, index) => (
                <div
                  key={lesson.lessonId}
                  className={`p-4 border-b last:border-b-0 ${
                    lesson.canAccess 
                      ? 'hover:bg-muted/50 cursor-pointer' 
                      : 'opacity-60 cursor-not-allowed'
                  }`}
                  onClick={() => {
                    if (lesson.canAccess) {
                      onLessonSelect(lesson.lessonId, lesson.lessonTitle);
                    }
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(lesson.status, lesson.canAccess)}
                      <div>
                        <h3 className="font-medium text-foreground">
                          {lesson.lessonTitle}
                        </h3>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant={getStatusColor(lesson.status, lesson.canAccess)}>
                            {lesson.status === 'completed' 
                              ? 'Terminée'
                              : lesson.status === 'in_progress'
                                ? 'En cours'
                                : lesson.status === 'awaiting_review'
                                  ? 'En attente'
                                  : lesson.canAccess
                                    ? 'Disponible'
                                    : 'Verrouillée'
                            }
                          </Badge>
                          {lesson.exercises.length > 0 && (
                            <span className="text-sm text-muted-foreground">
                              {lesson.exercises.filter(e => e.isCompleted).length}/{lesson.exercises.length} exercices
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {lesson.canAccess && (
                      <Button variant="ghost" size="sm">
                        Ouvrir
                      </Button>
                    )}
                  </div>

                  {lesson.completedAt && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Terminée le {new Date(lesson.completedAt).toLocaleDateString('fr-FR')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {progression.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              Aucune leçon disponible
            </h3>
            <p className="text-muted-foreground">
              Vous n'êtes pas encore inscrit à cette formation ou aucune leçon n'est disponible.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};