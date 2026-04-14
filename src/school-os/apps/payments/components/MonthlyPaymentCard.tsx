/**
 * Carte affichant le détail mensuel des paiements d'un élève
 */
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, Percent, CheckCircle2, AlertCircle, Clock, Edit } from 'lucide-react';
import { StudentMonthlyTracking, MonthlyPaymentStatus } from '../hooks/useMonthlyPaymentTracking';
import { cn } from '@/lib/utils';
import { EditDiscountDialog } from './EditDiscountDialog';
import { MonthlyStatusBadges } from './MonthlyStatusBadges';
import { StudentAvatar } from '@/school-os/apps/students/components/StudentAvatar';
import { FamilyDetailsDialog } from '@/school-os/families/components/FamilyDetailsDialog';

interface MonthlyPaymentCardProps {
  tracking: StudentMonthlyTracking;
}

export const MonthlyPaymentCard: React.FC<MonthlyPaymentCardProps> = ({ tracking }) => {
  const { student, monthlyFee, months, totalMonthsPaid, totalMonthsLate, overallStatus } = tracking;
  const [isEditDiscountOpen, setIsEditDiscountOpen] = useState(false);
  const [isFamilyDialogOpen, setIsFamilyDialogOpen] = useState(false);

  const getStatusColor = (status: MonthlyPaymentStatus['status']) => {
    switch (status) {
      case 'paid':
        return 'bg-green-500';
      case 'partial':
        return 'bg-orange-500';
      case 'late':
        return 'bg-red-500';
      default:
        return 'bg-muted';
    }
  };

  const getOverallStatusBadge = () => {
    switch (overallStatus) {
      case 'up_to_date':
        return (
          <Badge className="bg-green-500 hover:bg-green-600">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            À jour
          </Badge>
        );
      case 'partial':
        return (
          <Badge className="bg-orange-500 hover:bg-orange-600">
            <Clock className="w-3 h-3 mr-1" />
            Partiellement payé
          </Badge>
        );
      case 'late':
        return (
          <Badge variant="destructive">
            <AlertCircle className="w-3 h-3 mr-1" />
            En retard
          </Badge>
        );
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2 sm:pb-3">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
            <StudentAvatar
              photoUrl={student.photo_url}
              firstName={student.first_name}
              lastName={student.last_name}
              size="md"
              className="shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap mb-1">
                <CardTitle className="text-sm sm:text-base">
                  {student.first_name} {student.last_name}
                </CardTitle>
                {(student.discount_percentage || student.discount_amount) && (
                  <Badge variant="outline" className="text-[9px] sm:text-[10px] py-0 px-1.5">
                    <Percent className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />
                    {student.discount_percentage ? `${student.discount_percentage}%` : `${student.discount_amount?.toLocaleString()} FCFA`}
                  </Badge>
                )}
                {student.is_family_member && (
                  <Badge 
                    variant="outline" 
                    className="text-[9px] sm:text-[10px] py-0 px-1.5 cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => setIsFamilyDialogOpen(true)}
                  >
                    <Users className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />
                    {student.family_name}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  {student.classes?.name || 'Aucune classe'} • {student.student_code || 'N/A'}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditDiscountOpen(true)}
                  className="h-5 sm:h-6 px-1.5 sm:px-2 text-[10px] sm:text-xs"
                >
                  <Edit className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />
                  Remise
                </Button>
              </div>
            </div>
          </div>
          <div className="flex sm:flex-col items-center sm:items-end gap-2 sm:gap-1 shrink-0">
            {getOverallStatusBadge()}
            <p className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">
              {totalMonthsPaid}/{months.length} mois
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 sm:space-y-4">
        {/* Frais mensuel */}
        <div className="bg-muted/50 rounded-lg p-2 sm:p-3">
          <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5 sm:mb-1">Frais mensuel:</p>
          <p className="text-base sm:text-lg font-bold">{Math.round(monthlyFee).toLocaleString('fr-FR')} FCFA</p>
        </div>

        {/* Statuts mensuels */}
        <div className="space-y-1.5 sm:space-y-2">
          <p className="text-[10px] sm:text-xs text-muted-foreground">Détail mensuel:</p>
          <MonthlyStatusBadges months={months} />
        </div>

        {/* Résumé des paiements */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 pt-2 border-t">
          <div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Total payé</p>
            <p className="text-xs sm:text-sm font-semibold break-words">{Math.round(student.total_amount_paid || 0).toLocaleString('fr-FR')} FCFA</p>
          </div>
          <div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Total dû</p>
            <p className="text-xs sm:text-sm font-semibold break-words">{Math.round(student.total_amount_due || 0).toLocaleString('fr-FR')} FCFA</p>
          </div>
          <div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Reste</p>
            <p className={cn(
              "text-xs sm:text-sm font-semibold break-words",
              student.remaining_amount === 0 ? "text-green-600" : "text-red-600"
            )}>
              {Math.round(student.remaining_amount || 0).toLocaleString('fr-FR')} FCFA
            </p>
          </div>
        </div>

        {/* Alerte si en retard */}
        {totalMonthsLate > 0 && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-2 sm:p-3 flex items-start gap-1.5 sm:gap-2">
            <AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-destructive mt-0.5 flex-shrink-0" />
            <div className="text-xs sm:text-sm">
              <p className="font-medium text-destructive">En retard de paiement</p>
              <p className="text-muted-foreground text-[10px] sm:text-xs">
                {totalMonthsLate} mois impayé{totalMonthsLate > 1 ? 's' : ''}
              </p>
            </div>
          </div>
        )}
      </CardContent>

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
