/**
 * Onglet Génération de bulletins
 */
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { BookOpen, FileText, Download, Users, Printer, Loader2, Search, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBulletinTemplates, useSaveReportCard } from '../../hooks/useBulletins';
import { toast } from 'sonner';

interface BulletinGenerationTabProps {
  availableClasses: Array<{
    id: string;
    name: string;
    cycle: string;
    current_students: number;
    max_students: number;
  }>;
  schoolId: string;
  schoolYearId: string;
}

interface Student {
  id: string;
  first_name: string;
  last_name: string;
}

export const BulletinGenerationTab: React.FC<BulletinGenerationTabProps> = ({ 
  availableClasses,
  schoolId,
  schoolYearId 
}) => {
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [selectAll, setSelectAll] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const selectedClass = availableClasses.find(c => c.id === selectedClassId);

  // Fetch grading periods
  const { data: periods = [] } = useQuery({
    queryKey: ['grading-periods', schoolYearId],
    queryFn: async () => {
      if (!schoolYearId) return [];
      const { data, error } = await supabase
        .from('grading_periods')
        .select('*')
        .eq('school_year_id', schoolYearId)
        .order('start_date', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!schoolYearId,
  });

  // Fetch templates
  const { data: templates = [] } = useBulletinTemplates(schoolId);

  // Fetch students for selected class
  const { data: students = [], isLoading: loadingStudents } = useQuery({
    queryKey: ['class-students', selectedClassId],
    queryFn: async () => {
      if (!selectedClassId) return [];
      const { data, error } = await supabase
        .from('students_school')
        .select('id, first_name, last_name')
        .eq('class_id', selectedClassId)
        .order('last_name', { ascending: true });
      if (error) throw error;
      return data as Student[];
    },
    enabled: !!selectedClassId,
  });

  const saveReportCard = useSaveReportCard();

  // Filter students based on search
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return students.filter(s => 
      !selectedStudents.includes(s.id) &&
      (`${s.last_name} ${s.first_name}`.toLowerCase().includes(query) ||
       `${s.first_name} ${s.last_name}`.toLowerCase().includes(query))
    );
  }, [students, searchQuery, selectedStudents]);

  // Get selected student objects
  const selectedStudentObjects = useMemo(() => {
    return students.filter(s => selectedStudents.includes(s.id));
  }, [students, selectedStudents]);

  const addStudent = (studentId: string) => {
    setSelectedStudents(prev => [...prev, studentId]);
    setSearchQuery('');
  };

  const removeStudent = (studentId: string) => {
    setSelectedStudents(prev => prev.filter(id => id !== studentId));
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedStudents([]);
    }
  };

  const handleGenerateBulletins = async () => {
    if (!selectedClassId || !selectedPeriod) {
      toast.error('Veuillez sélectionner une classe et une période');
      return;
    }

    const studentsToGenerate = selectAll ? students : students.filter(s => selectedStudents.includes(s.id));
    
    if (studentsToGenerate.length === 0) {
      toast.error('Veuillez sélectionner au moins un élève');
      return;
    }

    setIsGenerating(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      for (const student of studentsToGenerate) {
        await saveReportCard.mutateAsync({
          school_id: schoolId,
          school_year_id: schoolYearId,
          grading_period_id: selectedPeriod,
          class_id: selectedClassId,
          student_id: student.id,
          template_id: selectedTemplate || undefined,
          generated_by: user?.id,
          general_average: undefined,
          rank: undefined,
          mention: undefined,
        });
      }
      
      toast.success(`${studentsToGenerate.length} bulletin(s) généré(s)`);
    } catch (error) {
      console.error('Error generating bulletins:', error);
      toast.error('Erreur lors de la génération des bulletins');
    } finally {
      setIsGenerating(false);
    }
  };

  // Set default template
  React.useEffect(() => {
    if (templates.length > 0 && !selectedTemplate) {
      const defaultTemplate = templates.find(t => t.is_default);
      if (defaultTemplate) {
        setSelectedTemplate(defaultTemplate.id);
      }
    }
  }, [templates, selectedTemplate]);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Générer des Bulletins
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto">
        <div className="space-y-6">
          {/* Sélection classe */}
          <div>
            <label className="text-sm font-medium mb-2 block">Classe</label>
            <Select value={selectedClassId} onValueChange={(v) => { setSelectedClassId(v); setSelectedStudents([]); setSelectAll(false); setSearchQuery(''); }}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner une classe" />
              </SelectTrigger>
              <SelectContent>
                {availableClasses.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id}>
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4" />
                      {cls.name}
                      <Badge variant="outline" className="ml-2">
                        {cls.current_students} élèves
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Sélection période */}
          <div>
            <label className="text-sm font-medium mb-2 block">Période</label>
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner une période" />
              </SelectTrigger>
              <SelectContent>
                {periods.map((period) => (
                  <SelectItem key={period.id} value={period.id}>
                    {period.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Sélection template */}
          <div>
            <label className="text-sm font-medium mb-2 block">Template</label>
            <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name} {template.is_default && '(par défaut)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Sélection élèves */}
          {selectedClassId && (
            <div>
              <label className="text-sm font-medium mb-2 block">Élèves</label>
              <Card className="p-4">
                {/* Checkbox sélectionner tous */}
                <div className="flex items-center gap-2 mb-4">
                  <Checkbox 
                    id="selectAll"
                    checked={selectAll}
                    onCheckedChange={handleSelectAll}
                  />
                  <label htmlFor="selectAll" className="text-sm font-medium cursor-pointer">
                    Sélectionner tous les élèves ({students.length})
                  </label>
                </div>

                {/* Recherche d'élèves (masqué si "tous" est coché) */}
                {!selectAll && (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher un élève..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                    
                    {/* Résultats de recherche */}
                    {filteredStudents.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-auto">
                        {filteredStudents.map((student) => (
                          <button
                            key={student.id}
                            onClick={() => addStudent(student.id)}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                          >
                            {student.last_name} {student.first_name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Élèves sélectionnés */}
                {!selectAll && selectedStudentObjects.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {selectedStudentObjects.map((student) => (
                      <Badge key={student.id} variant="secondary" className="flex items-center gap-1 pr-1">
                        {student.last_name} {student.first_name}
                        <button
                          onClick={() => removeStudent(student.id)}
                          className="ml-1 hover:bg-muted rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Compteur */}
                {!selectAll && selectedStudents.length > 0 && (
                  <div className="mt-3 pt-3 border-t text-sm text-muted-foreground">
                    {selectedStudents.length} élève(s) sélectionné(s)
                  </div>
                )}

                {loadingStudents && (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <Button 
              onClick={handleGenerateBulletins}
              disabled={!selectedClassId || !selectedPeriod || isGenerating || (!selectAll && selectedStudents.length === 0)}
              className="flex-1"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Générer PDF
            </Button>
            <Button 
              variant="outline"
              disabled={!selectedClassId || !selectedPeriod || isGenerating}
            >
              <Printer className="h-4 w-4 mr-2" />
              Imprimer
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};