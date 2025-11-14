// Dialog pour ajouter un élève
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAddStudent, NewStudent } from '../hooks/useStudents';
import { useForm } from 'react-hook-form';

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

  const onSubmit = async (data: NewStudent) => {
    await addStudent.mutateAsync({
      ...data,
      school_id: schoolId,
      school_year_id: schoolYearId,
    });
    reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="student_code">Code élève</Label>
              <Input
                id="student_code"
                {...register('student_code')}
                placeholder="Code unique"
              />
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
          </div>

          <div className="space-y-2">
            <Label className="text-lg font-semibold">Informations du parent/tuteur</Label>
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

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={addStudent.isPending}>
              {addStudent.isPending ? 'Ajout...' : 'Ajouter l\'élève'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
