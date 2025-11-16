// Dialog pour ajouter un élève
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAddStudent, NewStudent } from '../hooks/useStudents';
import { useForm } from 'react-hook-form';
import { StudentFamilySelector, FamilyFormSelector } from '@/school-os/families';
import { Plus } from 'lucide-react';

interface AddStudentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  schoolId: string;
  schoolYearId: string;
  classes: Array<{ id: string; name: string; cycle: string }>;
}

export const AddStudentDialog: React.FC<AddStudentDialogProps> = ({
  isOpen,
  onClose,
  schoolId,
  schoolYearId,
  classes,
}) => {
  const { register, handleSubmit, reset, setValue, watch } = useForm<NewStudent>();
  const addStudent = useAddStudent();
  const [createdStudentId, setCreatedStudentId] = useState<string | null>(null);
  const [showFamilySelector, setShowFamilySelector] = useState(false);

  const onSubmit = async (data: NewStudent) => {
    const result = await addStudent.mutateAsync({
      ...data,
      school_id: schoolId,
      school_year_id: schoolYearId,
    });
    setCreatedStudentId(result.id);
    reset();
  };

  const handleClose = () => {
    setCreatedStudentId(null);
    setShowFamilySelector(false);
    onClose();
  };

  const handleFamilySelect = (familyData: {
    family_name: string;
    primary_contact_name?: string;
    primary_contact_phone?: string;
    primary_contact_email?: string;
    address?: string;
  }) => {
    setValue('parent_name', familyData.primary_contact_name || '');
    setValue('parent_phone', familyData.primary_contact_phone || '');
    setValue('parent_email', familyData.primary_contact_email || '');
    setValue('address', familyData.address || '');
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ajouter un élève</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">Prénom *</Label>
              <Input
                id="first_name"
                {...register('first_name', { required: true })}
                placeholder="Prénom de l'élève"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="last_name">Nom *</Label>
              <Input
                id="last_name"
                {...register('last_name', { required: true })}
                placeholder="Nom de l'élève"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date_of_birth">Date de naissance *</Label>
              <Input
                id="date_of_birth"
                type="date"
                {...register('date_of_birth', { required: true })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gender">Genre *</Label>
              <Select
                onValueChange={(value) => setValue('gender', value as 'male' | 'female')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner le genre" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Garçon</SelectItem>
                  <SelectItem value="female">Fille</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="class_id">Classe</Label>
              <Select
                onValueChange={(value) => setValue('class_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une classe" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name} ({cls.cycle})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
          </div>

          <div className="p-3 bg-muted/50 rounded-lg border border-border/50">
            <p className="text-sm text-muted-foreground">
              ℹ️ Un numéro matricule unique sera généré automatiquement au format : M/F-AAAA-PXXXXXN
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-lg font-semibold">Informations du parent/tuteur</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowFamilySelector(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Remplir depuis une famille
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="parent_name">Nom du parent/tuteur</Label>
            <Input
              id="parent_name"
              {...register('parent_name')}
              placeholder="Nom complet"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="parent_phone">Téléphone</Label>
              <Input
                id="parent_phone"
                {...register('parent_phone')}
                placeholder="+225 XX XX XX XX"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="parent_email">Email</Label>
              <Input
                id="parent_email"
                type="email"
                {...register('parent_email')}
                placeholder="email@example.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Adresse</Label>
            <Input
              id="address"
              {...register('address')}
              placeholder="Adresse complète"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="city">Ville</Label>
            <Input
              id="city"
              {...register('city')}
              placeholder="Ville"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="medical_notes">Notes médicales</Label>
            <Textarea
              id="medical_notes"
              {...register('medical_notes')}
              placeholder="Allergies, conditions médicales, etc."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="discount_percentage">Remise (%)</Label>
              <Input
                id="discount_percentage"
                type="number"
                min="0"
                max="100"
                step="0.01"
                {...register('discount_percentage', { 
                  valueAsNumber: true,
                  min: 0,
                  max: 100
                })}
                placeholder="Pourcentage de remise"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="discount_amount">Remise fixe (montant)</Label>
              <Input
                id="discount_amount"
                type="number"
                min="0"
                step="0.01"
                {...register('discount_amount', { 
                  valueAsNumber: true,
                  min: 0
                })}
                placeholder="Montant fixe de remise"
              />
            </div>
          </div>

          {createdStudentId && (
            <div className="p-4 bg-muted rounded-lg space-y-3">
              <p className="text-sm font-medium">✓ Élève créé avec succès !</p>
              <p className="text-xs text-muted-foreground">
                Vous pouvez maintenant lier cet élève à une famille existante
              </p>
              <StudentFamilySelector
                studentId={createdStudentId}
                schoolId={schoolId}
              />
            </div>
          )}

          <FamilyFormSelector
            isOpen={showFamilySelector}
            onClose={() => setShowFamilySelector(false)}
            schoolId={schoolId}
            onFamilySelect={handleFamilySelect}
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              {createdStudentId ? 'Fermer' : 'Annuler'}
            </Button>
            {!createdStudentId && (
              <Button type="submit" disabled={addStudent.isPending}>
                {addStudent.isPending ? 'Ajout...' : 'Ajouter l\'élève'}
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
