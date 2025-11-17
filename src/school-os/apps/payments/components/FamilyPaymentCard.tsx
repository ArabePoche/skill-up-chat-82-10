/**
 * Carte affichant les informations de paiement d'une famille
 */
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Users, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { type FamilyWithStudents } from '../hooks/useFamilyPayments';

interface FamilyPaymentCardProps {
  family: FamilyWithStudents;
  onAddPayment: () => void;
}

export const FamilyPaymentCard: React.FC<FamilyPaymentCardProps> = ({
  family,
  onAddPayment,
}) => {
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
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">
                {family.family_name}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {family.students.length} élève{family.students.length > 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <Badge variant={status.variant} className="flex items-center gap-1">
            <StatusIcon className="w-3 h-3" />
            {status.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Montant dû total:</span>
            <span className="font-medium">{family.total_family_due.toLocaleString('fr-FR')} FCFA</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Montant payé total:</span>
            <span className="font-medium text-green-600">{family.total_family_paid.toLocaleString('fr-FR')} FCFA</span>
          </div>
          <div className="flex justify-between text-sm border-t pt-2">
            <span className="text-muted-foreground font-medium">Reste à payer:</span>
            <span className={`font-bold ${status.color}`}>
              {family.total_family_remaining.toLocaleString('fr-FR')} FCFA
            </span>
          </div>
        </div>

        <div className="border-t pt-3">
          <p className="text-xs text-muted-foreground mb-2">Élèves:</p>
          <div className="space-y-1">
            {family.students.map((student) => (
              <div key={student.id} className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">
                  {student.first_name} {student.last_name}
                  {(student.discount_percentage || student.discount_amount) && (
                    <Badge variant="outline" className="ml-2 text-[10px] py-0">
                      {student.discount_percentage ? `${student.discount_percentage}%` : `${student.discount_amount?.toLocaleString()} FCFA`}
                    </Badge>
                  )}
                </span>
                <span className={student.remaining_amount > 0 ? 'text-orange-600 font-medium' : 'text-green-600'}>
                  {student.remaining_amount > 0 
                    ? `${student.remaining_amount.toLocaleString('fr-FR')} FCFA` 
                    : '✓'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <Button onClick={onAddPayment} className="w-full" size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Paiement familial
        </Button>
      </CardContent>
    </Card>
  );
};
