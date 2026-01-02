/**
 * Dialog pour créer une nouvelle classe
 * Permet de configurer le cycle (avec sa base de notation) et les paramètres de la classe
 */
import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Info, Settings } from 'lucide-react';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useCreateClasses, CycleType, GenderType } from '@/school/hooks/useClasses';
import { useSchoolCycles } from '@/school/hooks/useSchoolCycles';
import { CycleSettingsDialog } from './CycleSettingsDialog';

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
  const { data: cycles, isLoading: cyclesLoading } = useSchoolCycles(schoolId);
  const [showCycleSettings, setShowCycleSettings] = useState(false);

  const defaultCycle = useMemo(() => cycles?.[0]?.name || 'primaire', [cycles]);

  const [formData, setFormData] = useState({
    name: '',
    cycle: defaultCycle as CycleType,
    max_students: 30,
    gender_type: 'mixte' as GenderType,
    annual_fee: 0,
    registration_fee: 0,
  });

  // Récupérer le cycle sélectionné pour afficher ses détails
  const selectedCycle = useMemo(() => 
    cycles?.find(c => c.name === formData.cycle), 
    [cycles, formData.cycle]
  );

  // Mettre à jour le cycle par défaut quand les cycles sont chargés
  useEffect(() => {
    if (cycles && cycles.length > 0 && formData.cycle === 'primaire') {
      setFormData(prev => ({ ...prev, cycle: cycles[0].name as CycleType }));
    }
  }, [cycles]);

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
      cycle: defaultCycle as CycleType,
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
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label>{t('schoolOS.classes.cycle')}</Label>
                  {selectedCycle && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="font-medium">{selectedCycle.label}</p>
                          <p className="text-sm text-muted-foreground">
                            Base de notation: /{selectedCycle.grade_base}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={() => setShowCycleSettings(true)}
                >
                  <Settings className="h-3.5 w-3.5" />
                  Personnaliser
                </Button>
              </div>
              <Select
                value={formData.cycle}
                onValueChange={(value: CycleType) => setFormData({ ...formData, cycle: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {cyclesLoading ? (
                    <div className="flex items-center justify-center p-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  ) : (
                    cycles?.map((c) => (
                      <SelectItem key={c.name} value={c.name}>
                        <span className="flex items-center gap-2">
                          {c.label}
                          <span className="text-xs text-muted-foreground">/{c.grade_base}</span>
                        </span>
                      </SelectItem>
                    ))
                  )}
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

          {/* Affichage de la base de notation du cycle sélectionné */}
          {selectedCycle && (
            <div className="rounded-lg border bg-muted/50 p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Base de notation pour ce cycle:</span>
                <span className="font-semibold text-primary">/{selectedCycle.grade_base}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Les moyennes seront calculées sur {selectedCycle.grade_base} points
              </p>
            </div>
          )}

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

        {/* Dialog pour personnaliser les cycles */}
        <CycleSettingsDialog
          open={showCycleSettings}
          onOpenChange={setShowCycleSettings}
          schoolId={schoolId}
        />
      </DialogContent>
    </Dialog>
  );
};