/**
 * Carte bulletin pliable pour un élève
 * Affiche: notes par matière, moyenne, total, rang, moyenne classe, appréciation
 * Actions: télécharger PDF individuel, envoyer par WhatsApp
 */
import React, { useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, User, Award, TrendingUp, Users, Download, MessageCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { exportSingleBulletinToPdf } from '../../utils/bulletinPdfExport';
import { BulletinTemplate } from '../../hooks/useBulletins';
import { toast } from 'sonner';

export interface SubjectGrade {
  subjectId: string;
  subjectName: string;
  score: number | null;
  maxScore: number;
  coefficient: number;
  isAbsent?: boolean;
  classGradeScore?: number | null; // Note de classe (facultatif) 
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
  hasClassGrades?: boolean; // Indique si les notes de classe sont incluses
  parentPhone?: string | null;
}

interface StudentBulletinCardProps {
  data: StudentBulletinData;
  defaultOpen?: boolean;
  className?: string;
  evaluationTitle?: string;
  template?: BulletinTemplate | null;
  schoolName?: string;
}

export const StudentBulletinCard: React.FC<StudentBulletinCardProps> = ({ 
  data, 
  defaultOpen = false,
  className: classNameProp,
  evaluationTitle = '',
  template,
  schoolName,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [isDownloading, setIsDownloading] = useState(false);

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

  // Télécharger le bulletin PDF individuel
  const handleDownloadPdf = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDownloading(true);
    
    try {
      await exportSingleBulletinToPdf({
        className: classNameProp || 'Classe',
        evaluationTitle: evaluationTitle || 'Évaluation',
        schoolName,
        template,
        bulletin: {
          studentId: data.studentId,
          studentName: data.studentName,
          studentCode: data.studentCode,
          photoUrl: data.photoUrl || undefined,
          grades: data.grades,
          average: data.average,
          totalPoints: data.totalPoints,
          totalMaxPoints: data.totalMaxPoints,
          rank: data.rank,
          totalStudents: data.totalStudents,
          classAverage: data.classAverage,
          firstAverage: data.firstAverage,
          appreciation: data.appreciation,
          mention: data.mention,
          hasClassGrades: data.hasClassGrades,
        },
      });
      toast.success('Bulletin téléchargé');
    } catch (error) {
      console.error('Erreur export PDF:', error);
      toast.error('Erreur lors du téléchargement');
    } finally {
      setIsDownloading(false);
    }
  };

  // Envoyer par WhatsApp
  const handleSendWhatsApp = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!data.parentPhone) {
      toast.error('Aucun numéro de téléphone du parent renseigné');
      return;
    }

    // Formater le numéro de téléphone (enlever espaces et caractères spéciaux)
    let phoneNumber = data.parentPhone.replace(/[\s\-\(\)]/g, '');
    
    // Ajouter le préfixe si nécessaire
    if (!phoneNumber.startsWith('+')) {
      // Par défaut, ajouter le préfixe français si pas de préfixe
      if (phoneNumber.startsWith('0')) {
        phoneNumber = '+33' + phoneNumber.substring(1);
      }
    }

    // Créer le message
    const avgText = data.average !== null ? data.average.toFixed(2) : 'N/A';
    const message = `📋 *Bulletin de ${data.studentName}*

📚 Période: ${evaluationTitle || 'Évaluation'}
📊 Moyenne: ${avgText}/20
🏆 Rang: ${data.rank}/${data.totalStudents}
${data.mention ? `🎖️ Mention: ${data.mention}` : ''}

${data.appreciation ? `📝 Appréciation: ${data.appreciation}` : ''}

_Bulletin disponible au téléchargement dans l'application._`;

    // Ouvrir WhatsApp avec le message
    const whatsappUrl = `https://wa.me/${phoneNumber.replace('+', '')}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    
    toast.success('Ouverture de WhatsApp...');
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
              {/* Actions individuelles */}
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDownloadPdf}
                  disabled={isDownloading}
                  className="gap-2"
                >
                  {isDownloading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  Télécharger PDF
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSendWhatsApp}
                  className="gap-2 text-green-600 hover:text-green-700 hover:bg-green-50"
                >
                  <MessageCircle className="h-4 w-4" />
                  Envoyer WhatsApp
                  {!data.parentPhone && (
                    <span className="text-xs text-muted-foreground">(pas de n°)</span>
                  )}
                </Button>
              </div>

              {/* Notes par matière */}
              <div>
                <h4 className="text-sm font-medium mb-2">Notes par matière</h4>
                <div className="grid gap-2">
                  {/* En-tête si notes de classe présentes */}
                  {data.hasClassGrades && data.grades.some(g => g.classGradeScore !== null && g.classGradeScore !== undefined) && (
                    <div className="flex items-center justify-between py-1 px-3 text-xs text-muted-foreground border-b border-border/50">
                      <span>Matière</span>
                      <div className="flex items-center gap-4">
                        <span className="w-16 text-center">Note classe</span>
                        <span className="w-16 text-center">Note examen</span>
                        <span className="w-8"></span>
                      </div>
                    </div>
                  )}
                  {data.grades.map((grade) => (
                    <div 
                      key={grade.subjectId} 
                      className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-md"
                    >
                      <span className="text-sm flex-1">{grade.subjectName}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          (coef. {grade.coefficient})
                        </span>
                        {/* Note de classe si disponible */}
                        {data.hasClassGrades && (
                          <Badge 
                            variant="outline" 
                            className="font-mono w-16 justify-center text-xs"
                          >
                            {grade.classGradeScore !== null && grade.classGradeScore !== undefined
                              ? grade.classGradeScore 
                              : '-'}
                          </Badge>
                        )}
                        {/* Note d'examen */}
                        {grade.isAbsent ? (
                          <Badge variant="outline" className="text-xs w-16 justify-center">Absent</Badge>
                        ) : (
                          <Badge 
                            variant="secondary" 
                            className={cn(
                              "font-mono w-16 justify-center",
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
