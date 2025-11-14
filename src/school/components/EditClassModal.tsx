// Composant modal pour modifier une classe
import React, { useState } from 'react';
import { Pencil } from 'lucide-react';
import { useForm } from 'react-hook-form';
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
import { useUpdateClass, CycleType, GenderType, Class } from '../hooks/useClasses';

// Schéma de validation
const editClassFormSchema = z.object({
  name: z.string().min(1, 'Le nom est requis').max(50, 'Maximum 50 caractères'),
  cycle: z.enum(['maternel', 'primaire', 'collège', 'lycée', 'université'], {
    required_error: 'Veuillez sélectionner un cycle',
  }),
  max_students: z.coerce
    .number()
    .min(1, 'Minimum 1 élève')
    .max(100, 'Maximum 100 élèves'),
  gender_type: z.enum(['mixte', 'garçons', 'filles'], {
    required_error: 'Veuillez sélectionner un type',
  }),
});

type EditClassFormValues = z.infer<typeof editClassFormSchema>;

interface EditClassModalProps {
  classData: Class;
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

export const EditClassModal: React.FC<EditClassModalProps> = ({ classData }) => {
  const [open, setOpen] = useState(false);
  const updateClass = useUpdateClass();

  const form = useForm<EditClassFormValues>({
    resolver: zodResolver(editClassFormSchema),
    defaultValues: {
      name: classData.name,
      cycle: classData.cycle,
      max_students: classData.max_students,
      gender_type: classData.gender_type,
    },
  });

  const onSubmit = async (data: EditClassFormValues) => {
    await updateClass.mutateAsync({
      id: classData.id,
      updates: data,
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Modifier la classe</DialogTitle>
          <DialogDescription>
            Modifiez les informations de la classe
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Nom de la classe */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom de la classe</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: 6ème A, CM2 B..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Capacité maximale */}
            <FormField
              control={form.control}
              name="max_students"
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
                  <FormDescription>
                    Nombre actuel d'élèves: {classData.current_students}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Type de classe */}
            <FormField
              control={form.control}
              name="gender_type"
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

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={updateClass.isPending}>
                {updateClass.isPending ? 'Modification...' : 'Modifier'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
