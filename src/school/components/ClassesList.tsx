// Composant pour afficher la liste des classes
import React from 'react';
import { Users, Trash2, GraduationCap, UserCheck, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useSchoolClasses, useDeleteClass } from '../hooks/useClasses';
import { CreateClassModal } from './CreateClassModal';
import { EditClassModal } from './EditClassModal';

interface ClassesListProps {
  schoolId: string;
  schoolYearId: string;
}

const CYCLE_COLORS: Record<string, string> = {
  maternel: 'bg-pink-500/10 text-pink-700 dark:text-pink-400 border-pink-500/20',
  primaire: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
  collège: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20',
  lycée: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20',
  université: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20',
};

export const ClassesList: React.FC<ClassesListProps> = ({
  schoolId,
  schoolYearId,
}) => {
  const { data: classes, isLoading } = useSchoolClasses(schoolId, schoolYearId);
  const deleteClass = useDeleteClass();

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

  // Calcul des statistiques
  const totalStudents = classes?.reduce((sum, cls) => sum + cls.current_students, 0) || 0;
  const totalCapacity = classes?.reduce((sum, cls) => sum + cls.max_students, 0) || 0;
  const averageOccupancy = totalCapacity > 0 ? (totalStudents / totalCapacity) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* En-tête avec statistiques */}
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Gestion des Classes</h2>
            <p className="text-muted-foreground mt-1">
              Gérez les classes de votre établissement
            </p>
          </div>
          <CreateClassModal schoolId={schoolId} schoolYearId={schoolYearId} />
        </div>

        {/* Statistiques globales */}
        {classes && classes.length > 0 && (
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <GraduationCap className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Classes</p>
                    <p className="text-2xl font-bold">{classes.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <UserCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Élèves inscrits</p>
                    <p className="text-2xl font-bold">{totalStudents}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">Taux d'occupation</p>
                    <p className="text-2xl font-bold">{averageOccupancy.toFixed(0)}%</p>
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
          <Accordion type="multiple" className="space-y-4" defaultValue={Object.keys(groupedClasses || {})}>
            {Object.entries(groupedClasses || {}).map(([cycle, cycleClasses]) => {
              const cycleStudents = cycleClasses.reduce((sum, cls) => sum + cls.current_students, 0);
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
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 pt-2">
                      {cycleClasses.map((cls) => {
                        const occupancyRate = (cls.current_students / cls.max_students) * 100;
                        const isFull = cls.current_students >= cls.max_students;

                        return (
                          <Card 
                            key={cls.id} 
                            className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-muted"
                          >
                            <CardHeader className="pb-3">
                              <div className="flex justify-between items-start">
                                <div className="space-y-2 flex-1">
                                  <CardTitle className="text-lg">{cls.name}</CardTitle>
                                  <div className="flex gap-2">
                                    <Badge 
                                      variant="secondary" 
                                      className="capitalize text-xs"
                                    >
                                      {cls.gender_type}
                                    </Badge>
                                  </div>
                                </div>
                                <div className="flex gap-1">
                                  <EditClassModal classData={cls} />
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDelete(cls.id)}
                                    className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive transition-colors"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
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
                                      {cls.current_students}
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
                        );
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </div>
      )}
    </div>
  );
};
