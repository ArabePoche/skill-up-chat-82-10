/**
 * Dialog pour ajouter une transaction
 */
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Settings2 } from 'lucide-react';
import { useAddTransaction } from '../hooks/useAccounting';
import { useTransactionCategories } from '../hooks/useTransactionCategories';
import { ManageCategoriesDialog } from './ManageCategoriesDialog';

interface AddTransactionDialogProps {
  schoolId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface TransactionForm {
  type: 'income' | 'expense';
  category: string;
  amount: number;
  transaction_date: string;
  description?: string;
  reference_number?: string;
  payment_method?: string;
}

const PAYMENT_METHODS = [
  'Espèces',
  'Chèque',
  'Virement bancaire',
  'Mobile Money',
  'Carte bancaire',
];

export const AddTransactionDialog: React.FC<AddTransactionDialogProps> = ({
  schoolId,
  open,
  onOpenChange,
}) => {
  const [showManageCategories, setShowManageCategories] = useState(false);
  
  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<TransactionForm>({
    defaultValues: {
      type: 'income',
      transaction_date: new Date().toISOString().split('T')[0],
      payment_method: 'Espèces',
    },
  });

  const addTransaction = useAddTransaction();
  const { data: categoriesData } = useTransactionCategories(schoolId);
  const transactionType = watch('type');

  const onSubmit = async (data: TransactionForm) => {
    if (!schoolId) return;

    await addTransaction.mutateAsync({
      school_id: schoolId,
      ...data,
    });

    reset();
    onOpenChange(false);
  };

  const categories = transactionType === 'income' 
    ? (categoriesData?.income || []) 
    : (categoriesData?.expense || []);

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Nouvelle transaction</span>
            <Button 
              type="button" 
              variant="ghost" 
              size="sm"
              onClick={() => setShowManageCategories(true)}
            >
              <Settings2 className="h-4 w-4 mr-1" />
              Catégories
            </Button>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="type">Type de transaction *</Label>
              <Select
                value={transactionType}
                onValueChange={(value: 'income' | 'expense') => setValue('type', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Revenu</SelectItem>
                  <SelectItem value="expense">Dépense</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Catégorie *</Label>
              <Select
                onValueChange={(value) => setValue('category', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une catégorie" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category && (
                <p className="text-sm text-destructive">Catégorie requise</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Montant (FCFA) *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                {...register('amount', { 
                  required: 'Montant requis',
                  min: { value: 0, message: 'Le montant doit être positif' }
                })}
              />
              {errors.amount && (
                <p className="text-sm text-destructive">{errors.amount.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="transaction_date">Date *</Label>
              <Input
                id="transaction_date"
                type="date"
                {...register('transaction_date', { required: 'Date requise' })}
              />
              {errors.transaction_date && (
                <p className="text-sm text-destructive">{errors.transaction_date.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment_method">Mode de paiement</Label>
              <Select
                onValueChange={(value) => setValue('payment_method', value)}
                defaultValue="Espèces"
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((method) => (
                    <SelectItem key={method} value={method}>
                      {method}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reference_number">Numéro de référence</Label>
              <Input
                id="reference_number"
                placeholder="REF-001, CHQ-123..."
                {...register('reference_number')}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Détails de la transaction..."
              rows={3}
              {...register('description')}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={addTransaction.isPending}>
              {addTransaction.isPending ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
    
    <ManageCategoriesDialog
      schoolId={schoolId}
      open={showManageCategories}
      onOpenChange={setShowManageCategories}
    />
    </>
  );
};
