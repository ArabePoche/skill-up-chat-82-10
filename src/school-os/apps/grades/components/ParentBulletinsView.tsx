/**
 * Vue bulletins pour les parents
 * Affiche les bulletins de chaque enfant organisés par période en accordion
 */
import React from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BookOpen, GraduationCap, Calendar, Award, TrendingUp, Users, Download, FileText, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useParentBulletins, ParentBulletinByPeriod } from '../hooks/useParentBulletins';
import { Loader2 } from 'lucide-react';
import { ParentChild } from '@/school-os/apps/classes/hooks/useParentChildren';

interface ParentBulletinsViewProps {
  children: ParentChild[];
  schoolId: string;
  schoolYearId: string;
}

export const ParentBulletinsView: React.FC<ParentBulletinsViewProps> = ({
  children: parentChildren,
  schoolId,
  schoolYearId,
}) => {
  if (!parentChildren || parentChildren.length === 0) {
    return (
      <div className="text-center py-12">
        <GraduationCap className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Aucun enfant trouvé</h3>
        <p className="text-muted-foreground">
          Aucun enfant n'est associé à votre compte pour cette année scolaire.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 h-full flex flex-col overflow-hidden">
      <div className="mb-4 flex-shrink-0">
        <h2 className="text-2xl font-bold">Bulletins scolaires</h2>
        <p className="text-muted-foreground mt-1">
          Consultez les bulletins de vos enfants par période
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-6 pb-4">
          {parentChildren.map((child) => (
            <ChildBulletinsBlock
              key={child.id}
              child={child}
              schoolId={schoolId}
              schoolYearId={schoolYearId}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

/** Bloc bulletin pour un enfant */
const ChildBulletinsBlock: React.FC<{
  child: ParentChild;
  schoolId: string;
  schoolYearId: string;
}> = ({ child, schoolId, schoolYearId }) => {
  const { data: bulletinsByPeriod, isLoading } = useParentBulletins(schoolId, schoolYearId, child.id);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
            {child.photo_url ? (
              <img src={child.photo_url} alt={`${child.first_name} ${child.last_name}`} className="w-full h-full object-cover" />
            ) : (
              <span className="text-sm font-medium">
                {child.first_name?.[0]}{child.last_name?.[0]}
              </span>
            )}
          </div>
          <div>
            <CardTitle className="text-lg">{child.last_name} {child.first_name}</CardTitle>
            <div className="flex items-center gap-2 mt-1">
              {child.class_name && (
                <Badge variant="outline">
                  <BookOpen className="w-3 h-3 mr-1" />
                  {child.class_name}
                </Badge>
              )}
              {child.student_code && (
                <span className="text-sm text-muted-foreground">{child.student_code}</span>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : bulletinsByPeriod.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Aucune période scolaire définie pour cette année.
          </p>
        ) : (
          <Accordion type="single" collapsible className="w-full">
            {bulletinsByPeriod.map((item) => (
              <PeriodAccordionItem key={item.period.id} data={item} />
            ))}
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
};

/** Item accordion pour une période */
const PeriodAccordionItem: React.FC<{ data: ParentBulletinByPeriod }> = ({ data }) => {
  const { period, reportCard } = data;
  const hasReport = !!reportCard;

  const getMentionColor = (avg: number | null) => {
    if (avg === null) return 'bg-muted text-muted-foreground';
    if (avg >= 16) return 'bg-green-500/20 text-green-700 dark:text-green-400';
    if (avg >= 14) return 'bg-blue-500/20 text-blue-700 dark:text-blue-400';
    if (avg >= 12) return 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400';
    if (avg >= 10) return 'bg-orange-500/20 text-orange-700 dark:text-orange-400';
    return 'bg-red-500/20 text-red-700 dark:text-red-400';
  };

  return (
    <AccordionItem value={period.id}>
      <AccordionTrigger className="hover:no-underline px-3">
        <div className="flex items-center gap-3 flex-1">
          <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="font-medium">{period.title}</span>
          {period.type && (
            <Badge variant="secondary" className="text-xs">{period.type}</Badge>
          )}
          {hasReport ? (
            <Badge className={cn("font-mono text-xs ml-auto mr-2", getMentionColor(reportCard.general_average))}>
              {reportCard.general_average !== null ? `${reportCard.general_average.toFixed(2)}/20` : 'N/A'}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs ml-auto mr-2">
              <Clock className="w-3 h-3 mr-1" />
              En attente
            </Badge>
          )}
        </div>
      </AccordionTrigger>

      <AccordionContent>
        {hasReport ? (
          <ReportCardDetails reportCard={reportCard} />
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <FileText className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Le bulletin de cette période n'est pas encore disponible.</p>
            <p className="text-xs mt-1">Il sera accessible dès sa publication par l'établissement.</p>
          </div>
        )}
      </AccordionContent>
    </AccordionItem>
  );
};

/** Détails d'un bulletin généré */
const ReportCardDetails: React.FC<{ reportCard: NonNullable<ParentBulletinByPeriod['reportCard']> }> = ({ reportCard }) => {
  const getMentionColor = (avg: number | null) => {
    if (avg === null) return 'bg-muted text-muted-foreground';
    if (avg >= 16) return 'bg-green-500/20 text-green-700 dark:text-green-400';
    if (avg >= 14) return 'bg-blue-500/20 text-blue-700 dark:text-blue-400';
    if (avg >= 12) return 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400';
    if (avg >= 10) return 'bg-orange-500/20 text-orange-700 dark:text-orange-400';
    return 'bg-red-500/20 text-red-700 dark:text-red-400';
  };

  return (
    <div className="space-y-4 px-3">
      {/* Stats principales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-lg">
          <TrendingUp className="h-4 w-4 text-primary flex-shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground">Moyenne</p>
            <p className="font-mono font-medium">
              {reportCard.general_average !== null ? `${reportCard.general_average.toFixed(2)}/20` : 'N/A'}
            </p>
          </div>
        </div>

        {reportCard.rank !== null && (
          <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-lg">
            <Award className="h-4 w-4 text-primary flex-shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Rang</p>
              <p className="font-mono font-medium">{reportCard.rank}<sup>e</sup></p>
            </div>
          </div>
        )}

        {reportCard.absences_count !== null && (
          <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-lg">
            <Users className="h-4 w-4 text-primary flex-shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Absences</p>
              <p className="font-mono font-medium">{reportCard.absences_count}</p>
            </div>
          </div>
        )}

        {reportCard.late_count !== null && (
          <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-lg">
            <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Retards</p>
              <p className="font-mono font-medium">{reportCard.late_count}</p>
            </div>
          </div>
        )}
      </div>

      {/* Mention */}
      {reportCard.mention && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Mention :</span>
          <Badge className={cn("text-sm", getMentionColor(reportCard.general_average))}>
            {reportCard.mention}
          </Badge>
        </div>
      )}

      {/* Conduite */}
      {reportCard.conduct_grade && (
        <div className="p-3 bg-accent/50 rounded-lg">
          <p className="text-xs font-medium text-muted-foreground mb-1">Conduite</p>
          <p className="text-sm">{reportCard.conduct_grade}</p>
        </div>
      )}

      {/* Appréciation enseignant */}
      {reportCard.teacher_appreciation && (
        <div className="p-3 bg-accent/50 rounded-lg">
          <p className="text-xs font-medium text-muted-foreground mb-1">Appréciation de l'enseignant</p>
          <p className="text-sm italic">{reportCard.teacher_appreciation}</p>
        </div>
      )}

      {/* Appréciation direction */}
      {reportCard.principal_appreciation && (
        <div className="p-3 bg-accent/50 rounded-lg">
          <p className="text-xs font-medium text-muted-foreground mb-1">Appréciation de la direction</p>
          <p className="text-sm italic">{reportCard.principal_appreciation}</p>
        </div>
      )}

      {/* Télécharger PDF si disponible */}
      {reportCard.pdf_url && (
        <div className="flex justify-end">
          <Button
            size="sm"
            variant="outline"
            className="gap-2"
            onClick={() => window.open(reportCard.pdf_url!, '_blank')}
          >
            <Download className="h-4 w-4" />
            Télécharger le bulletin PDF
          </Button>
        </div>
      )}
    </div>
  );
};
