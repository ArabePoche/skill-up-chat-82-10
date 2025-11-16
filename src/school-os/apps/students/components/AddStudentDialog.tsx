/**
 * Dialog pour ajouter un ou plusieurs élèves
 * Permet l'ajout multiple avec un bouton "+ Ajouter"
 */
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAddStudents, NewStudent } from '../hooks/useStudents';
import { useForm, useFieldArray } from 'react-hook-form';
import { StudentFamilySelector, FamilyFormSelector } from '@/school-os/families';
import { Plus, X } from 'lucide-react';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

interface AddStudentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  schoolId: string;
  schoolYearId: string;
  classes: Array<{ id: string; name: string; cycle: string }>;
}

// Schéma de validation pour un élève
const studentSchema = z.object({
  first_name: z.string().min(1, 'Le prénom est requis'),
  last_name: z.string().min(1, 'Le nom est requis'),
  date_of_birth: z.string().min(1, 'La date de naissance est requise'),
  gender: z.enum(['male', 'female'], { required_error: 'Le genre est requis' }),
  class_id: z.string().optional(),
  parent_name: z.string().optional(),
  parent_phone: z.string().optional(),
  parent_email: z.string().email('Email invalide').optional().or(z.literal('')),
  address: z.string().optional(),
  city: z.string().optional(),
  medical_notes: z.string().optional(),
  discount_percentage: z.coerce.number().min(0).max(100).optional(),
  discount_amount: z.coerce.number().min(0).optional(),
});

// Schéma pour le formulaire complet
const studentsFormSchema = z.object({
  students: z.array(studentSchema).min(1, 'Au moins un élève est requis').max(50, 'Maximum 50 élèves'),
});

type StudentsFormValues = z.infer<typeof studentsFormSchema>;

export const AddStudentDialog: React.FC<AddStudentDialogProps> = ({
  isOpen,
  onClose,
  schoolId,
  schoolYearId,
  classes,
}) => {
  const addStudents = useAddStudents();
  const [createdStudentIds, setCreatedStudentIds] = useState<string[]>([]);
  const [showFamilySelector, setShowFamilySelector] = useState(false);
  const [selectedStudentIndex, setSelectedStudentIndex] = useState<number>(0);

  const form = useForm<StudentsFormValues>({
    resolver: zodResolver(studentsFormSchema),
    defaultValues: {
      students: [
        {
          first_name: '',
          last_name: '',
          date_of_birth: '',
          gender: 'male',
          class_id: '',
          parent_name: '',
          parent_phone: '',
          parent_email: '',
          address: '',
          city: '',
          medical_notes: '',
          discount_percentage: 0,
          discount_amount: 0,
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'students',
  });

  const onSubmit = async (data: StudentsFormValues) => {
    const studentsData: NewStudent[] = data.students.map((student) => ({
      school_id: schoolId,
      school_year_id: schoolYearId,
      first_name: student.first_name,
      last_name: student.last_name,
      date_of_birth: student.date_of_birth,
      gender: student.gender,
      class_id: student.class_id || null,
      parent_name: student.parent_name,
      parent_phone: student.parent_phone,
      parent_email: student.parent_email,
      address: student.address,
      city: student.city,
      medical_notes: student.medical_notes,
      discount_percentage: student.discount_percentage,
      discount_amount: student.discount_amount,
    }));

    const result = await addStudents.mutateAsync(studentsData);
    if (result) {
      setCreatedStudentIds(result.map((s: any) => s.id));
    }
    form.reset();
  };

  const handleClose = () => {
    setCreatedStudentIds([]);
    setShowFamilySelector(false);
    form.reset();
    onClose();
  };

  const handleFamilySelect = (
    familyData: {
      family_name: string;
      primary_contact_name?: string;
      primary_contact_phone?: string;
      primary_contact_email?: string;
      address?: string;
    },
    index: number
  ) => {
    form.setValue(`students.${index}.parent_name`, familyData.primary_contact_name || '');
    form.setValue(`students.${index}.parent_phone`, familyData.primary_contact_phone || '');
    form.setValue(`students.${index}.parent_email`, familyData.primary_contact_email || '');
    form.setValue(`students.${index}.address`, familyData.address || '');
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ajouter des élèves</DialogTitle>
          <DialogDescription>
            Ajoutez un ou plusieurs élèves à votre établissement
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Bouton pour ajouter un élève */}
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-semibold">
                  Élèves à ajouter
                </Label>
                <p className="text-sm text-muted-foreground">
                  Ajoutez les informations de chaque élève
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  append({
                    first_name: '',
                    last_name: '',
                    date_of_birth: '',
                    gender: 'male',
                    class_id: '',
                    parent_name: '',
                    parent_phone: '',
                    parent_email: '',
                    address: '',
                    city: '',
                    medical_notes: '',
                    discount_percentage: 0,
                    discount_amount: 0,
                  })
                }
                disabled={fields.length >= 50}
              >
                <Plus className="h-4 w-4 mr-2" />
                Ajouter
              </Button>
            </div>

            {/* Liste des élèves */}
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
              {fields.map((field, index) => (
                <div key={field.id} className="border rounded-lg p-4 space-y-4 bg-muted/30">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold">
                      Élève {index + 1}
                    </span>
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(index)}
                        className="h-8 w-8"
                      >
                        <X className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name={`students.${index}.first_name`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Prénom *</FormLabel>
                          <FormControl>
                            <Input placeholder="Prénom de l'élève" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`students.${index}.last_name`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nom *</FormLabel>
                          <FormControl>
                            <Input placeholder="Nom de l'élève" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name={`students.${index}.date_of_birth`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date de naissance *</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`students.${index}.gender`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Genre *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Sélectionner le genre" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="male">Garçon</SelectItem>
                              <SelectItem value="female">Fille</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name={`students.${index}.class_id`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Classe</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner une classe" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {classes.map((cls) => (
                              <SelectItem key={cls.id} value={cls.id}>
                                {cls.name} ({cls.cycle})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Bouton pour remplir depuis une famille */}
                  <div className="flex items-center justify-between pt-2 pb-1 border-t">
                    <Label className="text-sm font-semibold">Informations du parent/tuteur</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedStudentIndex(index);
                        setShowFamilySelector(true);
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Remplir depuis une famille
                    </Button>
                  </div>

                  <FormField
                    control={form.control}
                    name={`students.${index}.parent_name`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nom du parent/tuteur</FormLabel>
                        <FormControl>
                          <Input placeholder="Nom complet" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name={`students.${index}.parent_phone`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Téléphone</FormLabel>
                          <FormControl>
                            <Input placeholder="+225 XX XX XX XX" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`students.${index}.parent_email`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="email@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name={`students.${index}.address`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Adresse</FormLabel>
                          <FormControl>
                            <Input placeholder="Adresse complète" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`students.${index}.city`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ville</FormLabel>
                          <FormControl>
                            <Input placeholder="Ville" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name={`students.${index}.medical_notes`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes médicales</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Allergies, conditions médicales, etc."
                            rows={2}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name={`students.${index}.discount_percentage`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Remise (%)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              placeholder="Pourcentage de remise"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`students.${index}.discount_amount`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Remise fixe (montant)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="Montant fixe de remise"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              ))}
            </div>

            <p className="text-sm text-muted-foreground">
              ℹ️ Un numéro matricule unique sera généré automatiquement pour chaque élève au format : M/F-AAAA-PXXXXXN
            </p>

            {createdStudentIds.length > 0 && (
              <div className="p-4 bg-muted rounded-lg space-y-3">
                <p className="text-sm font-medium">✓ {createdStudentIds.length} élève(s) créé(s) avec succès !</p>
                <p className="text-xs text-muted-foreground">
                  Vous pouvez maintenant lier ces élèves à des familles existantes
                </p>
                <div className="space-y-2">
                  {createdStudentIds.map((studentId) => (
                    <StudentFamilySelector
                      key={studentId}
                      studentId={studentId}
                      schoolId={schoolId}
                    />
                  ))}
                </div>
              </div>
            )}

            <FamilyFormSelector
              isOpen={showFamilySelector}
              onClose={() => setShowFamilySelector(false)}
              schoolId={schoolId}
              onFamilySelect={(familyData) => handleFamilySelect(familyData, selectedStudentIndex)}
            />

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={handleClose}>
                {createdStudentIds.length > 0 ? 'Fermer' : 'Annuler'}
              </Button>
              {createdStudentIds.length === 0 && (
                <Button type="submit" disabled={addStudents.isPending}>
                  {addStudents.isPending ? 'Ajout...' : `Ajouter ${fields.length} élève(s)`}
                </Button>
              )}
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
