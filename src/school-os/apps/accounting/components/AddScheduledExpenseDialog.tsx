/**
 * Dialog pour ajouter une dépense programmée (mensuelle ou annuelle)
 */
import React from 'react';
import { useForm } from 'react-hook-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAddScheduledExpense } from '../hooks/useScheduledExpenses';
import { useTransactionCategories } from '../hooks/useTransactionCategories';

interface Props {
  schoolId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FormData {
  category: string;
  amount: number;
  description?: string;
  payment_method?: string;
  recurrence: 'monthly' | 'yearly';
  next_due_date: string;
}

const PAYMENT_METHODS = ['Espèces', 'Chèque', 'Virement bancaire', 'Mobile Money', 'Carte bancaire'];

export const AddScheduledExpenseDialog: React.FC<Props> = ({ schoolId, open, onOpenChange }) => {
  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      recurrence: 'monthly',
      next_due_date: new Date().toISOString().split('T')[0],
      payment_method: 'Espèces',
    },
  });

  const addExpense = useAddScheduledExpense();
  const { data: categoriesData } = useTransactionCategories(schoolId);
  const categories = categoriesData?.expense || [];

  const onSubmit = async (data: FormData) => {
    if (!schoolId) return;
    await addExpense.mutateAsync({
      school_id: schoolId,
      ...data,
    });
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Programmer une dépense</DialogTitle>
          <DialogDescription>
            Cette dépense sera automatiquement proposée à la date prévue
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Catégorie *</Label>
              <Select onValueChange={(v) => setValue('category', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category && <p className="text-sm text-destructive">Catégorie requise</p>}
            </div>

            <div className="space-y-2">
              <Label>Montant (FCFA) *</Label>
              <Input
                type="number"
                step="1"
                {...register('amount', { required: true, min: 1 })}
              />
              {errors.amount && <p className="text-sm text-destructive">Montant requis</p>}
            </div>

            <div className="space-y-2">
              <Label>Récurrence *</Label>
              <Select
                value={watch('recurrence')}
                onValueChange={(v: 'monthly' | 'yearly') => setValue('recurrence', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Mensuelle</SelectItem>
                  <SelectItem value="yearly">Annuelle</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Prochaine date *</Label>
              <Input
                type="date"
                {...register('next_due_date', { required: true })}
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label>Mode de paiement</Label>
              <Select
                defaultValue="Espèces"
                onValueChange={(v) => setValue('payment_method', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              placeholder="Détails de la dépense..."
              rows={2}
              {...register('description')}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button type="submit" disabled={addExpense.isPending}>
              {addExpense.isPending ? 'Enregistrement...' : 'Programmer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
