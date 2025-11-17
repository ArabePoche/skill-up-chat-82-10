/**
 * Dialog pour ajouter un paiement familial
 */
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useAddFamilyPayment, useFamiliesWithPayments, calculateDiscountedAmount, type FamilyWithStudents } from '../hooks/useFamilyPayments';
import { Users, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';

interface FamilyPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolId: string;
  selectedFamily?: FamilyWithStudents;
  onSuccess: () => void;
}

export const FamilyPaymentDialog: React.FC<FamilyPaymentDialogProps> = ({
  open,
  onOpenChange,
  schoolId,
  selectedFamily,
  onSuccess,
}) => {
  const [familyId, setFamilyId] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [selectedStudents, setSelectedStudents] = useState<Record<string, boolean>>({});
  const [studentAmounts, setStudentAmounts] = useState<Record<string, string>>({});

  const { data: families } = useFamiliesWithPayments(schoolId);
  const addFamilyPayment = useAddFamilyPayment();

  const currentFamily = selectedFamily || families?.find(f => f.family_id === familyId);

  useEffect(() => {
    if (selectedFamily) {
      setFamilyId(selectedFamily.family_id);
      // Sélectionner tous les élèves par défaut
      const initialSelection: Record<string, boolean> = {};
      selectedFamily.students.forEach(student => {
        initialSelection[student.id] = true;
      });
      setSelectedStudents(initialSelection);
    }
  }, [selectedFamily]);

  // Calculer la répartition intelligente du paiement selon les frais de chaque élève
  useEffect(() => {
    if (!currentFamily || !totalAmount) return;

    const amount = parseFloat(totalAmount);
    if (isNaN(amount) || amount <= 0) return;

    const selected = currentFamily.students.filter(s => selectedStudents[s.id]);
    if (selected.length === 0) return;

    // Calculer les frais effectifs après remises pour chaque élève
    const studentsWithEffectiveFees = selected.map(student => {
      const { finalAmount } = calculateDiscountedAmount(
        student.annual_fee,
        student.discount_percentage,
        student.discount_amount
      );
      return {
        ...student,
        effectiveFee: finalAmount,
      };
    });

    // Calculer la somme totale des frais effectifs
    const totalEffectiveFees = studentsWithEffectiveFees.reduce((sum, s) => sum + s.effectiveFee, 0);
    
    if (totalEffectiveFees === 0) {
      // Répartition égale si pas de frais définis
      const equalAmount = (amount / selected.length).toFixed(2);
      const newAmounts: Record<string, string> = {};
      selected.forEach(student => {
        newAmounts[student.id] = equalAmount;
      });
      setStudentAmounts(newAmounts);
    } else {
      // Répartition proportionnelle selon les frais effectifs de chaque élève
      const newAmounts: Record<string, string> = {};
      studentsWithEffectiveFees.forEach(student => {
        const proportion = student.effectiveFee / totalEffectiveFees;
        const studentAmount = Math.min(amount * proportion, student.remaining_amount);
        newAmounts[student.id] = studentAmount.toFixed(2);
      });
      setStudentAmounts(newAmounts);
    }
  }, [totalAmount, selectedStudents, currentFamily]);

  const handleToggleStudent = (studentId: string) => {
    setSelectedStudents(prev => ({
      ...prev,
      [studentId]: !prev[studentId],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentFamily || !totalAmount) return;

    const selected = currentFamily.students.filter(s => selectedStudents[s.id]);
    if (selected.length === 0) {
      toast.error('Veuillez sélectionner au moins un élève');
      return;
    }

    const students = selected.map(student => ({
      student_id: student.id,
      amount: parseFloat(studentAmounts[student.id] || '0'),
    }));

    const totalDistributed = students.reduce((sum, s) => sum + s.amount, 0);
    const totalPaid = parseFloat(totalAmount);

    if (Math.abs(totalDistributed - totalPaid) > 0.01) {
      toast.error('La somme des montants répartis ne correspond pas au montant total');
      return;
    }

    await addFamilyPayment.mutateAsync({
      school_id: schoolId,
      family_id: currentFamily.family_id,
      students,
      payment_method: paymentMethod,
      payment_date: paymentDate,
      notes: notes.trim() || undefined,
      reference_number: referenceNumber.trim() || undefined,
    });

    // Reset form
    setFamilyId('');
    setTotalAmount('');
    setPaymentMethod('cash');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setNotes('');
    setReferenceNumber('');
    setSelectedStudents({});
    setStudentAmounts({});
    onSuccess();
    onOpenChange(false);
  };

  const totalDistributed = currentFamily?.students
    .filter(s => selectedStudents[s.id])
    .reduce((sum, s) => sum + parseFloat(studentAmounts[s.id] || '0'), 0) || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Paiement familial
          </DialogTitle>
          <DialogDescription>
            Enregistrez un paiement pour plusieurs élèves d'une même famille
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!selectedFamily && (
            <div className="space-y-2">
              <Label htmlFor="family">Famille *</Label>
              <Select value={familyId} onValueChange={setFamilyId} required>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une famille" />
                </SelectTrigger>
                <SelectContent>
                  {families?.map((family) => (
                    <SelectItem key={family.family_id} value={family.family_id}>
                      {family.family_name} ({family.students.length} élève{family.students.length > 1 ? 's' : ''})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {currentFamily && (
            <>
              <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Famille: {currentFamily.family_name}</span>
                  <span className="text-sm text-muted-foreground">
                    {currentFamily.students.length} élève{currentFamily.students.length > 1 ? 's' : ''}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Total dû</p>
                    <p className="font-medium">{currentFamily.total_family_due.toLocaleString('fr-FR')} FCFA</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Total payé</p>
                    <p className="font-medium text-green-600">{currentFamily.total_family_paid.toLocaleString('fr-FR')} FCFA</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Reste</p>
                    <p className="font-medium text-orange-600">{currentFamily.total_family_remaining.toLocaleString('fr-FR')} FCFA</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Montant total du paiement (FCFA) *</Label>
                <Input
                  id="amount"
                  type="number"
                  min="0"
                  step="1"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  placeholder="Ex: 100000"
                  required
                />
              </div>

              <div className="space-y-3">
                <Label>Élèves concernés *</Label>
                <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-3">
                  {currentFamily.students.map((student) => (
                    <div key={student.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                      <Checkbox
                        checked={selectedStudents[student.id] || false}
                        onCheckedChange={() => handleToggleStudent(student.id)}
                      />
                      <div className="flex-1 space-y-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{student.first_name} {student.last_name}</p>
                            <p className="text-xs text-muted-foreground">{student.student_code}</p>
                            {student.class_name && (
                              <p className="text-xs text-muted-foreground">Classe: {student.class_name}</p>
                            )}
                          </div>
                          <div className="text-right text-sm">
                            <p className="text-muted-foreground">Reste</p>
                            <p className="font-medium text-orange-600">
                              {student.remaining_amount.toLocaleString('fr-FR')} FCFA
                            </p>
                          </div>
                        </div>
                        {selectedStudents[student.id] && (
                          <div className="mt-2">
                            <Label htmlFor={`amount-${student.id}`} className="text-xs">
                              Montant pour cet élève
                            </Label>
                            <Input
                              id={`amount-${student.id}`}
                              type="number"
                              min="0"
                              step="1"
                              value={studentAmounts[student.id] || ''}
                              onChange={(e) => setStudentAmounts(prev => ({
                                ...prev,
                                [student.id]: e.target.value,
                              }))}
                              className="mt-1"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {totalAmount && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Répartition: {totalDistributed.toLocaleString('fr-FR')} FCFA / {parseFloat(totalAmount).toLocaleString('fr-FR')} FCFA
                    {Math.abs(totalDistributed - parseFloat(totalAmount)) > 0.01 && (
                      <span className="text-destructive ml-2">
                        (Différence: {(parseFloat(totalAmount) - totalDistributed).toLocaleString('fr-FR')} FCFA)
                      </span>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="paymentMethod">Mode de paiement *</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod} required>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Espèces</SelectItem>
                      <SelectItem value="mobile_money">Mobile Money</SelectItem>
                      <SelectItem value="bank_transfer">Virement bancaire</SelectItem>
                      <SelectItem value="check">Chèque</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="paymentDate">Date du paiement *</Label>
                  <Input
                    id="paymentDate"
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="referenceNumber">Numéro de référence</Label>
                <Input
                  id="referenceNumber"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder="Ex: REF-2024-001"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Informations supplémentaires..."
                  rows={3}
                />
              </div>
            </>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={addFamilyPayment.isPending || !currentFamily}>
              {addFamilyPayment.isPending ? 'Enregistrement...' : 'Enregistrer le paiement'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
