/**
 * Onglet Génération de bulletins - Utilise les évaluations comme périodes
 */
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, FileText, Download, Printer, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBulletinTemplates } from '../../hooks/useBulletins';
import { StudentBulletinCard, StudentBulletinData, SubjectGrade } from './StudentBulletinCard';

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
  student_code?: string;
  photo_url?: string;
}

interface Evaluation {
  id: string;
  title: string;
  evaluation_type_name: string;
  evaluation_date: string;
}

interface Grade {
  id: string;
  student_id: string;
  subject_id: string;
  score: number | null;
  is_absent: boolean;
  comment: string | null;
}

interface Subject {
  id: string;
  name: string;
  coefficient: number;
}

export const BulletinGenerationTab: React.FC<BulletinGenerationTabProps> = ({ 
  availableClasses,
  schoolId,
  schoolYearId 
}) => {
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedEvaluationId, setSelectedEvaluationId] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [expandedAll, setExpandedAll] = useState(true);

  // Fetch evaluations for selected class
  const { data: evaluations = [], isLoading: loadingEvaluations } = useQuery({
    queryKey: ['class-evaluations-periods', selectedClassId, schoolYearId],
    queryFn: async () => {
      if (!selectedClassId || !schoolYearId) return [];
      
      // Get evaluations that have this class configured
      const { data: classConfigs, error: configError } = await supabase
        .from('school_evaluation_class_configs')
        .select('evaluation_id')
        .eq('class_id', selectedClassId);
      
      if (configError) throw configError;
      if (!classConfigs || classConfigs.length === 0) return [];
      
      const evaluationIds = classConfigs.map(c => c.evaluation_id);
      
      const { data, error } = await supabase
        .from('school_evaluations')
        .select(`
          id,
          title,
          evaluation_date,
          school_evaluation_types (name)
        `)
        .in('id', evaluationIds)
        .eq('school_year_id', schoolYearId)
        .order('evaluation_date', { ascending: false });
      
      if (error) throw error;
      
      return (data || []).map((e: any) => ({
        id: e.id,
        title: e.title,
        evaluation_type_name: e.school_evaluation_types?.name || 'Non défini',
        evaluation_date: e.evaluation_date,
      })) as Evaluation[];
    },
    enabled: !!selectedClassId && !!schoolYearId,
  });

  // Fetch templates
  const { data: templates = [] } = useBulletinTemplates(schoolId);

  // Fetch students for selected class
  const { data: students = [], isLoading: loadingStudents } = useQuery({
    queryKey: ['class-students-bulletins', selectedClassId],
    queryFn: async () => {
      if (!selectedClassId) return [];
      const { data, error } = await supabase
        .from('students_school')
        .select('id, first_name, last_name, student_code, photo_url')
        .eq('class_id', selectedClassId)
        .order('last_name', { ascending: true });
      if (error) throw error;
      return data as Student[];
    },
    enabled: !!selectedClassId,
  });

  // Fetch grades for selected evaluation
  const { data: grades = [], isLoading: loadingGrades } = useQuery({
    queryKey: ['evaluation-grades-bulletins', selectedEvaluationId],
    queryFn: async () => {
      if (!selectedEvaluationId) return [];
      const { data, error } = await supabase
        .from('grades')
        .select('id, student_id, subject_id, score, is_absent, comment')
        .eq('evaluation_id', selectedEvaluationId);
      if (error) throw error;
      return data as Grade[];
    },
    enabled: !!selectedEvaluationId,
  });

  // Fetch subjects with coefficients for the class
  const { data: classSubjects = [] } = useQuery({
    queryKey: ['class-subjects-bulletins', selectedClassId],
    queryFn: async () => {
      if (!selectedClassId) return [];
      const { data, error } = await supabase
        .from('class_subjects')
        .select(`
          subject_id,
          coefficient,
          subjects (id, name)
        `)
        .eq('class_id', selectedClassId);
      if (error) throw error;
      return (data || []).map((cs: any) => ({
        id: cs.subject_id,
        name: cs.subjects?.name || 'Matière inconnue',
        coefficient: cs.coefficient || 1,
      })) as Subject[];
    },
    enabled: !!selectedClassId,
  });

  // Calculate bulletins data for all students
  const bulletinsData = useMemo((): StudentBulletinData[] => {
    if (!selectedEvaluationId || students.length === 0 || classSubjects.length === 0) {
      return [];
    }

    // Calculate data for each student
    const studentData = students.map(student => {
      const studentGrades = grades.filter(g => g.student_id === student.id);
      
      let totalPoints = 0;
      let totalCoefficients = 0;
      let totalMaxPoints = 0;

      const gradesList: SubjectGrade[] = classSubjects.map(subject => {
        const grade = studentGrades.find(g => g.subject_id === subject.id);
        const score = grade?.score ?? null;
        const isAbsent = grade?.is_absent ?? false;
        const maxScore = 20;

        if (score !== null && !isAbsent) {
          totalPoints += score * subject.coefficient;
          totalCoefficients += subject.coefficient;
        }
        totalMaxPoints += maxScore * subject.coefficient;

        return {
          subjectId: subject.id,
          subjectName: subject.name,
          score,
          maxScore,
          coefficient: subject.coefficient,
          isAbsent,
        };
      });

      const average = totalCoefficients > 0 ? totalPoints / totalCoefficients : null;

      return {
        studentId: student.id,
        studentName: `${student.last_name} ${student.first_name}`,
        studentCode: student.student_code || '-',
        photoUrl: student.photo_url,
        grades: gradesList,
        average,
        totalPoints,
        totalMaxPoints,
        rank: 0,
        totalStudents: students.length,
        classAverage: 0,
        firstAverage: 0,
        appreciation: '',
        mention: '',
      };
    });

    // Calculate class average
    const validAverages = studentData.filter(d => d.average !== null).map(d => d.average as number);
    const classAverage = validAverages.length > 0 
      ? validAverages.reduce((sum, avg) => sum + avg, 0) / validAverages.length 
      : 0;

    // Sort by average descending to calculate ranks
    const sorted = [...studentData]
      .filter(d => d.average !== null)
      .sort((a, b) => (b.average || 0) - (a.average || 0));
    
    const firstAverage = sorted.length > 0 ? (sorted[0].average || 0) : 0;

    // Assign ranks, mentions, appreciations, and class stats
    sorted.forEach((data, index) => {
      data.rank = index + 1;
      data.classAverage = classAverage;
      data.firstAverage = firstAverage;
      data.mention = getMention(data.average);
      data.appreciation = getAppreciation(data.average);
    });

    // Handle students without grades
    studentData.forEach(data => {
      if (data.average === null) {
        data.rank = students.length;
        data.classAverage = classAverage;
        data.firstAverage = firstAverage;
        data.mention = 'Non évalué';
        data.appreciation = 'Aucune note disponible pour cette évaluation.';
      }
    });

    return studentData;
  }, [students, grades, classSubjects, selectedEvaluationId]);

  // Calculate class statistics
  const classStats = useMemo(() => {
    if (bulletinsData.length === 0) {
      return { classAverage: 0, bestAverage: 0 };
    }

    const validAverages = bulletinsData.filter(b => b.average !== null).map(b => b.average as number);
    const classAverage = validAverages.length > 0 
      ? validAverages.reduce((sum, avg) => sum + avg, 0) / validAverages.length 
      : 0;
    const bestAverage = validAverages.length > 0 ? Math.max(...validAverages) : 0;

    return { classAverage, bestAverage };
  }, [bulletinsData]);

  const selectedEvaluation = evaluations.find(e => e.id === selectedEvaluationId);
  const isLoading = loadingStudents || loadingGrades || loadingEvaluations;

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
    <div className="space-y-6">
      {/* Sélecteurs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Générer des Bulletins
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Sélection classe */}
            <div>
              <label className="text-sm font-medium mb-2 block">Classe</label>
              <Select 
                value={selectedClassId} 
                onValueChange={(v) => { 
                  setSelectedClassId(v); 
                  setSelectedEvaluationId(''); 
                }}
              >
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

            {/* Sélection évaluation (période) */}
            <div>
              <label className="text-sm font-medium mb-2 block">Évaluation (Période)</label>
              <Select 
                value={selectedEvaluationId} 
                onValueChange={setSelectedEvaluationId}
                disabled={!selectedClassId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une évaluation" />
                </SelectTrigger>
                <SelectContent>
                  {evaluations.map((evaluation) => (
                    <SelectItem key={evaluation.id} value={evaluation.id}>
                      <div className="flex items-center gap-2">
                        {evaluation.title}
                        <Badge variant="secondary" className="ml-2">
                          {evaluation.evaluation_type_name}
                        </Badge>
                      </div>
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
          </div>

          {/* Actions */}
          {selectedEvaluationId && bulletinsData.length > 0 && (
            <div className="flex gap-3 mt-4 pt-4 border-t">
              <Button 
                variant="outline"
                onClick={() => setExpandedAll(!expandedAll)}
                className="gap-2"
              >
                {expandedAll ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                {expandedAll ? 'Réduire tout' : 'Déplier tout'}
              </Button>
              <Button className="gap-2">
                <Download className="h-4 w-4" />
                Exporter PDF
              </Button>
              <Button variant="outline" className="gap-2">
                <Printer className="h-4 w-4" />
                Imprimer
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Statistiques de classe */}
      {selectedEvaluationId && bulletinsData.length > 0 && (
        <Card>
          <CardContent className="py-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-sm text-muted-foreground">Effectif</p>
                <p className="text-2xl font-bold">{bulletinsData.length}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Moyenne de classe</p>
                <p className="text-2xl font-bold">{classStats.classAverage.toFixed(2)}/20</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Meilleure moyenne</p>
                <p className="text-2xl font-bold text-green-600">{classStats.bestAverage.toFixed(2)}/20</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Période</p>
                <p className="text-lg font-semibold">{selectedEvaluation?.title}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading state */}
      {isLoading && selectedEvaluationId && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Bulletins automatiques */}
      {!isLoading && selectedEvaluationId && bulletinsData.length > 0 && (
        <div className="space-y-4">
          {bulletinsData.map((data) => (
            <StudentBulletinCard
              key={data.studentId}
              data={data}
              defaultOpen={expandedAll}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && selectedEvaluationId && bulletinsData.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Aucun élève trouvé dans cette classe.</p>
          </CardContent>
        </Card>
      )}

      {/* Prompt to select */}
      {!selectedEvaluationId && selectedClassId && !loadingEvaluations && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            {evaluations.length === 0 ? (
              <p>Aucune évaluation trouvée pour cette classe.</p>
            ) : (
              <p>Sélectionnez une évaluation pour générer les bulletins.</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// Helper functions
function getMention(average: number | null): string {
  if (average === null) return 'Non évalué';
  if (average >= 16) return 'Très Bien';
  if (average >= 14) return 'Bien';
  if (average >= 12) return 'Assez Bien';
  if (average >= 10) return 'Passable';
  return 'Insuffisant';
}

function getAppreciation(average: number | null): string {
  if (average === null) return 'Aucune note disponible.';
  if (average >= 18) return 'Excellent travail ! Continuez ainsi.';
  if (average >= 16) return 'Très bon travail. Félicitations !';
  if (average >= 14) return 'Bon travail. Continuez vos efforts.';
  if (average >= 12) return 'Travail satisfaisant. Peut mieux faire.';
  if (average >= 10) return 'Résultats justes. Des efforts sont nécessaires.';
  return 'Résultats insuffisants. Un travail plus soutenu est indispensable.';
}
