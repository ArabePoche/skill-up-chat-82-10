// Dialog pour ajouter un paiement
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAddPayment, useSchoolStudents } from '../hooks/usePayments';
import { useTranslation } from 'react-i18next';

interface AddPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolId: string;
  selectedStudent?: any;
  onSuccess: () => void;
}

export const AddPaymentDialog: React.FC<AddPaymentDialogProps> = ({
  open,
  onOpenChange,
  schoolId,
  selectedStudent,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const [studentId, setStudentId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentType, setPaymentType] = useState('tuition');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');

  const { data: students } = useSchoolStudents(schoolId);
  const addPayment = useAddPayment();

  // Calculer le montant restant avec remise pour l'élève sélectionné
  const selectedStudentData = students?.find(s => s.id === studentId);
  const remainingAmount = selectedStudentData?.remaining_amount || 0;
  const hasDiscount = selectedStudentData?.discount_percentage || selectedStudentData?.discount_amount;

  useEffect(() => {
    if (selectedStudent) {
      setStudentId(selectedStudent.id);
    }
  }, [selectedStudent]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!studentId || !amount) {
      return;
    }

    await addPayment.mutateAsync({
      student_id: studentId,
      school_id: schoolId,
      amount: parseFloat(amount),
      payment_method: paymentMethod,
      payment_type: paymentType,
      payment_date: paymentDate,
      notes: notes.trim() || undefined,
      reference_number: referenceNumber.trim() || undefined,
    });

    // Reset form
    setStudentId(selectedStudent?.id || '');
    setAmount('');
    setPaymentMethod('cash');
    setPaymentType('tuition');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setNotes('');
    setReferenceNumber('');
    onSuccess();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('payments.addPayment')}</DialogTitle>
          <DialogDescription>
            {t('payments.addPaymentDescription')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="student">{t('payments.student')} *</Label>
            <Select value={studentId} onValueChange={setStudentId} required disabled={!!selectedStudent}>
              <SelectTrigger>
                <SelectValue placeholder={t('payments.selectStudent')} />
              </SelectTrigger>
              <SelectContent>
                {students?.map((student) => (
                  <SelectItem key={student.id} value={student.id}>
                    {student.first_name} {student.last_name} - {student.student_code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Afficher les informations de paiement de l'élève sélectionné */}
          {selectedStudentData && (
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('payments.amountDueWithDiscount')} :</span>
                <span className="font-semibold">{selectedStudentData.total_amount_due.toLocaleString('fr-FR')} FCFA</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('payments.alreadyPaid')} :</span>
                <span>{selectedStudentData.total_amount_paid.toLocaleString('fr-FR')} FCFA</span>
              </div>
              <div className="flex justify-between text-sm border-t pt-2">
                <span className="text-muted-foreground font-medium">{t('payments.remainingToPay')} :</span>
                <span className="font-bold text-primary">{remainingAmount.toLocaleString('fr-FR')} FCFA</span>
              </div>
              {hasDiscount && (
                <div className="flex items-center gap-2 text-xs text-green-600 pt-1">
                  <span className="bg-green-100 px-2 py-0.5 rounded">
                    {selectedStudentData.discount_percentage 
                      ? `${t('payments.discount')}: ${selectedStudentData.discount_percentage}%` 
                      : `${t('payments.discount')}: ${selectedStudentData.discount_amount?.toLocaleString('fr-FR')} FCFA`
                    }
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">{t('payments.amount')} (FCFA) *</Label>
              <Input
                id="amount"
                type="number"
                min="0"
                step="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={remainingAmount > 0 ? `Ex: ${remainingAmount.toLocaleString('fr-FR')}` : "Ex: 50000"}
                required
              />
              {remainingAmount > 0 && parseFloat(amount || '0') > remainingAmount && (
                <p className="text-xs text-amber-600">
                  ⚠️ {t('payments.amountExceedsRemaining')}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment-date">{t('payments.paymentDateReq')}</Label>
              <Input
                id="payment-date"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="payment-method">{t('payments.paymentMethodReq')}</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">{t('payments.cash')}</SelectItem>
                  <SelectItem value="bank_transfer">{t('payments.bankTransfer')}</SelectItem>
                  <SelectItem value="check">{t('payments.check')}</SelectItem>
                  <SelectItem value="mobile_money">{t('payments.mobile')}</SelectItem>
                  <SelectItem value="card">{t('payments.card')}</SelectItem>
                  <SelectItem value="other">{t('payments.other')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment-type">{t('payments.paymentTypeReq')}</Label>
              <Select value={paymentType} onValueChange={setPaymentType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tuition">{t('payments.tuition')}</SelectItem>
                  <SelectItem value="registration">{t('payments.registration')}</SelectItem>
                  <SelectItem value="activity">{t('payments.activity')}</SelectItem>
                  <SelectItem value="transport">{t('payments.transport')}</SelectItem>
                  <SelectItem value="canteen">{t('payments.canteen')}</SelectItem>
                  <SelectItem value="other">{t('payments.other')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reference">{t('payments.referenceNumber')}</Label>
            <Input
              id="reference"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder="Ex: TXN123456"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">{t('payments.paymentNotes')}</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('payments.notesPlaceholder')}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('payments.cancel')}
            </Button>
            <Button type="submit" disabled={addPayment.isPending}>
              {addPayment.isPending ? t('payments.saving') : t('payments.save')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
