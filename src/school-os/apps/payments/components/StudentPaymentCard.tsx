// Carte affichant les informations de paiement d'un élève
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, User, AlertCircle, CheckCircle, Clock } from 'lucide-react';

interface StudentPaymentCardProps {
  student: any;
  onAddPayment: () => void;
}

export const StudentPaymentCard: React.FC<StudentPaymentCardProps> = ({
  student,
  onAddPayment,
}) => {
  const totalDue = student.total_amount_due || 0;
  const totalPaid = student.total_amount_paid || 0;
  const remaining = student.remaining_amount || 0;

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
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">
                {student.first_name} {student.last_name}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {student.student_code}
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
            <span className="text-muted-foreground">Montant dû:</span>
            <span className="font-medium">{totalDue.toLocaleString('fr-FR')} FCFA</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Montant payé:</span>
            <span className="font-medium text-green-600">{totalPaid.toLocaleString('fr-FR')} FCFA</span>
          </div>
          <div className="flex justify-between text-sm border-t pt-2">
            <span className="text-muted-foreground font-medium">Reste à payer:</span>
            <span className={`font-bold ${status.color}`}>
              {remaining.toLocaleString('fr-FR')} FCFA
            </span>
          </div>
        </div>

        {student.last_payment_date && (
          <p className="text-xs text-muted-foreground">
            Dernier paiement: {new Date(student.last_payment_date).toLocaleDateString('fr-FR')}
          </p>
        )}

        <Button onClick={onAddPayment} className="w-full" size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Ajouter un paiement
        </Button>
      </CardContent>
    </Card>
  );
};
