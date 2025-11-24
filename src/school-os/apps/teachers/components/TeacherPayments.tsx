/**
 * Composant de gestion des paiements des enseignants
 */
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Euro, Calendar, FileText } from 'lucide-react';
import { useSchoolTeachers } from '@/school/hooks/useSchoolTeachers';
import { useTeacherPayments, useCreateTeacherPayment } from '../hooks/useTeacherPayments';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface TeacherPaymentsProps {
  schoolId?: string;
}

export const TeacherPayments: React.FC<TeacherPaymentsProps> = ({ schoolId }) => {
  const [open, setOpen] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer' | 'check'>('transfer');
  const [notes, setNotes] = useState('');

  const { data: teachers, isLoading: loadingTeachers } = useSchoolTeachers(schoolId);
  const { data: payments, isLoading: loadingPayments } = useTeacherPayments(schoolId);
  const createPayment = useCreateTeacherPayment();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeacherId || !amount || !schoolId) return;

    await createPayment.mutateAsync({
      school_id: schoolId,
      teacher_id: selectedTeacherId,
      amount: parseFloat(amount),
      payment_date: paymentDate,
      payment_method: paymentMethod,
      notes: notes || undefined,
    });

    setOpen(false);
    setSelectedTeacherId('');
    setAmount('');
    setPaymentDate(format(new Date(), 'yyyy-MM-dd'));
    setPaymentMethod('transfer');
    setNotes('');
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels = {
      cash: 'Espèces',
      transfer: 'Virement',
      check: 'Chèque',
    };
    return labels[method as keyof typeof labels] || method;
  };

  const getPaymentMethodColor = (method: string) => {
    const colors = {
      cash: 'bg-green-100 text-green-800',
      transfer: 'bg-blue-100 text-blue-800',
      check: 'bg-purple-100 text-purple-800',
    };
    return colors[method as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  if (loadingTeachers || loadingPayments) {
    return <div className="p-6">Chargement...</div>;
  }

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Paiements des enseignants</h3>
          <p className="text-sm text-muted-foreground">
            Gérez les paiements et salaires
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nouveau paiement
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Enregistrer un paiement</DialogTitle>
              <DialogDescription>
                Ajoutez un nouveau paiement pour un enseignant
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="teacher">Enseignant *</Label>
                <Select value={selectedTeacherId} onValueChange={setSelectedTeacherId} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un enseignant" />
                  </SelectTrigger>
                  <SelectContent>
                    {teachers?.map((teacher) => (
                      <SelectItem key={teacher.id} value={teacher.id}>
                        {teacher.profiles?.first_name} {teacher.profiles?.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Montant (€) *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">Date de paiement *</Label>
                <Input
                  id="date"
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="method">Méthode de paiement *</Label>
                <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as any)} required>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="transfer">Virement</SelectItem>
                    <SelectItem value="cash">Espèces</SelectItem>
                    <SelectItem value="check">Chèque</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Notes ou commentaires..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={createPayment.isPending}>
                  {createPayment.isPending ? 'Enregistrement...' : 'Enregistrer'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {payments?.map((payment) => (
          <Card key={payment.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">
                      {payment.school_teachers?.profiles?.first_name}{' '}
                      {payment.school_teachers?.profiles?.last_name}
                    </span>
                    <Badge className={getPaymentMethodColor(payment.payment_method)}>
                      {getPaymentMethodLabel(payment.payment_method)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {format(new Date(payment.payment_date), 'dd MMM yyyy', { locale: fr })}
                    </div>
                    <div className="flex items-center gap-1 font-semibold text-foreground">
                      <Euro className="w-4 h-4" />
                      {payment.amount.toFixed(2)} €
                    </div>
                  </div>
                  {payment.notes && (
                    <div className="flex items-start gap-1 text-sm">
                      <FileText className="w-4 h-4 mt-0.5 text-muted-foreground" />
                      <span className="text-muted-foreground">{payment.notes}</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {payments?.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              Aucun paiement enregistré
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
