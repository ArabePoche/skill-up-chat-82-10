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
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
  const updatePayment = useUpdatePayment();
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
    defaultValues: {
      amount: payment.amount,
      payment_method: payment.payment_method,
      payment_date: new Date(payment.payment_date).toISOString().split('T')[0],
      notes: payment.notes || '',
      reference_number: payment.reference_number || '',
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
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('payments.editPayment')}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">{t('payments.amount')} (FCFA) *</Label>
            <Input
              id="amount"
              type="number"
              {...register('amount', { required: true, min: 0 })}
            />
            {errors.amount && (
              <p className="text-sm text-destructive">{t('payments.amountRequired')}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment_date">{t('payments.paymentDateReq')}</Label>
            <Input
              id="payment_date"
              type="date"
              {...register('payment_date', { required: true })}
            />
            {errors.payment_date && (
              <p className="text-sm text-destructive">{t('payments.dateRequired')}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment_method">{t('payments.paymentMethodReq')}</Label>
            <Select
              value={watch('payment_method')}
              onValueChange={(value) => setValue('payment_method', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('payments.selectMethod')} />
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
            <Label htmlFor="reference_number">{t('payments.referenceNumber')}</Label>
            <Input
              id="reference_number"
              {...register('reference_number')}
              placeholder="Ex: CHQ123456"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">{t('payments.paymentNotes')}</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              placeholder={t('payments.remarksPlaceholder')}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('payments.cancel')}
            </Button>
            <Button type="submit" disabled={updatePayment.isPending}>
              {updatePayment.isPending ? t('payments.saving') : t('payments.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
