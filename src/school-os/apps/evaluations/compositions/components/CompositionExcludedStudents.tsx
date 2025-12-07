/**
 * Gestion des élèves exclus avec recherche
 */
import React, { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, X, UserMinus, UserPlus } from 'lucide-react';
import type { ClassWithDetails, ClassStudent } from '../hooks/useClassesWithSubjectsAndStudents';

interface CompositionExcludedStudentsProps {
  classesDetails: ClassWithDetails[];
  excludedStudents: string[];
  onExcludedChange: (excluded: string[]) => void;
}

export const CompositionExcludedStudents: React.FC<CompositionExcludedStudentsProps> = ({
  classesDetails,
  excludedStudents,
  onExcludedChange,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Tous les élèves de toutes les classes
  const allStudents = useMemo(() => {
    const students: (ClassStudent & { className: string })[] = [];
    classesDetails.forEach(cls => {
      cls.students.forEach(student => {
        students.push({ ...student, className: cls.name });
      });
    });
    return students;
  }, [classesDetails]);

  // Filtrer les élèves selon la recherche
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return allStudents.filter(s =>
      !excludedStudents.includes(s.id) && (
      s.first_name.toLowerCase().includes(query) ||
        s.last_name.toLowerCase().includes(query) ||
        s.student_code?.toLowerCase().includes(query) ||
        s.className.toLowerCase().includes(query)
      )
    ).slice(0, 10); // Limiter à 10 résultats
  }, [allStudents, searchQuery, excludedStudents]);

  // Élèves actuellement exclus
  const excludedStudentsList = useMemo(() => {
    return allStudents.filter(s => excludedStudents.includes(s.id));
  }, [allStudents, excludedStudents]);

  const excludeStudent = (studentId: string) => {
    if (!excludedStudents.includes(studentId)) {
      onExcludedChange([...excludedStudents, studentId]);
    }
    setSearchQuery('');
  };

  const reintegrateStudent = (studentId: string) => {
    onExcludedChange(excludedStudents.filter(id => id !== studentId));
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <UserMinus className="h-5 w-5" />
          Exclusion d'élèves
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Recherchez et excluez des élèves individuellement du bulletin
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Recherche */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher un élève par nom, prénom ou matricule..."
            className="pl-10"
          />

          {/* Résultats de recherche */}
          {filteredStudents.length > 0 && (
            <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-popover border rounded-lg shadow-lg">
              {filteredStudents.map(student => (
                <button
                  key={student.id}
                  type="button"
                  onClick={() => excludeStudent(student.id)}
                  className="w-full flex items-center justify-between p-3 hover:bg-muted/50 text-left border-b last:border-b-0"
                >
                  <div>
                    <p className="font-medium">
                      {student.last_name} {student.first_name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {student.className}
                      {student.student_code && ` • ${student.student_code}`}
                    </p>
                  </div>
                  <UserMinus className="h-4 w-4 text-destructive" />
                </button>
              ))}
            </div>
          )}

          {searchQuery.trim() && filteredStudents.length === 0 && (
            <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-popover border rounded-lg shadow-lg p-3">
              <p className="text-sm text-muted-foreground text-center">
                Aucun élève trouvé
              </p>
            </div>
          )}
        </div>

        {/* Liste des élèves exclus */}
        {excludedStudentsList.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">
                Élèves exclus ({excludedStudentsList.length})
              </h4>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onExcludedChange([])}
              >
                Tout réintégrer
              </Button>
            </div>

            <ScrollArea className="max-h-48">
              <div className="space-y-1">
                {excludedStudentsList.map(student => (
                  <div
                    key={student.id}
                    className="flex items-center justify-between p-2 bg-destructive/5 rounded border border-destructive/20"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {student.className}
                      </Badge>
                      <span className="text-sm">
                        {student.last_name} {student.first_name}
                      </span>
                      {student.student_code && (
                        <span className="text-xs text-muted-foreground">
                          ({student.student_code})
                        </span>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => reintegrateStudent(student.id)}
                      className="h-7 px-2"
                    >
                      <UserPlus className="h-4 w-4 text-primary" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {excludedStudentsList.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Aucun élève exclu. Utilisez la recherche pour exclure des élèves.
          </p>
        )}
      </CardContent>
    </Card>
  );
};
