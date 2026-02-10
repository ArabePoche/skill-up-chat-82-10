/**
 * Carte affichant les informations de paiement d'une famille
 */
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Users, AlertCircle, CheckCircle, Clock, History, GraduationCap } from 'lucide-react';
import { type FamilyWithStudents } from '../hooks/useFamilyPayments';
import { FamilyPaymentHistoryModal } from './FamilyPaymentHistoryModal';

interface FamilyPaymentCardProps {
  family: FamilyWithStudents;
  onAddPayment: () => void;
  onAddRegistrationPayment?: () => void;
  /** Si true, masque les boutons de paiement (ex: pour les parents) */
  hidePaymentActions?: boolean;
}

export const FamilyPaymentCard: React.FC<FamilyPaymentCardProps> = ({
  family,
  onAddPayment,
  onAddRegistrationPayment,
  hidePaymentActions = false,
}) => {
  const [showHistory, setShowHistory] = useState(false);

  // Calculer les totaux des frais d'inscription pour la famille
  const totalRegistrationFee = family.students.reduce((sum, s) => sum + (s.registration_fee || 0), 0);
  const totalRegistrationFeePaid = family.students.reduce((sum, s) => sum + (s.registration_fee_paid_amount || 0), 0);
  const hasAnyRegistrationFee = totalRegistrationFee > 0;
  
  // Déterminer l'état global des frais d'inscription de la famille
  const getRegistrationStatus = () => {
    if (totalRegistrationFeePaid === 0) {
      return { type: 'unpaid', label: 'Non payé', variant: 'destructive' as const };
    } else if (totalRegistrationFeePaid < totalRegistrationFee) {
      return { type: 'partial', label: 'Partiellement payé', variant: 'secondary' as const };
    } else {
      return { type: 'paid', label: 'Payé', variant: 'default' as const };
    }
  };
  
  const registrationStatus = getRegistrationStatus();

  const getPaymentStatus = () => {
    if (family.total_family_remaining === 0 && family.total_family_paid > 0) {
      return { label: 'Payé', variant: 'default' as const, icon: CheckCircle, color: 'text-green-600' };
    } else if (family.total_family_paid > 0 && family.total_family_remaining > 0) {
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
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-sm sm:text-base truncate">
                {family.family_name}
              </CardTitle>
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                {family.students.length} élève{family.students.length > 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <Badge variant={status.variant} className="flex items-center gap-1 shrink-0 text-xs">
            <StatusIcon className="w-3 h-3" />
            {status.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-2.5 sm:space-y-3">
        {/* Frais d'inscription famille - Affiché uniquement si non payé ou partiel */}
        {hasAnyRegistrationFee && registrationStatus.type !== 'paid' && (
          <div className="bg-muted/50 rounded-lg p-2 sm:p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] sm:text-xs font-medium">Frais d'inscription (famille)</p>
              <Badge variant={registrationStatus.variant} className="text-[9px] sm:text-[10px]">
                {registrationStatus.type === 'unpaid' ? (
                  <AlertCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />
                ) : (
                  <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />
                )}
                {registrationStatus.label}
              </Badge>
            </div>
            <div className="text-xs sm:text-sm">
              <span className="font-semibold">{totalRegistrationFee.toLocaleString('fr-FR')} FCFA</span>
              {registrationStatus.type === 'partial' && (
                <div className="text-[9px] sm:text-[10px] text-muted-foreground mt-1">
                  <span className="text-green-600 font-medium">
                    {totalRegistrationFeePaid.toLocaleString('fr-FR')} FCFA payés
                  </span>
                  {' • '}
                  <span className="text-orange-600 font-medium">
                    {(totalRegistrationFee - totalRegistrationFeePaid).toLocaleString('fr-FR')} FCFA restants
                  </span>
                </div>
              )}
            </div>
            {/* Bouton de paiement rapide pour frais d'inscription familial */}
            {onAddRegistrationPayment && registrationStatus.type !== 'paid' && !hidePaymentActions && (
              <Button 
                onClick={onAddRegistrationPayment} 
                variant="outline" 
                size="sm" 
                className="mt-2 w-full"
              >
                <GraduationCap className="w-3 h-3 mr-1.5" />
                <span className="text-xs">Payer frais d'inscription</span>
              </Button>
            )}
          </div>
        )}

        {/* Paiements scolaires uniquement */}
        <div className="space-y-1.5 sm:space-y-2">
          <p className="text-[10px] sm:text-xs font-medium text-muted-foreground">Paiements scolaires :</p>
          <div className="flex justify-between text-xs sm:text-sm">
            <span className="text-muted-foreground">Montant dû:</span>
            <span className="font-medium">{family.total_family_due.toLocaleString('fr-FR')} FCFA</span>
          </div>
          <div className="flex justify-between text-xs sm:text-sm">
            <span className="text-muted-foreground">Payé:</span>
            <span className="font-medium text-green-600">{family.total_family_paid.toLocaleString('fr-FR')} FCFA</span>
          </div>
          <div className="flex justify-between text-xs sm:text-sm border-t pt-1.5 sm:pt-2">
            <span className="text-muted-foreground font-medium">Reste:</span>
            <span className={`font-bold ${status.color}`}>
              {family.total_family_remaining.toLocaleString('fr-FR')} FCFA
            </span>
          </div>
        </div>

        <div className="border-t pt-2 sm:pt-3">
          <p className="text-[10px] sm:text-xs text-muted-foreground mb-1.5 sm:mb-2">Élèves:</p>
          <div className="space-y-1">
            {family.students.map((student) => (
              <div key={student.id} className="flex justify-between items-start gap-2 text-[10px] sm:text-xs">
                <span className="text-muted-foreground flex-1 min-w-0">
                  <span className="block truncate">{student.first_name} {student.last_name}</span>
                  {(student.discount_percentage || student.discount_amount) && (
                    <Badge variant="outline" className="mt-0.5 text-[9px] py-0 px-1">
                      {student.discount_percentage ? `${student.discount_percentage}%` : `${student.discount_amount?.toLocaleString()} FCFA`}
                    </Badge>
                  )}
                </span>
                <span className={`font-medium shrink-0 ${student.remaining_amount > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                  {student.remaining_amount > 0 
                    ? `${student.remaining_amount.toLocaleString('fr-FR')} FCFA` 
                    : '✓'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {!hidePaymentActions && (
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={onAddPayment} className="w-full" size="sm">
              <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
              <span className="text-xs sm:text-sm">Paiement</span>
            </Button>
            <Button onClick={() => setShowHistory(true)} variant="outline" className="w-full" size="sm">
              <History className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
              <span className="text-xs sm:text-sm">Historique</span>
            </Button>
          </div>
        )}
        {hidePaymentActions && (
          <div className="flex justify-end">
            <Button onClick={() => setShowHistory(true)} variant="outline" size="sm">
              <History className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
              <span className="text-xs sm:text-sm">Historique</span>
            </Button>
          </div>
        )}
      </CardContent>

      <FamilyPaymentHistoryModal
        open={showHistory}
        onOpenChange={setShowHistory}
        familyId={family.family_id}
        familyName={family.family_name}
      />
    </Card>
  );
};
