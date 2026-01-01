/**
 * Dialog pour créer une nouvelle classe
 */
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateClasses, CycleType, GenderType } from '@/school/hooks/useClasses';

interface CreateClassDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolId: string;
  schoolYearId?: string;
}

export const CreateClassDialog: React.FC<CreateClassDialogProps> = ({
  open,
  onOpenChange,
  schoolId,
  schoolYearId,
}) => {
  const { t } = useTranslation();
  const createClasses = useCreateClasses();

  const [formData, setFormData] = useState({
    name: '',
    cycle: 'primaire' as CycleType,
    max_students: 30,
    gender_type: 'mixte' as GenderType,
    annual_fee: 0,
    registration_fee: 0,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!schoolYearId) return;

    await createClasses.mutateAsync([{
      ...formData,
      school_id: schoolId,
      school_year_id: schoolYearId,
    }]);

    setFormData({
      name: '',
      cycle: 'primaire',
      max_students: 30,
      gender_type: 'mixte',
      annual_fee: 0,
      registration_fee: 0,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('schoolOS.classes.addClass')}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t('schoolOS.common.name')}</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: 6ème A"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('schoolOS.classes.cycle')}</Label>
              <Select
                value={formData.cycle}
                onValueChange={(value: CycleType) => setFormData({ ...formData, cycle: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="maternel">Maternel</SelectItem>
                  <SelectItem value="primaire">Primaire</SelectItem>
                  <SelectItem value="collège">Collège</SelectItem>
                  <SelectItem value="lycée">Lycée</SelectItem>
                  <SelectItem value="université">Université</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('schoolOS.classes.genderType')}</Label>
              <Select
                value={formData.gender_type}
                onValueChange={(value: GenderType) => setFormData({ ...formData, gender_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mixte">Mixte</SelectItem>
                  <SelectItem value="garçons">Garçons</SelectItem>
                  <SelectItem value="filles">Filles</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="max_students">{t('schoolOS.classes.maxStudents')}</Label>
            <Input
              id="max_students"
              type="number"
              value={formData.max_students}
              onChange={(e) => setFormData({ ...formData, max_students: parseInt(e.target.value) || 0 })}
              min={1}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="annual_fee">{t('schoolOS.classes.annualFee')}</Label>
              <Input
                id="annual_fee"
                type="number"
                value={formData.annual_fee}
                onChange={(e) => setFormData({ ...formData, annual_fee: parseInt(e.target.value) || 0 })}
                min={0}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="registration_fee">{t('schoolOS.classes.registrationFee')}</Label>
              <Input
                id="registration_fee"
                type="number"
                value={formData.registration_fee}
                onChange={(e) => setFormData({ ...formData, registration_fee: parseInt(e.target.value) || 0 })}
                min={0}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('schoolOS.common.cancel')}
            </Button>
            <Button type="submit" disabled={createClasses.isPending || !formData.name}>
              {createClasses.isPending ? t('schoolOS.common.saving') : t('schoolOS.common.save')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
