// Composant modal pour modifier une classe
import React, { useState } from 'react';
import { Pencil, Plus, Trash2, Edit, FileText } from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useUpdateClass, CycleType, GenderType, Class } from '../hooks/useClasses';
import { useTeachers } from '../hooks/useTeachers';
import { useSubjects, type Subject } from '../hooks/useSubjects';
import { CreateSubjectModal } from './CreateSubjectModal';
import SubjectEditDialog from './SubjectEditDialog';
import SubjectFilesManager from './SubjectFilesManager';
import { 
  useClassSubjects, 
  useAddClassSubject, 
  useUpdateClassSubject,
  useDeleteClassSubject 
} from '../hooks/useClassSubjects';
import {
  useClassTeachers,
  useAddClassTeacher,
  useDeleteClassTeacher
} from '../hooks/useClassTeachers';

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
  registration_fee: z.coerce
    .number()
    .min(0, 'Le montant doit être positif'),
  annual_fee: z.coerce
    .number()
    .min(0, 'Le montant doit être positif'),
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
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [selectedClassTeacherId, setSelectedClassTeacherId] = useState('');
  const [coefficient, setCoefficient] = useState<number>(1);
  
  // États pour gérer les dialogs de modification de matière et gestion des supports
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [managingFilesSubjectId, setManagingFilesSubjectId] = useState<string | null>(null);
  
  const updateClass = useUpdateClass();
  const { data: teachers = [] } = useTeachers(classData.school_id);
  const { data: subjects = [] } = useSubjects();
  const { data: classSubjects = [] } = useClassSubjects(classData.id);
  const { data: classTeachers = [] } = useClassTeachers(classData.id);
  const addClassSubject = useAddClassSubject();
  const updateClassSubject = useUpdateClassSubject();
  const deleteClassSubject = useDeleteClassSubject();
  const addClassTeacher = useAddClassTeacher();
  const deleteClassTeacher = useDeleteClassTeacher();

  const form = useForm<EditClassFormValues>({
    resolver: zodResolver(editClassFormSchema),
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
      updates: data,
    });
    setOpen(false);
  };

  const handleAddSubject = async () => {
    if (!selectedSubjectId) return;
    
    await addClassSubject.mutateAsync({
      class_id: classData.id,
      subject_id: selectedSubjectId,
      teacher_id: selectedTeacherId === 'none' || !selectedTeacherId ? null : selectedTeacherId,
      coefficient: coefficient,
    });
    
    setSelectedSubjectId('');
    setSelectedTeacherId('');
    setCoefficient(1);
  };

  const handleUpdateSubject = async (subjectId: string, teacherId: string | null, coef: number) => {
    await updateClassSubject.mutateAsync({
      id: subjectId,
      classId: classData.id,
      updates: {
        teacher_id: teacherId,
        coefficient: coef,
      },
    });
  };

  const handleDeleteSubject = async (subjectId: string) => {
    if (!confirm('Supprimer cette matière de la classe ?')) return;
    await deleteClassSubject.mutateAsync({
      id: subjectId,
      classId: classData.id,
    });
  };

  const handleAddClassTeacher = async () => {
    if (!selectedClassTeacherId) return;
    
    await addClassTeacher.mutateAsync({
      class_id: classData.id,
      teacher_id: selectedClassTeacherId,
    });
    
    setSelectedClassTeacherId('');
  };

  const handleDeleteClassTeacher = async (teacherId: string) => {
    if (!confirm('Retirer ce professeur de la classe ?')) return;
    await deleteClassTeacher.mutateAsync({
      id: teacherId,
      classId: classData.id,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier la classe</DialogTitle>
          <DialogDescription>
            Modifiez les informations, gérez les professeurs et les matières
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="info" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="info">Informations</TabsTrigger>
            <TabsTrigger value="teachers">Professeurs</TabsTrigger>
            <TabsTrigger value="subjects">Matières</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-4">
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
          </TabsContent>

          <TabsContent value="teachers" className="space-y-4">
            {/* Ajouter un professeur */}
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-4">Assigner un professeur à la classe</h3>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Select value={selectedClassTeacherId} onValueChange={setSelectedClassTeacherId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un professeur" />
                      </SelectTrigger>
                      <SelectContent>
                        {teachers
                          .filter(t => !classTeachers.some(ct => ct.teacher_id === t.id))
                          .map((teacher) => (
                            <SelectItem key={teacher.id} value={teacher.id}>
                              {teacher.first_name} {teacher.last_name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button 
                    onClick={handleAddClassTeacher} 
                    disabled={!selectedClassTeacherId || addClassTeacher.isPending}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Liste des professeurs */}
            <div className="space-y-3">
              <h3 className="font-semibold">Professeurs de la classe</h3>
              {classTeachers.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun professeur assigné</p>
              ) : (
                classTeachers.map((ct) => (
                  <Card key={ct.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">
                            {ct.school_teachers?.first_name} {ct.school_teachers?.last_name}
                          </p>
                          <p className="text-sm text-muted-foreground">{ct.school_teachers?.email}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteClassTeacher(ct.id)}
                          disabled={deleteClassTeacher.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="subjects" className="space-y-4">
            {/* Ajouter une matière */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Ajouter une matière</h3>
                  <CreateSubjectModal />
                </div>
                <div className="grid gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Matière</label>
                    <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner une matière" />
                      </SelectTrigger>
                      <SelectContent>
                        {subjects
                          .filter(s => !classSubjects.some(cs => cs.subject_id === s.id))
                          .map((subject) => (
                            <SelectItem key={subject.id} value={subject.id}>
                              {subject.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Professeur (optionnel)</label>
                    <Select value={selectedTeacherId} onValueChange={setSelectedTeacherId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un professeur" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Aucun</SelectItem>
                        {teachers.map((teacher) => (
                          <SelectItem key={teacher.id} value={teacher.id}>
                            {teacher.first_name} {teacher.last_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Coefficient</label>
                    <Input
                      type="number"
                      min={0.5}
                      max={10}
                      step={0.5}
                      value={coefficient}
                      onChange={(e) => setCoefficient(parseFloat(e.target.value))}
                    />
                  </div>

                  <Button 
                    onClick={handleAddSubject} 
                    disabled={!selectedSubjectId || addClassSubject.isPending}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter la matière
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Liste des matières */}
            <div className="space-y-3">
              <h3 className="font-semibold">Matières de la classe</h3>
              {classSubjects.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune matière configurée</p>
              ) : (
                classSubjects.map((cs) => (
                  <Card key={cs.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium">{cs.subjects?.name}</h4>
                            <Badge variant="outline">Coef. {cs.coefficient || 1}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {cs.profiles?.first_name && cs.profiles?.last_name
                              ? `Prof: ${cs.profiles.first_name} ${cs.profiles.last_name}`
                              : 'Aucun professeur assigné'}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Modifier la matière"
                            onClick={() => {
                              const subject = subjects.find(s => s.id === cs.subject_id);
                              if (subject) setEditingSubject(subject);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Gérer les supports"
                            onClick={() => setManagingFilesSubjectId(cs.subject_id)}
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Supprimer"
                            onClick={() => handleDeleteSubject(cs.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>

      {/* Dialog pour modifier une matière */}
      <SubjectEditDialog
        subject={editingSubject}
        open={!!editingSubject}
        onOpenChange={(open) => !open && setEditingSubject(null)}
      />

      {/* Dialog pour gérer les supports d'une matière */}
      <Dialog 
        open={!!managingFilesSubjectId} 
        onOpenChange={(open) => !open && setManagingFilesSubjectId(null)}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gérer les supports de cours</DialogTitle>
          </DialogHeader>
          {managingFilesSubjectId && (
            <SubjectFilesManager subjectId={managingFilesSubjectId} />
          )}
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};
