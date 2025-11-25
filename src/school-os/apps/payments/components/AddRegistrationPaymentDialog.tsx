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
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { GraduationCap, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
  const [studentId, setStudentId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: students } = useSchoolStudents(schoolId);

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
      toast.error('Le montant doit être supérieur à 0');
      return;
    }

    if (paymentAmount > registrationFeeRemaining) {
      toast.error('Le montant dépasse le reste à payer des frais d\'inscription');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Insérer le paiement dans school_students_payment
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

      // 2. Mettre à jour school_student_payment_progress.registration_fee_paid_amount
      const newRegistrationFeePaid = registrationFeePaid + paymentAmount;

      const { error: progressError } = await supabase
        .from('school_student_payment_progress')
        .update({
          registration_fee_paid_amount: newRegistrationFeePaid,
        })
        .eq('student_id', studentId);

      if (progressError) throw progressError;

      toast.success('Paiement de frais d\'inscription enregistré avec succès');

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
      toast.error('Erreur lors de l\'enregistrement du paiement');
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
            Paiement de frais d'inscription
          </DialogTitle>
          <DialogDescription>
            Enregistrez un paiement pour les frais d'inscription d'un élève
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="student">Élève *</Label>
            <Select value={studentId} onValueChange={setStudentId} required disabled={!!selectedStudent}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un élève" />
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
                <span className="font-semibold text-blue-900 dark:text-blue-100">Frais d'inscription</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-blue-700 dark:text-blue-300">Frais d'inscription total :</span>
                <span className="font-semibold text-blue-900 dark:text-blue-100">
                  {registrationFee.toLocaleString('fr-FR')} FCFA
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-blue-700 dark:text-blue-300">Déjà payé :</span>
                <span className="text-green-600 dark:text-green-400 font-medium">
                  {registrationFeePaid.toLocaleString('fr-FR')} FCFA
                </span>
              </div>
              <div className="flex justify-between text-sm border-t border-blue-200 dark:border-blue-800 pt-2">
                <span className="font-medium text-blue-700 dark:text-blue-300">Reste à payer :</span>
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
                Les frais d'inscription ont été entièrement payés pour cet élève.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Montant (FCFA) *</Label>
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
                  ⚠️ Le montant dépasse le reste à payer
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment-date">Date de paiement *</Label>
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
            <Label htmlFor="payment-method">Méthode de paiement *</Label>
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
            <Label htmlFor="reference">Référence / Numéro de transaction</Label>
            <Input
              id="reference"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder="Ex: TXN123456"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes additionnelles sur ce paiement..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting || registrationFeeRemaining <= 0}>
              {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
