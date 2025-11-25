// Carte affichant les informations de paiement d'un élève
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, AlertCircle, CheckCircle, Clock, Users, Percent, Edit, History, CreditCard } from 'lucide-react';
import { EditDiscountDialog } from './EditDiscountDialog';
import { PaymentHistoryModal } from './PaymentHistoryModal';
import { StudentAvatar } from '@/school-os/apps/students/components/StudentAvatar';
import { calculateDiscountedAmount } from '../utils/discountCalculations';

interface StudentPaymentCardProps {
  student: any;
  onAddPayment: () => void;
}


export const StudentPaymentCard: React.FC<StudentPaymentCardProps> = ({
  student,
  onAddPayment,
}) => {
  const [isEditDiscountOpen, setIsEditDiscountOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const totalDue = student.total_amount_due || 0;
  const totalPaid = student.total_amount_paid || 0;
  const remaining = student.remaining_amount || 0;
  
  // Calculer les frais annuels avec remise appliquée
  const annualFee = student.annual_fee || 0;
  const { finalAmount: effectiveAnnualFee, discountApplied } = calculateDiscountedAmount(
    annualFee,
    student.discount_percentage,
    student.discount_amount
  );
  
  // Calculer les montants périodiques (9 mois pour l'année scolaire)
  const monthlyFee = effectiveAnnualFee / 9;
  const quarterlyFee = effectiveAnnualFee / 3;
  
  // Frais d'inscription
  const registrationFee = student.registration_fee || 0;
  const hasRegistrationFee = registrationFee > 0;
  const isRegistrationPaid = student.registration_fee_paid || false;

  const getPaymentStatus = () => {
    if (remaining === 0 && totalPaid > 0) {
      return { label: 'Payé', variant: 'default' as const, icon: CheckCircle, color: 'text-green-600' };
    } else if (totalPaid > 0 && remaining > 0) {
      return { label: 'Partiel', variant: 'secondary' as const, icon: Clock, color: 'text-orange-600' };
    } else {
      return { label: 'Non payé', variant: 'destructive' as const, icon: AlertCircle, color: 'text-red-600' };
    }
  };

  const status = getPaymentStatus();
  const StatusIcon = status.icon;

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-2 sm:pb-3">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <StudentAvatar
              photoUrl={student.photo_url}
              firstName={student.first_name}
              lastName={student.last_name}
              size="md"
              className="shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap mb-1">
                <CardTitle className="text-sm sm:text-base">
                  {student.first_name} {student.last_name}
                </CardTitle>
                {discountApplied > 0 && (
                  <Badge variant="outline" className="text-[9px] sm:text-[10px] py-0 px-1.5">
                    <Percent className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />
                    {student.discount_percentage ? `${student.discount_percentage}%` : `${student.discount_amount?.toLocaleString()} FCFA`}
                  </Badge>
                )}
                {student.is_family_member && (
                  <Badge variant="secondary" className="text-[9px] sm:text-[10px] py-0 px-1.5">
                    <Users className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />
                    {student.family_name}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-muted-foreground">
                  <span>{student.student_code}</span>
                  {student.classes && (
                    <>
                      <span>•</span>
                      <span>{student.classes.name}</span>
                    </>
                  )}
                </div>
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
          <Badge variant={status.variant} className="flex items-center gap-1 self-start sm:self-auto text-xs">
            <StatusIcon className="w-3 h-3" />
            {status.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-2.5 sm:space-y-3">
        {/* Frais d'inscription */}
        {hasRegistrationFee && (
          <div className="bg-muted/50 rounded-lg p-2 sm:p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-[10px] sm:text-xs font-medium">Frais d'inscription</p>
                  <p className="text-xs sm:text-sm font-semibold">{registrationFee.toLocaleString('fr-FR')} FCFA</p>
                </div>
              </div>
              {isRegistrationPaid ? (
                <Badge variant="default" className="text-[9px] sm:text-[10px]">
                  <CheckCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />
                  Payé
                </Badge>
              ) : (
                <Badge variant="destructive" className="text-[9px] sm:text-[10px]">
                  <AlertCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />
                  Non payé
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Frais périodiques */}
        <div className="bg-muted/50 rounded-lg p-2 sm:p-3 space-y-1 sm:space-y-1.5">
          <p className="text-[10px] sm:text-xs font-medium text-muted-foreground mb-1 sm:mb-2">Frais de scolarité (9 mois):</p>
          <div className="flex justify-between text-[10px] sm:text-xs">
            <span className="text-muted-foreground">Mensuel:</span>
            <span className="font-medium">{Math.round(monthlyFee).toLocaleString('fr-FR')} FCFA</span>
          </div>
          <div className="flex justify-between text-[10px] sm:text-xs">
            <span className="text-muted-foreground">Trimestriel:</span>
            <span className="font-medium">{Math.round(quarterlyFee).toLocaleString('fr-FR')} FCFA</span>
          </div>
          <div className="flex justify-between text-[10px] sm:text-xs">
            <span className="text-muted-foreground">Annuel:</span>
            <span className="font-medium">{Math.round(effectiveAnnualFee).toLocaleString('fr-FR')} FCFA</span>
          </div>
          {discountApplied > 0 && (
            <div className="flex justify-between text-[10px] sm:text-xs pt-1 border-t mt-1">
              <span className="text-green-600">Remise accordée:</span>
              <span className="font-medium text-green-600">-{Math.round(discountApplied).toLocaleString('fr-FR')} FCFA</span>
            </div>
          )}
        </div>

        {/* Progression du paiement */}
        <div className="space-y-1.5 sm:space-y-2">
          <div className="flex justify-between text-xs sm:text-sm">
            <span className="text-muted-foreground">Montant annuel:</span>
            <span className="font-medium">{totalDue.toLocaleString('fr-FR')} FCFA</span>
          </div>
          <div className="flex justify-between text-xs sm:text-sm">
            <span className="text-muted-foreground">Montant payé:</span>
            <span className="font-medium text-green-600">{totalPaid.toLocaleString('fr-FR')} FCFA</span>
          </div>
          <div className="flex justify-between text-xs sm:text-sm border-t pt-1.5 sm:pt-2">
            <span className="text-muted-foreground font-medium">Reste à payer:</span>
            <span className={`font-bold ${status.color}`}>
              {remaining.toLocaleString('fr-FR')} FCFA
            </span>
          </div>
        </div>

        {student.last_payment_date && (
          <p className="text-[10px] sm:text-xs text-muted-foreground">
            Dernier: {new Date(student.last_payment_date).toLocaleDateString('fr-FR')}
          </p>
        )}

        <div className="flex gap-2">
          <Button onClick={onAddPayment} className="flex-1" size="sm">
            <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
            <span className="text-xs sm:text-sm">Ajouter</span>
          </Button>
          <Button onClick={() => setIsHistoryOpen(true)} variant="outline" className="flex-1" size="sm">
            <History className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
            <span className="text-xs sm:text-sm">Historique</span>
          </Button>
        </div>
      </CardContent>

      <EditDiscountDialog
        open={isEditDiscountOpen}
        onOpenChange={setIsEditDiscountOpen}
        student={student}
      />

      <PaymentHistoryModal
        open={isHistoryOpen}
        onOpenChange={setIsHistoryOpen}
        studentId={student.id}
        studentName={`${student.first_name} ${student.last_name}`}
      />
    </Card>
  );
};
