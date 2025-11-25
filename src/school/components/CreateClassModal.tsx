// Composant modal pour créer des classes
import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateClasses, CycleType, GenderType, CreateClassData } from '../hooks/useClasses';

// Schéma de validation
const classFormSchema = z.object({
  cycle: z.enum(['maternel', 'primaire', 'collège', 'lycée', 'université'], {
    required_error: 'Veuillez sélectionner un cycle',
  }),
  classes: z.array(
    z.object({
      name: z.string().min(1, 'Le nom est requis').max(50, 'Maximum 50 caractères'),
      maxStudents: z.coerce
        .number()
        .min(1, 'Minimum 1 élève')
        .max(100, 'Maximum 100 élèves'),
      genderType: z.enum(['mixte', 'garçons', 'filles'], {
        required_error: 'Veuillez sélectionner un type',
      }),
      registrationFee: z.coerce
        .number()
        .min(0, 'Le montant doit être positif'),
      annualFee: z.coerce
        .number()
        .min(0, 'Le montant doit être positif'),
    })
  ).min(1, 'Au moins une classe est requise').max(20, 'Maximum 20 classes'),
});

type ClassFormValues = z.infer<typeof classFormSchema>;

interface CreateClassModalProps {
  schoolId: string;
  schoolYearId: string;
}

const CYCLES: { value: CycleType; label: string }[] = [
  { value: 'maternel', label: 'Maternel' },
  { value: 'primaire', label: 'Primaire' },
  { value: 'collège', label: 'Collège' },
  { value: 'lycée', label: 'Lycée' },
  { value: 'université', label: 'Université' },
];

const GENDER_TYPES: { value: GenderType; label: string }[] = [
  { value: 'mixte', label: 'Mixte' },
  { value: 'garçons', label: 'Garçons uniquement' },
  { value: 'filles', label: 'Filles uniquement' },
];

export const CreateClassModal: React.FC<CreateClassModalProps> = ({
  schoolId,
  schoolYearId,
}) => {
  const [open, setOpen] = useState(false);
  const createClasses = useCreateClasses();

  const form = useForm<ClassFormValues>({
    resolver: zodResolver(classFormSchema),
    defaultValues: {
      cycle: 'primaire',
      classes: [{ name: '', maxStudents: 30, genderType: 'mixte', registrationFee: 0, annualFee: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'classes',
  });

  const onSubmit = async (data: ClassFormValues) => {
    const classesData: CreateClassData[] = data.classes.map((cls) => ({
      school_id: schoolId,
      school_year_id: schoolYearId,
      name: cls.name,
      cycle: data.cycle,
      max_students: cls.maxStudents,
      gender_type: cls.genderType,
      registration_fee: cls.registrationFee,
      annual_fee: cls.annualFee,
    }));

    await createClasses.mutateAsync(classesData);
    setOpen(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Créer des classes
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Créer des classes</DialogTitle>
          <DialogDescription>
            Remplissez le formulaire pour créer une ou plusieurs classes
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Cycle */}
            <FormField
              control={form.control}
              name="cycle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cycle d'enseignement</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un cycle" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CYCLES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Le niveau d'enseignement commun à toutes les classes
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Liste des noms de classes */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <FormLabel>Noms des classes</FormLabel>
                  <FormDescription className="mt-1">
                    Ajoutez les noms de chaque classe à créer
                  </FormDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ name: '', maxStudents: 30, genderType: 'mixte', annualFee: 0 })}
                  disabled={fields.length >= 20}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter
                </Button>
              </div>

              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                {fields.map((field, index) => (
                  <div key={field.id} className="border rounded-lg p-4 space-y-3 bg-muted/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">
                        Classe {index + 1}
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

                    {/* Nom de la classe */}
                    <FormField
                      control={form.control}
                      name={`classes.${index}.name`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nom de la classe</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Ex: 6ème A, CM2 B..."
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Capacité maximale */}
                    <FormField
                      control={form.control}
                      name={`classes.${index}.maxStudents`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Capacité maximale</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={1}
                              max={100}
                              placeholder="30"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Type de classe */}
                    <FormField
                      control={form.control}
                      name={`classes.${index}.genderType`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Type de classe</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Sélectionner le type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {GENDER_TYPES.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Frais d'inscription */}
                    <FormField
                      control={form.control}
                      name={`classes.${index}.registrationFee`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Frais d'inscription (optionnel)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={0}
                              placeholder="0"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Montant des frais d'inscription en € (peut être payé plus tard)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Frais de scolarité annuels */}
                    <FormField
                      control={form.control}
                      name={`classes.${index}.annualFee`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Frais de scolarité annuels (optionnel)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={0}
                              placeholder="0"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Montant des frais de scolarité annuels en €
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setOpen(false);
                  form.reset();
                }}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={createClasses.isPending}>
                {createClasses.isPending ? 'Création en cours...' : `Créer ${fields.length} classe${fields.length > 1 ? 's' : ''}`}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
