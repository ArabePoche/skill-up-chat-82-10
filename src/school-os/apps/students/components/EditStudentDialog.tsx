/**
 * Dialog pour modifier les informations d'un élève
 */
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface EditStudentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  student: any;
  classes: Array<{ id: string; name: string; cycle: string }>;
}

const studentSchema = z.object({
  first_name: z.string().min(1, 'Le prénom est requis'),
  last_name: z.string().min(1, 'Le nom est requis'),
  date_of_birth: z.string().min(1, 'La date de naissance est requise'),
  gender: z.enum(['male', 'female'], { required_error: 'Le genre est requis' }),
  father_name: z.string().optional(),
  father_occupation: z.string().optional(),
  birth_place: z.string().optional(),
  class_id: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  discount_percentage: z.coerce.number().min(0).max(100).optional(),
  discount_amount: z.coerce.number().min(0).optional(),
  status: z.enum(['active', 'inactive', 'transferred']).optional(),
  parent_name: z.string().optional(),
  parent_phone: z.string().optional(),
  parent_email: z.string().email('Email invalide').optional().or(z.literal('')),
  medical_notes: z.string().optional(),
  mother_name: z.string().optional(),
  mother_occupation: z.string().optional(),
  observations: z.string().optional(),
});

type StudentFormValues = z.infer<typeof studentSchema>;

export const EditStudentDialog: React.FC<EditStudentDialogProps> = ({
  isOpen,
  onClose,
  student,
  classes,
}) => {
  const queryClient = useQueryClient();
  const [isExpanded, setIsExpanded] = useState(false);

  const form = useForm<StudentFormValues>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      first_name: student.first_name || '',
      last_name: student.last_name || '',
      date_of_birth: student.date_of_birth || '',
      gender: student.gender || 'male',
      father_name: student.father_name || '',
      father_occupation: student.father_occupation || '',
      birth_place: student.birth_place || '',
      class_id: student.class_id || '',
      address: student.address || '',
      city: student.city || '',
      discount_percentage: student.discount_percentage || 0,
      discount_amount: student.discount_amount || 0,
      status: student.status || 'active',
      parent_name: student.parent_name || '',
      parent_phone: student.parent_phone || '',
      parent_email: student.parent_email || '',
      medical_notes: student.medical_notes || '',
      mother_name: student.mother_name || '',
      mother_occupation: student.mother_occupation || '',
      observations: student.observations || '',
    },
  });

  const onSubmit = async (data: StudentFormValues) => {
    try {
      const { error } = await supabase
        .from('students_school')
        .update({
          first_name: data.first_name,
          last_name: data.last_name,
          date_of_birth: data.date_of_birth,
          gender: data.gender,
          father_name: data.father_name,
          father_occupation: data.father_occupation,
          birth_place: data.birth_place,
          class_id: data.class_id || null,
          address: data.address,
          city: data.city,
          discount_percentage: data.discount_percentage,
          discount_amount: data.discount_amount,
          status: data.status,
          parent_name: data.parent_name,
          parent_phone: data.parent_phone,
          parent_email: data.parent_email,
          medical_notes: data.medical_notes,
          mother_name: data.mother_name,
          mother_occupation: data.mother_occupation,
          observations: data.observations,
        })
        .eq('id', student.id);

      if (error) throw error;

      toast.success('Élève modifié avec succès');
      queryClient.invalidateQueries({ queryKey: ['students'] });
      onClose();
    } catch (error: any) {
      toast.error('Erreur lors de la modification : ' + error.message);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier l'élève</DialogTitle>
          <DialogDescription>
            Modifiez les informations de {student.first_name} {student.last_name}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="first_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prénom *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Prénom" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="last_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Nom" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="date_of_birth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date de naissance *</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Genre *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner" />
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

              <FormField
                control={form.control}
                name="class_id"
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
                            {cls.name} - {cls.cycle}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Statut</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Statut" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Actif</SelectItem>
                        <SelectItem value="inactive">Inactif</SelectItem>
                        <SelectItem value="transferred">Transféré</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="father_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom du père</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="Nom complet du père"
                        onChange={(e) => {
                          field.onChange(e);
                          // Auto-remplir le tutaire si vide
                          const currentTutaire = form.getValues('parent_name');
                          if (!currentTutaire || currentTutaire === '') {
                            form.setValue('parent_name', e.target.value);
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="father_occupation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fonction du père</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Profession" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="birth_place"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lieu de naissance</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ville de naissance" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ville</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ville" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="parent_phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Téléphone du parent</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Téléphone" type="tel" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="discount_percentage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Remise (%)</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" min="0" max="100" placeholder="0" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="discount_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Remise fixe (FCFA)</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" min="0" placeholder="0" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Adresse</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Adresse complète" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Section pliable "Plus d'informations" */}
            <Collapsible
              open={isExpanded}
              onOpenChange={setIsExpanded}
            >
              <CollapsibleTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-between"
                  size="sm"
                >
                  <span>Plus d'informations</span>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="parent_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nom du tuteur</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Nom du tuteur (modifiable)" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="parent_email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email du parent</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="email@example.com" type="email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="medical_notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes médicales</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Allergies, conditions médicales, etc." rows={3} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="mother_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nom de la mère</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Nom complet de la mère" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="mother_occupation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fonction de la mère</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Profession" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="observations"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Observations</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Notes additionnelles, informations spéciales..."
                          rows={3}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CollapsibleContent>
            </Collapsible>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Annuler
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
