/**
 * Carte bulletin pliable pour un élève
 * Affiche: notes par matière, moyenne, total, rang, moyenne classe, appréciation
 */
import React from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, User, Award, TrendingUp, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SubjectGrade {
  subjectId: string;
  subjectName: string;
  score: number | null;
  maxScore: number;
  coefficient: number;
  isAbsent?: boolean;
}

export interface StudentBulletinData {
  studentId: string;
  studentName: string;
  studentCode: string;
  photoUrl?: string | null;
  grades: SubjectGrade[];
  average: number | null;
  totalPoints: number;
  totalMaxPoints: number;
  rank: number;
  totalStudents: number;
  classAverage: number;
  firstAverage: number;
  appreciation: string;
  mention?: string;
}

interface StudentBulletinCardProps {
  data: StudentBulletinData;
  defaultOpen?: boolean;
}

export const StudentBulletinCard: React.FC<StudentBulletinCardProps> = ({ 
  data, 
  defaultOpen = false 
}) => {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  const getMentionColor = (average: number | null) => {
    if (average === null) return 'bg-muted text-muted-foreground';
    if (average >= 16) return 'bg-green-500/20 text-green-700 dark:text-green-400';
    if (average >= 14) return 'bg-blue-500/20 text-blue-700 dark:text-blue-400';
    if (average >= 12) return 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400';
    if (average >= 10) return 'bg-orange-500/20 text-orange-700 dark:text-orange-400';
    return 'bg-red-500/20 text-red-700 dark:text-red-400';
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/50';
    if (rank === 2) return 'bg-gray-300/30 text-gray-700 dark:text-gray-300 border-gray-400/50';
    if (rank === 3) return 'bg-orange-400/20 text-orange-700 dark:text-orange-400 border-orange-400/50';
    return 'bg-muted text-muted-foreground';
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className={cn(
        "transition-all duration-200",
        isOpen ? "ring-2 ring-primary/20" : "hover:bg-accent/50"
      )}>
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-4">
              {/* Photo ou avatar */}
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                {data.photoUrl ? (
                  <img src={data.photoUrl} alt={data.studentName} className="w-full h-full object-cover" />
                ) : (
                  <User className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              
              {/* Nom et code */}
              <div className="text-left">
                <p className="font-medium">{data.studentName}</p>
                <p className="text-sm text-muted-foreground">{data.studentCode}</p>
              </div>
            </div>

            {/* Stats rapides */}
            <div className="flex items-center gap-3">
              <Badge variant="outline" className={cn("font-mono", getRankBadge(data.rank))}>
                {data.rank}<sup>e</sup>/{data.totalStudents}
              </Badge>
              <Badge className={cn("font-mono text-sm", getMentionColor(data.average))}>
                {data.average !== null ? data.average.toFixed(2) : 'N/A'}/20
              </Badge>
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 pb-4 px-4">
            <div className="border-t pt-4 space-y-4">
              {/* Notes par matière */}
              <div>
                <h4 className="text-sm font-medium mb-2">Notes par matière</h4>
                <div className="grid gap-2">
                  {data.grades.map((grade) => (
                    <div 
                      key={grade.subjectId} 
                      className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-md"
                    >
                      <span className="text-sm">{grade.subjectName}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          (coef. {grade.coefficient})
                        </span>
                        {grade.isAbsent ? (
                          <Badge variant="outline" className="text-xs">Absent</Badge>
                        ) : (
                          <Badge 
                            variant="secondary" 
                            className={cn(
                              "font-mono",
                              grade.score !== null && grade.score >= grade.maxScore / 2 
                                ? "bg-green-500/20 text-green-700 dark:text-green-400" 
                                : "bg-red-500/20 text-red-700 dark:text-red-400"
                            )}
                          >
                            {grade.score !== null ? grade.score : '-'}/{grade.maxScore}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Statistiques */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-lg">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Total points</p>
                    <p className="font-mono font-medium">{data.totalPoints}/{data.totalMaxPoints}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-lg">
                  <Award className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Rang</p>
                    <p className="font-mono font-medium">{data.rank}<sup>e</sup> / {data.totalStudents}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-lg">
                  <Users className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Moy. classe</p>
                    <p className="font-mono font-medium">{data.classAverage.toFixed(2)}/20</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-lg">
                  <Award className="h-4 w-4 text-yellow-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">Moy. 1er</p>
                    <p className="font-mono font-medium">{data.firstAverage.toFixed(2)}/20</p>
                  </div>
                </div>
              </div>

              {/* Appréciation */}
              {data.appreciation && (
                <div className="p-3 bg-accent/50 rounded-lg">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Appréciation</p>
                  <p className="text-sm italic">{data.appreciation}</p>
                </div>
              )}

              {/* Mention */}
              {data.mention && (
                <div className="flex justify-end">
                  <Badge className={cn("text-sm", getMentionColor(data.average))}>
                    {data.mention}
                  </Badge>
                </div>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};
