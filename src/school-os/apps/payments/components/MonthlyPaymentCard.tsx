/**
 * Carte affichant le détail mensuel des paiements d'un élève
 */
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Users, Percent, CheckCircle2, AlertCircle, Clock, Circle } from 'lucide-react';
import { StudentMonthlyTracking, MonthlyPaymentStatus } from '../hooks/useMonthlyPaymentTracking';
import { cn } from '@/lib/utils';

interface MonthlyPaymentCardProps {
  tracking: StudentMonthlyTracking;
}

export const MonthlyPaymentCard: React.FC<MonthlyPaymentCardProps> = ({ tracking }) => {
  const { student, monthlyFee, months, totalMonthsPaid, totalMonthsLate, overallStatus } = tracking;

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
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                {student.first_name} {student.last_name}
                {(student.discount_percentage || student.discount_amount) && (
                  <Badge variant="outline" className="text-[10px] py-0">
                    <Percent className="w-3 h-3 mr-1" />
                    {student.discount_percentage ? `${student.discount_percentage}%` : `${student.discount_amount?.toLocaleString()} FCFA`}
                  </Badge>
                )}
                {student.is_family_member && (
                  <Badge variant="outline" className="text-[10px] py-0">
                    <Users className="w-3 h-3 mr-1" />
                    {student.family_name}
                  </Badge>
                )}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {student.classes?.name || 'Aucune classe'} • {student.student_code || 'N/A'}
              </p>
            </div>
          </div>
          <div className="text-right space-y-1">
            {getOverallStatusBadge()}
            <p className="text-xs text-muted-foreground">
              {totalMonthsPaid}/{months.length} mois payés
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Frais mensuel */}
        <div className="bg-muted/50 rounded-lg p-3">
          <p className="text-xs text-muted-foreground mb-1">Frais mensuel:</p>
          <p className="text-lg font-bold">{Math.round(monthlyFee).toLocaleString('fr-FR')} FCFA</p>
        </div>

        {/* Timeline des mois */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Détail mensuel:</p>
          <div className="grid grid-cols-3 md:grid-cols-9 gap-2">
            {months.map((month) => (
              <div key={month.month} className="relative group">
                <div
                  className={cn(
                    "w-full aspect-square rounded-lg transition-all cursor-pointer",
                    getStatusColor(month.status),
                    "hover:ring-2 hover:ring-offset-2 hover:ring-primary"
                  )}
                  title={`${month.monthLabel}: ${month.status === 'paid' ? 'Payé' : month.status === 'partial' ? 'Partiellement payé' : month.status === 'late' ? 'En retard' : 'À venir'}`}
                >
                  {/* Tooltip au survol */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                    <div className="bg-popover text-popover-foreground text-xs rounded-lg shadow-lg p-2 whitespace-nowrap border">
                      <p className="font-medium">{month.monthLabel}</p>
                      <p className="text-muted-foreground">
                        {month.paidAmount > 0 
                          ? `${Math.round(month.paidAmount).toLocaleString()} / ${Math.round(month.expectedAmount).toLocaleString()} FCFA`
                          : month.isPastDue 
                            ? 'Non payé'
                            : 'À venir'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Résumé des paiements */}
        <div className="grid grid-cols-3 gap-4 pt-2 border-t">
          <div>
            <p className="text-xs text-muted-foreground">Total payé</p>
            <p className="text-sm font-semibold">{Math.round(student.total_amount_paid || 0).toLocaleString('fr-FR')} FCFA</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total dû</p>
            <p className="text-sm font-semibold">{Math.round(student.total_amount_due || 0).toLocaleString('fr-FR')} FCFA</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Reste</p>
            <p className={cn(
              "text-sm font-semibold",
              student.remaining_amount === 0 ? "text-green-600" : "text-red-600"
            )}>
              {Math.round(student.remaining_amount || 0).toLocaleString('fr-FR')} FCFA
            </p>
          </div>
        </div>

        {/* Alerte si en retard */}
        {totalMonthsLate > 0 && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-destructive">En retard de paiement</p>
              <p className="text-muted-foreground text-xs">
                {totalMonthsLate} mois impayé{totalMonthsLate > 1 ? 's' : ''}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
