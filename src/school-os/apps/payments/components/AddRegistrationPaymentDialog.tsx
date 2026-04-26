/**
 * Dialog pour payer le frais d'inscription (individuel)
 */
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSchoolStudents } from '../hooks/usePayments';
import { useSchoolYear } from '@/school/context/SchoolYearContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { GraduationCap, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTranslation } from 'react-i18next';

interface AddRegistrationPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolId: string;
  selectedStudent?: any;
  onSuccess: () => void;
}

export const AddRegistrationPaymentDialog: React.FC<AddRegistrationPaymentDialogProps> = ({
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
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { activeSchoolYear } = useSchoolYear();
  const { data: students } = useSchoolStudents(schoolId, activeSchoolYear?.id);

  const selectedStudentData = students?.find(s => s.id === studentId);
  const registrationFee = selectedStudentData?.registration_fee || 0;
  const registrationFeePaid = selectedStudentData?.registration_fee_paid_amount || 0;
  const registrationFeeRemaining = registrationFee - registrationFeePaid;

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

    const paymentAmount = parseFloat(amount);
    if (paymentAmount <= 0) {
      toast.error(t('payments.amountMustBeGreaterThan0'));
      return;
    }

    if (paymentAmount > registrationFeeRemaining) {
      toast.error(t('payments.amountExceedsRegistrationFeeRemaining'));
      return;
    }

    setIsSubmitting(true);

    try {
      // Insérer le paiement - le trigger se charge automatiquement de mettre à jour registration_fee_paid_amount
      const { error: paymentError } = await supabase
        .from('school_students_payment')
        .insert({
          student_id: studentId,
          school_id: schoolId,
          amount: paymentAmount,
          payment_method: paymentMethod,
          payment_type: 'registration',
          payment_date: paymentDate,
          notes: notes.trim() ? `${notes.trim()} (Frais d'inscription)` : 'Frais d\'inscription',
          reference_number: referenceNumber.trim() || undefined,
        });

      if (paymentError) throw paymentError;

      toast.success(t('payments.registrationPaymentSuccess'));

      // Reset form
      setStudentId(selectedStudent?.id || '');
      setAmount('');
      setPaymentMethod('cash');
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setNotes('');
      setReferenceNumber('');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement du paiement:', error);
      toast.error(t('payments.paymentRegistrationError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-primary" />
            {t('payments.registrationFeePayment')}
          </DialogTitle>
          <DialogDescription>
            {t('payments.registrationFeePaymentDescription')}
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

          {selectedStudentData && (
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 rounded-lg p-4 space-y-2 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2 mb-2">
                <GraduationCap className="w-4 h-4 text-blue-600" />
                <span className="font-semibold text-blue-900 dark:text-blue-100">{t('payments.registrationFee')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-blue-700 dark:text-blue-300">{t('payments.totalRegistrationFee')} :</span>
                <span className="font-semibold text-blue-900 dark:text-blue-100">
                  {registrationFee.toLocaleString('fr-FR')} FCFA
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-blue-700 dark:text-blue-300">{t('payments.alreadyPaid')} :</span>
                <span className="text-green-600 dark:text-green-400 font-medium">
                  {registrationFeePaid.toLocaleString('fr-FR')} FCFA
                </span>
              </div>
              <div className="flex justify-between text-sm border-t border-blue-200 dark:border-blue-800 pt-2">
                <span className="font-medium text-blue-700 dark:text-blue-300">{t('payments.remainingToPay')} :</span>
                <span className="font-bold text-orange-600 dark:text-orange-400">
                  {registrationFeeRemaining.toLocaleString('fr-FR')} FCFA
                </span>
              </div>
            </div>
          )}

          {registrationFeeRemaining <= 0 && selectedStudentData && (
            <Alert className="bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800">
              <AlertCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700 dark:text-green-300">
                {t('payments.registrationFeeFullyPaid')}
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">{t('payments.amount')} (FCFA) *</Label>
              <Input
                id="amount"
                type="number"
                min="0"
                step="1"
                max={registrationFeeRemaining}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={registrationFeeRemaining > 0 ? `Max: ${registrationFeeRemaining.toLocaleString('fr-FR')}` : "0"}
                required
                disabled={registrationFeeRemaining <= 0}
              />
              {registrationFeeRemaining > 0 && parseFloat(amount || '0') > registrationFeeRemaining && (
                <p className="text-xs text-destructive">
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

          <div className="space-y-2">
            <Label htmlFor="payment-method">{t('payments.paymentMethodReq')}</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Espèces</SelectItem>
                <SelectItem value="bank_transfer">Virement bancaire</SelectItem>
                <SelectItem value="check">Chèque</SelectItem>
                <SelectItem value="mobile_money">Mobile Money</SelectItem>
                <SelectItem value="card">Carte bancaire</SelectItem>
                <SelectItem value="other">Autre</SelectItem>
              </SelectContent>
            </Select>
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
            <Button type="submit" disabled={isSubmitting || registrationFeeRemaining <= 0}>
              {isSubmitting ? t('payments.saving') : t('payments.save')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
