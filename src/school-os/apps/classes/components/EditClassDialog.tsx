// Composant modal pour modifier les informations de base d'une classe
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import { useSchoolCycles } from '../hooks/useSchoolCycles';

// Schéma de validation dynamique
const createEditClassFormSchema = (allowedCycles: string[]) => z.object({
  name: z.string().min(1, 'Le nom est requis').max(50, 'Maximum 50 caractères'),
  cycle: z.string().refine(val => allowedCycles.length === 0 || allowedCycles.includes(val), {
    message: 'Veuillez sélectionner un cycle valide',
  }),
  max_students: z.coerce
    .number()
    .min(1, 'Minimum 1 élève')
    .max(100, 'Maximum 100 élèves'),
  gender_type: z.enum(['mixte', 'garçons', 'filles'], {
    required_error: 'Veuillez sélectionner un type',
  }),
  registration_fee: z.coerce
    .number()
    .min(0, 'Le montant doit être positif'),
  annual_fee: z.coerce
    .number()
    .min(0, 'Le montant doit être positif'),
});

type EditClassFormValues = z.infer<ReturnType<typeof createEditClassFormSchema>>;

interface EditClassModalProps {
  classData: Class;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const GENDER_TYPES: { value: GenderType; label: string }[] = [
  { value: 'mixte', label: 'Mixte' },
  { value: 'garçons', label: 'Garçons uniquement' },
  { value: 'filles', label: 'Filles uniquement' },
];

export const EditClassModal: React.FC<EditClassModalProps> = ({ 
  classData,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange 
}) => {
  const updateClass = useUpdateClass();
  const { data: cycles, isLoading: cyclesLoading } = useSchoolCycles(classData.school_id);
  
  // Liste des cycles valides
  const allowedCycles = React.useMemo(() => cycles?.map(c => c.name) || [], [cycles]);

  const form = useForm<EditClassFormValues>({
    resolver: zodResolver(createEditClassFormSchema(allowedCycles)),
    defaultValues: {
      name: classData.name,
      cycle: classData.cycle,
      max_students: classData.max_students,
      gender_type: classData.gender_type,
      registration_fee: classData.registration_fee || 0,
      annual_fee: classData.annual_fee || 0,
    },
  });

  const onSubmit = async (data: EditClassFormValues) => {
    await updateClass.mutateAsync({
      id: classData.id,
      updates: {
        ...data,
        cycle: data.cycle as CycleType,
      },
    });
    if (controlledOnOpenChange) {
      controlledOnOpenChange(false);
    }
  };

  return (
    <Dialog open={controlledOpen} onOpenChange={controlledOnOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier la classe</DialogTitle>
          <DialogDescription>
            Modifiez les informations de base de la classe
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
                      {cyclesLoading ? (
                        <div className="flex items-center justify-center p-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                      ) : (
                        cycles?.map((c) => (
                          <SelectItem key={c.name} value={c.name}>
                            {c.label} (/{c.grade_base})
                          </SelectItem>
                        ))
                      )}
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

            {/* Frais d'inscription */}
            <FormField
              control={form.control}
              name="registration_fee"
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
              name="annual_fee"
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

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => controlledOnOpenChange?.(false)}
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
