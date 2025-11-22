// Dialog pour modifier un paiement existant
import React from 'react';
import { useForm } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { useUpdatePayment } from '../hooks/usePayments';

interface EditPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: any;
}

export const EditPaymentDialog: React.FC<EditPaymentDialogProps> = ({
  open,
  onOpenChange,
  payment,
}) => {
  const updatePayment = useUpdatePayment();
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
    defaultValues: {
      amount: payment.amount,
      payment_method: payment.payment_method,
      payment_type: payment.payment_type,
      payment_date: new Date(payment.payment_date).toISOString().split('T')[0],
      notes: payment.notes || '',
      reference_number: payment.reference_number || '',
      received_by: payment.received_by || '',
    },
  });

  const onSubmit = async (data: any) => {
    await updatePayment.mutateAsync({
      paymentId: payment.id,
      updates: data,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Modifier le paiement</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Montant (FCFA) *</Label>
            <Input
              id="amount"
              type="number"
              {...register('amount', { required: true, min: 0 })}
            />
            {errors.amount && (
              <p className="text-sm text-destructive">Le montant est requis</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment_date">Date de paiement *</Label>
            <Input
              id="payment_date"
              type="date"
              {...register('payment_date', { required: true })}
            />
            {errors.payment_date && (
              <p className="text-sm text-destructive">La date est requise</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment_type">Type de paiement *</Label>
            <Select
              value={watch('payment_type')}
              onValueChange={(value) => setValue('payment_type', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Mensuel</SelectItem>
                <SelectItem value="quarterly">Trimestriel</SelectItem>
                <SelectItem value="annual">Annuel</SelectItem>
                <SelectItem value="registration">Inscription</SelectItem>
                <SelectItem value="other">Autre</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment_method">Méthode de paiement *</Label>
            <Select
              value={watch('payment_method')}
              onValueChange={(value) => setValue('payment_method', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner une méthode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Espèces</SelectItem>
                <SelectItem value="check">Chèque</SelectItem>
                <SelectItem value="bank_transfer">Virement bancaire</SelectItem>
                <SelectItem value="mobile_money">Mobile Money</SelectItem>
                <SelectItem value="card">Carte bancaire</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reference_number">Numéro de référence</Label>
            <Input
              id="reference_number"
              {...register('reference_number')}
              placeholder="Ex: CHQ123456"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="received_by">Reçu par</Label>
            <Input
              id="received_by"
              {...register('received_by')}
              placeholder="Nom de la personne"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              placeholder="Remarques ou notes..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={updatePayment.isPending}>
              {updatePayment.isPending ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
