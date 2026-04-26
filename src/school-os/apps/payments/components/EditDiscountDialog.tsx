// Dialog pour modifier les remises d'un élève
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useUpdateStudentDiscount } from '../hooks/usePayments';
import { Percent } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface EditDiscountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: any;
  onSuccess?: () => void;
}

export const EditDiscountDialog: React.FC<EditDiscountDialogProps> = ({
  open,
  onOpenChange,
  student,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const [discountType, setDiscountType] = useState<'none' | 'percentage' | 'amount'>('none');
  const [discountValue, setDiscountValue] = useState('');
  
  const updateDiscount = useUpdateStudentDiscount();

  useEffect(() => {
    if (student) {
      if (student.discount_percentage) {
        setDiscountType('percentage');
        setDiscountValue(student.discount_percentage.toString());
      } else if (student.discount_amount) {
        setDiscountType('amount');
        setDiscountValue(student.discount_amount.toString());
      } else {
        setDiscountType('none');
        setDiscountValue('');
      }
    }
  }, [student]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const updateData: any = {
      studentId: student.id,
      discountPercentage: null,
      discountAmount: null,
    };

    if (discountType === 'percentage' && discountValue) {
      updateData.discountPercentage = parseFloat(discountValue);
    } else if (discountType === 'amount' && discountValue) {
      updateData.discountAmount = parseFloat(discountValue);
    }

    await updateDiscount.mutateAsync(updateData);
    
    onSuccess?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Percent className="w-5 h-5" />
            {t('payments.editDiscount')}
          </DialogTitle>
          <DialogDescription>
            {t('payments.editDiscountDescription', { firstName: student?.first_name, lastName: student?.last_name })}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            <Label>{t('payments.discountType')}</Label>
            <RadioGroup value={discountType} onValueChange={(value: any) => {
              setDiscountType(value);
              if (value === 'none') setDiscountValue('');
            }}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="none" id="none" />
                <Label htmlFor="none" className="font-normal cursor-pointer">
                  {t('payments.noDiscount')}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="percentage" id="percentage" />
                <Label htmlFor="percentage" className="font-normal cursor-pointer">
                  {t('payments.percentageDiscount')}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="amount" id="amount" />
                <Label htmlFor="amount" className="font-normal cursor-pointer">
                  {t('payments.fixedAmountDiscount')}
                </Label>
              </div>
            </RadioGroup>
          </div>

          {discountType === 'percentage' && (
            <div className="space-y-2">
              <Label htmlFor="percentage-value">{t('payments.discountPercentageReq')}</Label>
              <div className="relative">
                <Input
                  id="percentage-value"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  placeholder="Ex: 10"
                  required
                  className="pr-8"
                />
                <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground">
                {t('payments.between0And100')}
              </p>
            </div>
          )}

          {discountType === 'amount' && (
            <div className="space-y-2">
              <Label htmlFor="amount-value">{t('payments.discountAmountReq')} (FCFA) *</Label>
              <Input
                id="amount-value"
                type="number"
                min="0"
                step="1"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                placeholder="Ex: 50000"
                required
              />
            </div>
          )}

          {discountType !== 'none' && discountValue && (
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-sm font-medium mb-1">{t('payments.preview')}</p>
              <p className="text-xs text-muted-foreground">
                {discountType === 'percentage' 
                  ? `${discountValue}% ${t('payments.discountOnAnnualFees')}`
                  : `${parseFloat(discountValue).toLocaleString('fr-FR')} FCFA ${t('payments.discountOnAnnualFees')}`
                }
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t('payments.cancel')}
            </Button>
            <Button type="submit" disabled={updateDiscount.isPending}>
              {updateDiscount.isPending ? t('payments.saving') : t('payments.save')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
