// Composant pour afficher la liste des classes
import React from 'react';
import { Users, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSchoolClasses, useDeleteClass } from '../hooks/useClasses';
import { CreateClassModal } from './CreateClassModal';

interface ClassesListProps {
  schoolId: string;
  schoolYearId: string;
}

const CYCLE_COLORS: Record<string, string> = {
  maternel: 'bg-pink-100 text-pink-700 border-pink-200',
  primaire: 'bg-blue-100 text-blue-700 border-blue-200',
  collège: 'bg-green-100 text-green-700 border-green-200',
  lycée: 'bg-purple-100 text-purple-700 border-purple-200',
  université: 'bg-orange-100 text-orange-700 border-orange-200',
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Gestion des classes</h2>
          <p className="text-muted-foreground">
            {classes?.length || 0} classe(s) créée(s)
          </p>
        </div>
        <CreateClassModal schoolId={schoolId} schoolYearId={schoolYearId} />
      </div>

      {!classes || classes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">
              Aucune classe créée pour le moment
            </p>
            <CreateClassModal schoolId={schoolId} schoolYearId={schoolYearId} />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedClasses || {}).map(([cycle, cycleClasses]) => (
            <div key={cycle}>
              <h3 className="text-lg font-semibold mb-3 capitalize">{cycle}</h3>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {cycleClasses.map((cls) => (
                  <Card key={cls.id}>
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <CardTitle className="text-lg">{cls.name}</CardTitle>
                          <Badge 
                            variant="outline" 
                            className={CYCLE_COLORS[cls.cycle]}
                          >
                            {cls.cycle}
                          </Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(cls.id)}
                          className="h-8 w-8"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Élèves</span>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          <span className="font-medium">
                            {cls.current_students}/{cls.max_students}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Type</span>
                        <Badge variant="secondary" className="capitalize">
                          {cls.gender_type}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
