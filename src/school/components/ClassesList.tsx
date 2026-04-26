// Composant pour afficher la liste des classes
import React, { useState } from 'react';
import { Users, Trash2, GraduationCap, UserCheck, ChevronDown, GripVertical, Edit2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useSchoolClasses, useDeleteClass, useUpdateClassOrder } from '../hooks/useClasses';
import { CreateClassModal } from './CreateClassModal';
import { EditClassModal } from './EditClassModal';
import { AssignSubjectsToClassDialog } from '@/school-os/apps/subjects/components/AssignSubjectsToClassDialog';
import { AssignTeachersToClassDialog } from './AssignTeachersToClassDialog';
import { ClassSettingsMenu } from './ClassSettingsMenu';
import { SchoolCardsSection } from '@/school-os/apps/grades/components/school-cards/SchoolCardsSection';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ClassesListProps {
  schoolId: string;
  schoolYearId: string;
}

// Helper hook to get school name & logo
const useSchoolInfo = (schoolId: string) => {
  return useQuery({
    queryKey: ['school-info-cards', schoolId],
    queryFn: async () => {
      const { data } = await supabase
        .from('schools')
        .select('name, logo_url')
        .eq('id', schoolId)
        .maybeSingle();
      return data;
    },
    enabled: !!schoolId,
  });
};

const useSchoolYearLabel = (schoolYearId: string) => {
  return useQuery({
    queryKey: ['school-year-label', schoolYearId],
    queryFn: async () => {
      const { data } = await supabase
        .from('school_years')
        .select('year_label')
        .eq('id', schoolYearId)
        .maybeSingle();
      return data?.year_label || '';
    },
    enabled: !!schoolYearId,
  });
};

const CYCLE_COLORS: Record<string, string> = {
  maternel: 'bg-pink-500/10 text-pink-700 dark:text-pink-400 border-pink-500/20',
  primaire: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
  collège: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20',
  lycée: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20',
  université: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20',
};

// Composant SortableClassCard pour le drag & drop
interface SortableClassCardProps {
  cls: any;
  currentStudents: number;
  occupancyRate: number;
  isFull: boolean;
  onManageSubjects: () => void;
  onManageTeachers: () => void;
  onEditClass: () => void;
  onDeleteClass: () => void;
  onGenerateCards: () => void;
  onEditOrder: () => void;
}

const SortableClassCard: React.FC<SortableClassCardProps> = ({
  cls,
  currentStudents,
  occupancyRate,
  isFull,
  onManageSubjects,
  onManageTeachers,
  onEditClass,
  onDeleteClass,
  onGenerateCards,
  onEditOrder,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: cls.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card 
        className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-muted"
      >
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start gap-2">
            <div className="flex items-start gap-2 flex-1">
              <div
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground mt-1"
              >
                <GripVertical className="h-5 w-5" />
              </div>
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg">{cls.name}</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={onEditOrder}
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                  {cls.grade_order != null && cls.grade_order > 0 && (
                    <Badge variant="outline" className="text-xs">
                      #{cls.grade_order}
                    </Badge>
                  )}
                </div>
                <div className="flex gap-2">
                  <Badge 
                    variant="secondary" 
                    className="capitalize text-xs"
                  >
                    {cls.gender_type}
                  </Badge>
                </div>
              </div>
            </div>
            <ClassSettingsMenu
              onManageSubjects={onManageSubjects}
              onManageTeachers={onManageTeachers}
              onEditClass={onEditClass}
              onDeleteClass={onDeleteClass}
              onGenerateCards={onGenerateCards}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>Effectif</span>
              </div>
              <div className="flex items-center gap-1">
                <span className={`font-semibold ${isFull ? 'text-orange-600 dark:text-orange-400' : 'text-foreground'}`}>
                  {currentStudents}
                </span>
                <span className="text-muted-foreground">/ {cls.max_students}</span>
              </div>
            </div>
            <Progress 
              value={occupancyRate} 
              className="h-2"
            />
            <p className="text-xs text-muted-foreground text-right">
              {occupancyRate.toFixed(0)}% d'occupation
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export const ClassesList: React.FC<ClassesListProps> = ({
  schoolId,
  schoolYearId,
}) => {
  const { data: classes, isLoading } = useSchoolClasses(schoolId, schoolYearId);
  const deleteClass = useDeleteClass();
  const updateClassOrder = useUpdateClassOrder();
  const [assignSubjectsClass, setAssignSubjectsClass] = useState<{ id: string; name: string } | null>(null);
  const [assignTeachersClass, setAssignTeachersClass] = useState<{ id: string; name: string } | null>(null);
  const [editingClass, setEditingClass] = useState<any>(null);
  const [cardsClassId, setCardsClassId] = useState<string | null>(null);
  const [editingOrderClass, setEditingOrderClass] = useState<{ id: string; name: string; grade_order: number | null } | null>(null);
  const [manualOrder, setManualOrder] = useState<number>(0);

  // Initialiser manualOrder quand editingOrderClass change
  React.useEffect(() => {
    if (editingOrderClass) {
      setManualOrder(editingOrderClass.grade_order || 0);
    }
  }, [editingOrderClass]);

  const { data: schoolInfo } = useSchoolInfo(schoolId);
  const { data: yearLabel } = useSchoolYearLabel(schoolYearId);

  // Sensors pour le drag & drop
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handler pour la fin du drag & drop
  const handleDragEnd = (event: DragEndEvent, cycle: string) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) return;

    const cycleClasses = groupedClasses?.[cycle] || [];
    const oldIndex = cycleClasses.findIndex((c) => c.id === active.id);
    const newIndex = cycleClasses.findIndex((c) => c.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    // Créer une nouvelle liste réordonnée
    const newCycleClasses = [...cycleClasses];
    const [movedClass] = newCycleClasses.splice(oldIndex, 1);
    newCycleClasses.splice(newIndex, 0, movedClass);

    // Mettre à jour le grade_order pour toutes les classes du cycle
    const updates = newCycleClasses.map((cls, index) => ({
      id: cls.id,
      grade_order: index + 1,
    }));

    updateClassOrder.mutate({ schoolId, updates });
  };

  // Récupérer le nombre réel d'élèves par classe
  const { data: studentCounts } = useQuery({
    queryKey: ['students-count-by-class', schoolId, schoolYearId],
    queryFn: async () => {
      if (!schoolId || !schoolYearId) return {};
      
      const { data, error } = await supabase
        .from('students_school')
        .select('class_id')
        .eq('school_id', schoolId)
        .eq('school_year_id', schoolYearId)
        .eq('status', 'active');
      
      if (error) throw error;
      
      // Compter les élèves par classe
      const counts: Record<string, number> = {};
      data?.forEach((student: any) => {
        if (student.class_id) {
          counts[student.class_id] = (counts[student.class_id] || 0) + 1;
        }
      });
      
      return counts;
    },
    enabled: !!schoolId && !!schoolYearId,
  });

  const handleDelete = async (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette classe ?')) {
      await deleteClass.mutateAsync({ id, schoolId });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const groupedClasses = classes?.reduce((acc, cls) => {
    if (!acc[cls.cycle]) {
      acc[cls.cycle] = [];
    }
    acc[cls.cycle].push(cls);
    return acc;
  }, {} as Record<string, typeof classes>);

  // Trier les classes par grade_order dans chaque cycle
  Object.keys(groupedClasses || {}).forEach(cycle => {
    if (groupedClasses[cycle]) {
      groupedClasses[cycle].sort((a, b) => {
        const aOrder = a.grade_order ?? 999;
        const bOrder = b.grade_order ?? 999;
        return aOrder - bOrder;
      });
    }
  });

  // Calcul des statistiques avec les vrais comptes d'élèves
  const totalStudents = classes?.reduce((sum, cls) => sum + (studentCounts?.[cls.id] || 0), 0) || 0;
  const totalCapacity = classes?.reduce((sum, cls) => sum + cls.max_students, 0) || 0;
  const averageOccupancy = totalCapacity > 0 ? (totalStudents / totalCapacity) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* En-tête avec statistiques */}
      <div className="flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Gestion des Classes</h2>
            <p className="text-sm text-muted-foreground">
              Gérez les classes de votre établissement
            </p>
          </div>
          <CreateClassModal schoolId={schoolId} schoolYearId={schoolYearId} />
        </div>

        {/* Statistiques globales */}
        {classes && classes.length > 0 && (
          <div className="grid gap-3 md:grid-cols-3">
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-primary/10 rounded-lg">
                    <GraduationCap className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Total Classes</p>
                    <p className="text-xl font-bold">{classes.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-blue-500/10 rounded-lg">
                    <UserCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Élèves inscrits</p>
                    <p className="text-xl font-bold">{totalStudents}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-green-500/10 rounded-lg">
                    <Users className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-muted-foreground">Taux d'occupation</p>
                    <p className="text-xl font-bold">{averageOccupancy.toFixed(0)}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Liste des classes */}
      {!classes || classes.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="p-4 bg-muted rounded-full mb-4">
              <GraduationCap className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Aucune classe</h3>
            <p className="text-muted-foreground mb-6 text-center max-w-sm">
              Commencez par créer votre première classe pour organiser votre établissement
            </p>
            <CreateClassModal schoolId={schoolId} schoolYearId={schoolYearId} />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <Accordion type="multiple" className="space-y-4">
            {Object.entries(groupedClasses || {}).map(([cycle, cycleClasses]) => {
              const cycleStudents = cycleClasses.reduce((sum, cls) => sum + (studentCounts?.[cls.id] || 0), 0);
              const cycleCapacity = cycleClasses.reduce((sum, cls) => sum + cls.max_students, 0);
              const cycleOccupancy = cycleCapacity > 0 ? (cycleStudents / cycleCapacity) * 100 : 0;

              return (
                <AccordionItem 
                  key={cycle} 
                  value={cycle}
                  className="border rounded-lg bg-card hover:shadow-md transition-all duration-300"
                >
                  <AccordionTrigger className="px-6 py-4 hover:no-underline group">
                    <div className="flex items-center justify-between w-full pr-4">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-lg ${CYCLE_COLORS[cycle]}`}>
                          <GraduationCap className="h-5 w-5" />
                        </div>
                        <div className="text-left">
                          <h3 className="text-lg font-semibold capitalize group-hover:text-primary transition-colors">
                            {cycle}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {cycleClasses.length} classe{cycleClasses.length > 1 ? 's' : ''} • {cycleStudents}/{cycleCapacity} élèves
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right hidden sm:block">
                          <p className="text-sm font-medium">{cycleOccupancy.toFixed(0)}%</p>
                          <p className="text-xs text-muted-foreground">Occupation</p>
                        </div>
                        <Badge variant="outline" className={CYCLE_COLORS[cycle]}>
                          {cycleClasses.length}
                        </Badge>
                      </div>
                    </div>
                  </AccordionTrigger>
                  
                  <AccordionContent className="px-6 pb-6">
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={(event) => handleDragEnd(event, cycle)}
                    >
                      <SortableContext
                        items={cycleClasses.map(c => c.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 pt-2">
                          {cycleClasses.map((cls) => {
                            const currentStudents = studentCounts?.[cls.id] || 0;
                            const occupancyRate = (currentStudents / cls.max_students) * 100;
                            const isFull = currentStudents >= cls.max_students;

                            return (
                              <SortableClassCard
                                key={cls.id}
                                cls={cls}
                                currentStudents={currentStudents}
                                occupancyRate={occupancyRate}
                                isFull={isFull}
                                onManageSubjects={() => setAssignSubjectsClass({ id: cls.id, name: cls.name })}
                                onManageTeachers={() => setAssignTeachersClass({ id: cls.id, name: cls.name })}
                                onEditClass={() => setEditingClass(cls)}
                                onDeleteClass={() => handleDelete(cls.id)}
                                onGenerateCards={() => setCardsClassId(cls.id)}
                                onEditOrder={() => setEditingOrderClass({ id: cls.id, name: cls.name, grade_order: cls.grade_order })}
                              />
                            );
                          })}
                        </div>
                      </SortableContext>
                    </DndContext>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </div>
      )}

      {/* Dialog pour assigner les matières */}
      {assignSubjectsClass && (
        <AssignSubjectsToClassDialog
          open={!!assignSubjectsClass}
          onOpenChange={(open) => !open && setAssignSubjectsClass(null)}
          classId={assignSubjectsClass.id}
          className={assignSubjectsClass.name}
          schoolId={schoolId}
        />
      )}

      {/* Dialog pour assigner les professeurs */}
      {assignTeachersClass && (
        <AssignTeachersToClassDialog
          open={!!assignTeachersClass}
          onOpenChange={(open) => !open && setAssignTeachersClass(null)}
          classId={assignTeachersClass.id}
          className={assignTeachersClass.name}
          schoolId={schoolId}
        />
      )}

      {/* Dialog pour modifier la classe */}
      {editingClass && (
        <EditClassModal 
          classData={editingClass}
          open={!!editingClass}
          onOpenChange={(open) => !open && setEditingClass(null)}
        />
      )}

      {/* Dialog pour générer les cartes scolaires */}
      {cardsClassId && (
        <Dialog open={!!cardsClassId} onOpenChange={(open) => !open && setCardsClassId(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Cartes scolaires</DialogTitle>
            </DialogHeader>
            <SchoolCardsSection
              availableClasses={classes?.filter(c => c.id === cardsClassId).map(c => ({
                id: c.id,
                name: c.name,
                cycle: c.cycle,
                current_students: studentCounts?.[c.id] || 0,
                max_students: c.max_students,
              })) || []}
              schoolName={schoolInfo?.name || ''}
              schoolYearLabel={yearLabel || ''}
              schoolLogoUrl={schoolInfo?.logo_url || undefined}
              preSelectedClassId={cardsClassId}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Dialog pour éditer l'ordre manuellement */}
      {editingOrderClass && (
        <Dialog open={!!editingOrderClass} onOpenChange={(open) => !open && setEditingOrderClass(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Modifier l'ordre de {editingOrderClass.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="manualOrder">Ordre (grade_order)</Label>
                <Input
                  id="manualOrder"
                  type="number"
                  min={1}
                  value={manualOrder}
                  onChange={(e) => setManualOrder(parseInt(e.target.value) || 0)}
                  placeholder="Entrez l'ordre (ex: 1, 2, 3...)"
                />
                <p className="text-xs text-muted-foreground">
                  Les classes sont triées par ordre croissant. Un ordre plus petit signifie que la classe apparaît en premier.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingOrderClass(null)}>
                Annuler
              </Button>
              <Button
                onClick={() => {
                  updateClassOrder.mutate({
                    schoolId,
                    updates: [{ id: editingOrderClass.id, grade_order: manualOrder }],
                  });
                  setEditingOrderClass(null);
                }}
              >
                Sauvegarder
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
