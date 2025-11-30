/**
 * Section de gestion des élèves avec système d'exclusion
 */
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check, X, Search, UserX } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface StudentsSectionProps {
  classId: string;
  excludedStudents: string[];
  onExcludedStudentsChange: (excluded: string[]) => void;
}

export const StudentsSection: React.FC<StudentsSectionProps> = ({
  classId,
  excludedStudents,
  onExcludedStudentsChange,
}) => {
  const [allSelected, setAllSelected] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Récupérer tous les élèves de la classe
  const { data: students = [] } = useQuery({
    queryKey: ['class-students', classId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students_school')
        .select('id, first_name, last_name')
        .eq('class_id', classId);

      if (error) throw error;
      return data || [];
    },
  });

  const totalStudents = students.length;
  const selectedCount = allSelected ? totalStudents - excludedStudents.length : 0;

  const filteredStudents = students.filter((student: any) =>
    `${student.first_name} ${student.last_name}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  const handleToggleAll = (selectAll: boolean) => {
    setAllSelected(selectAll);
    if (selectAll) {
      onExcludedStudentsChange([]);
    } else {
      onExcludedStudentsChange(students.map((s: any) => s.id));
    }
  };

  const handleExclude = (studentId: string) => {
    onExcludedStudentsChange([...excludedStudents, studentId]);
  };

  const handleInclude = (studentId: string) => {
    onExcludedStudentsChange(excludedStudents.filter((id) => id !== studentId));
  };

  const excludedStudentsList = students.filter((s: any) =>
    excludedStudents.includes(s.id)
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-foreground">Élèves</h4>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={allSelected ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleToggleAll(true)}
          >
            <Check className="h-4 w-4 mr-2" />
            Tout cocher
          </Button>
          <Button
            type="button"
            variant={!allSelected ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleToggleAll(false)}
          >
            <X className="h-4 w-4 mr-2" />
            Tout décocher
          </Button>
        </div>
      </div>

      <div className="text-sm font-medium text-foreground">
        {selectedCount} élève{selectedCount > 1 ? 's' : ''} sélectionné{selectedCount > 1 ? 's' : ''} / {totalStudents}
      </div>

      {/* Recherche et exclusion */}
      <Collapsible open={isSearchOpen} onOpenChange={setIsSearchOpen}>
        <CollapsibleTrigger asChild>
          <Button type="button" variant="outline" size="sm" className="w-full">
            <Search className="h-4 w-4 mr-2" />
            {isSearchOpen ? 'Masquer la recherche' : 'Exclure des élèves'}
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent className="mt-3 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un élève..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {searchTerm && (
            <div className="border border-border rounded-md p-2 max-h-40 overflow-y-auto">
              {filteredStudents.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-2">Aucun élève trouvé</p>
              ) : (
                <div className="space-y-1">
                  {filteredStudents.map((student: any) => {
                    const isExcluded = excludedStudents.includes(student.id);
                    return (
                      <div
                        key={student.id}
                        className="flex items-center justify-between p-2 hover:bg-muted/50 rounded"
                      >
                        <span className="text-sm">
                          {student.first_name} {student.last_name}
                        </span>
                        <Button
                          type="button"
                          variant={isExcluded ? 'default' : 'outline'}
                          size="sm"
                          onClick={() =>
                            isExcluded ? handleInclude(student.id) : handleExclude(student.id)
                          }
                        >
                          {isExcluded ? 'Réinclure' : 'Exclure'}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>

      {/* Liste des exclus */}
      {excludedStudentsList.length > 0 && (
        <div className="border border-border rounded-md p-3 bg-muted/30">
          <div className="flex items-center gap-2 mb-2">
            <UserX className="h-4 w-4 text-destructive" />
            <span className="text-sm font-medium">
              Élèves exclus ({excludedStudentsList.length})
            </span>
          </div>
          <div className="space-y-1">
            {excludedStudentsList.map((student: any) => (
              <div
                key={student.id}
                className="flex items-center justify-between text-sm p-2 bg-background rounded"
              >
                <span>
                  {student.first_name} {student.last_name}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleInclude(student.id)}
                >
                  Réinclure
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
