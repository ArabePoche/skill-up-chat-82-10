/**
 * Carte compacte affichant le suivi mensuel des paiements d'un élève
 * Design minimaliste : barre de mois colorés intégrée directement
 */
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, Percent, CheckCircle2, AlertCircle, Clock, Edit } from 'lucide-react';
import { StudentMonthlyTracking, MonthlyPaymentStatus } from '../hooks/useMonthlyPaymentTracking';
import { cn } from '@/lib/utils';
import { EditDiscountDialog } from './EditDiscountDialog';
import { StudentAvatar } from '@/school-os/apps/students/components/StudentAvatar';
import { FamilyDetailsDialog } from '@/school-os/families/components/FamilyDetailsDialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface MonthlyPaymentCardProps {
  tracking: StudentMonthlyTracking;
}

const MONTH_SHORT = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

const getMonthAbbr = (monthLabel: string): string => {
  const [month] = monthLabel.split(' ');
  return month.substring(0, 3);
};

const getDotColor = (status: MonthlyPaymentStatus['status']) => {
  switch (status) {
    case 'paid': return 'bg-green-500';
    case 'partial': return 'bg-orange-400';
    case 'late': return 'bg-red-500';
    default: return 'bg-muted-foreground/20';
  }
};

const getStatusIcon = (status: 'up_to_date' | 'partial' | 'late') => {
  switch (status) {
    case 'up_to_date':
      return <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />;
    case 'partial':
      return <Clock className="w-3.5 h-3.5 text-orange-500" />;
    case 'late':
      return <AlertCircle className="w-3.5 h-3.5 text-red-500" />;
  }
};

export const MonthlyPaymentCard: React.FC<MonthlyPaymentCardProps> = ({ tracking }) => {
  const { student, monthlyFee, months, totalMonthsPaid, totalMonthsLate, overallStatus } = tracking;
  const [isEditDiscountOpen, setIsEditDiscountOpen] = useState(false);
  const [isFamilyDialogOpen, setIsFamilyDialogOpen] = useState(false);

  const remaining = Math.round(student.remaining_amount || 0);

  return (
    <Card className="p-3 sm:p-4">
      {/* Ligne principale : avatar + infos + statut */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        <StudentAvatar
          photoUrl={student.photo_url}
          firstName={student.first_name}
          lastName={student.last_name}
          size="sm"
          className="shrink-0"
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-semibold truncate">
              {student.first_name} {student.last_name}
            </span>
            {(student.discount_percentage || student.discount_amount) && (
              <span className="text-[9px] text-muted-foreground">
                <Percent className="w-2.5 h-2.5 inline mr-0.5" />
                {student.discount_percentage ? `${student.discount_percentage}%` : `${student.discount_amount?.toLocaleString()}`}
              </span>
            )}
            {student.is_family_member && (
              <span
                className="text-[9px] text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                onClick={() => setIsFamilyDialogOpen(true)}
              >
                <Users className="w-2.5 h-2.5 inline mr-0.5" />
                {student.family_name}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-[10px] sm:text-xs text-muted-foreground">
            <span>{student.classes?.name || '—'}</span>
            <span>•</span>
            <span>{Math.round(monthlyFee).toLocaleString('fr-FR')}/mois</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditDiscountOpen(true)}
              className="h-4 px-1 text-[9px] opacity-50 hover:opacity-100"
            >
              <Edit className="w-2.5 h-2.5" />
            </Button>
          </div>
        </div>

        {/* Statut résumé à droite */}
        <div className="flex flex-col items-end gap-0.5 shrink-0">
          <div className="flex items-center gap-1">
            {getStatusIcon(overallStatus)}
            <span className="text-[10px] sm:text-xs font-medium text-muted-foreground">
              {totalMonthsPaid}/{months.length}
            </span>
          </div>
          {remaining > 0 && (
            <span className="text-[9px] sm:text-[10px] text-red-500 font-medium">
              -{remaining.toLocaleString('fr-FR')}
            </span>
          )}
        </div>
      </div>

      {/* Barre des mois : pastilles minimalistes */}
      <TooltipProvider delayDuration={200}>
        <div className="flex items-center gap-[3px] sm:gap-1 mt-2.5 pt-2 border-t border-border/50">
          {months.map((month) => {
            const abbr = getMonthAbbr(month.monthLabel);
            const remainingMonth = month.expectedAmount - month.paidAmount;
            const tooltipText = month.status === 'paid'
              ? `${month.monthLabel} — Payé ✓`
              : month.status === 'partial'
              ? `${month.monthLabel} — Reste ${Math.round(remainingMonth).toLocaleString('fr-FR')} FCFA`
              : month.status === 'late'
              ? `${month.monthLabel} — Impayé`
              : `${month.monthLabel} — À venir`;

            return (
              <Tooltip key={month.month}>
                <TooltipTrigger asChild>
                  <div className="flex flex-col items-center gap-0.5 flex-1 min-w-0 cursor-default">
                    <span className="text-[8px] sm:text-[9px] text-muted-foreground/70 leading-none select-none">
                      {abbr}
                    </span>
                    <div
                      className={cn(
                        "w-full h-1.5 sm:h-2 rounded-full transition-colors",
                        getDotColor(month.status)
                      )}
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  {tooltipText}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </TooltipProvider>

      <EditDiscountDialog
        open={isEditDiscountOpen}
        onOpenChange={setIsEditDiscountOpen}
        student={student}
      />

      {student.family_id && (
        <FamilyDetailsDialog
          open={isFamilyDialogOpen}
          onOpenChange={setIsFamilyDialogOpen}
          familyId={student.family_id}
          schoolId={student.school_id}
          currentStudentId={student.id}
        />
      )}
    </Card>
  );
};
