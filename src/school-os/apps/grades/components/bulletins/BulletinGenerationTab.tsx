/**
 * Onglet Génération de bulletins - Basé sur les Compositions/Examens
 * 
 * Nouvelle logique:
 * 1. Sélection d'une Composition/Examen comme source principale
 * 2. Note de composition (obligatoire) = provient de la composition
 * 3. Note de classe (optionnelle) = depuis évaluation existante OU saisie manuelle
 */
import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { BookOpen, FileText, Download, Printer, Loader2, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBulletinTemplates, BulletinTemplate } from '../../hooks/useBulletins';
import { StudentBulletinCard, StudentBulletinData, SubjectGrade } from './StudentBulletinCard';
import { CompositionSelector } from './CompositionSelector';
import { ClassNotesSection, ClassNotesConfig } from './ClassNotesSection';
import { 
  useCompositionsForClass, 
  useBulletinFromComposition,
  useEvaluationsForClassNotes 
} from '../../hooks/useBulletinFromComposition';
import { exportBulletinsToPdf } from '../../utils/bulletinPdfExport';
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

interface ManualClassNote {
  studentId: string;
  subjectId: string;
  score: number | null;
}

export const BulletinGenerationTab: React.FC<BulletinGenerationTabProps> = ({ 
  availableClasses,
  schoolId,
  schoolYearId 
}) => {
  // Sélections principales
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedCompositionId, setSelectedCompositionId] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [expandedAll, setExpandedAll] = useState(true);
  
  // Configuration des notes de classe
  const [classNotesConfig, setClassNotesConfig] = useState<ClassNotesConfig>({
    method: 'manual',
    selectedEvaluationId: undefined,
  });

  // Notes de classe saisies manuellement (studentId-subjectId -> score)
  const [manualClassNotes, setManualClassNotes] = useState<Map<string, number | null>>(new Map());

  // Récupérer les compositions pour la classe sélectionnée
  const { data: compositions = [], isLoading: loadingCompositions } = useCompositionsForClass(
    schoolId,
    schoolYearId,
    selectedClassId
  );

  // Récupérer les données du bulletin
  const { data: bulletinData, isLoading: loadingBulletin } = useBulletinFromComposition(
    selectedCompositionId,
    selectedClassId
  );

  // Récupérer les évaluations pour les notes de classe
  const { data: evaluationsForClassNotes = [], isLoading: loadingEvaluations } = useEvaluationsForClassNotes(
    selectedClassId,
    schoolYearId
  );

  // Récupérer les notes de l'évaluation source (si méthode "evaluation")
  const { data: evaluationGrades = [] } = useQuery({
    queryKey: ['evaluation-grades-for-class-notes', classNotesConfig.selectedEvaluationId],
    queryFn: async () => {
      if (!classNotesConfig.selectedEvaluationId) return [];
      const { data, error } = await supabase
        .from('grades')
        .select('student_id, subject_id, score, is_absent')
        .eq('evaluation_id', classNotesConfig.selectedEvaluationId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!classNotesConfig.selectedEvaluationId && classNotesConfig.method === 'evaluation',
  });

  // Templates
  const { data: templates = [] } = useBulletinTemplates(schoolId);

  // Composition sélectionnée
  const selectedComposition = compositions.find(c => c.id === selectedCompositionId);

  // Réinitialiser quand la classe change
  useEffect(() => {
    setSelectedCompositionId('');
    setManualClassNotes(new Map());
    setClassNotesConfig({ method: 'manual', selectedEvaluationId: undefined });
  }, [selectedClassId]);

  // Réinitialiser les notes manuelles quand la composition change
  useEffect(() => {
    setManualClassNotes(new Map());
  }, [selectedCompositionId]);

  // Template par défaut
  useEffect(() => {
    if (templates.length > 0 && !selectedTemplate) {
      const defaultTemplate = templates.find(t => t.is_default);
      if (defaultTemplate) {
        setSelectedTemplate(defaultTemplate.id);
      }
    }
  }, [templates, selectedTemplate]);

  // Récupérer la note de classe pour un étudiant et une matière
  const getClassNoteScore = (studentId: string, subjectId: string): number | null => {
    if (!bulletinData?.includeClassNotes) return null;

    if (classNotesConfig.method === 'evaluation') {
      // Depuis l'évaluation source
      const grade = evaluationGrades.find(
        g => g.student_id === studentId && g.subject_id === subjectId && !g.is_absent
      );
      return grade?.score ?? null;
    } else {
      // Saisie manuelle
      const key = `${studentId}-${subjectId}`;
      return manualClassNotes.get(key) ?? null;
    }
  };

  // Mettre à jour une note de classe manuelle
  const handleManualClassNoteChange = (studentId: string, subjectId: string, value: string) => {
    const key = `${studentId}-${subjectId}`;
    const numValue = value === '' ? null : parseFloat(value);
    const validValue = numValue !== null && !isNaN(numValue) 
      ? Math.min(20, Math.max(0, numValue)) 
      : null;
    
    setManualClassNotes(prev => {
      const newMap = new Map(prev);
      newMap.set(key, validValue);
      return newMap;
    });
  };

  // Calculer les données des bulletins
  const bulletinsData = useMemo((): StudentBulletinData[] => {
    if (!bulletinData || !selectedCompositionId) return [];

    const { students, subjects, notes, includeClassNotes } = bulletinData;

    if (students.length === 0 || subjects.length === 0) return [];

    // Calculer les données pour chaque élève
    const studentData = students.map(student => {
      const studentNotes = notes.filter(n => n.student_id === student.id);
      
      let totalPoints = 0;
      let totalCoefficients = 0;
      let totalMaxPoints = 0;

      const gradesList: SubjectGrade[] = subjects.map(subject => {
        const note = studentNotes.find(n => n.subject_id === subject.id);
        const compositionScore = note?.composition_note ?? null;
        const classNoteScore = includeClassNotes 
          ? (note?.class_note ?? getClassNoteScore(student.id, subject.id))
          : null;
        const maxScore = 20;

        if (compositionScore !== null) {
          totalPoints += compositionScore * subject.coefficient;
          totalCoefficients += subject.coefficient;
        }
        totalMaxPoints += maxScore * subject.coefficient;

        return {
          subjectId: subject.id,
          subjectName: subject.name,
          score: compositionScore,
          maxScore,
          coefficient: subject.coefficient,
          isAbsent: compositionScore === null,
          classGradeScore: classNoteScore,
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
        hasClassGrades: includeClassNotes,
      };
    });

    // Calculer la moyenne de classe
    const validAverages = studentData.filter(d => d.average !== null).map(d => d.average as number);
    const classAverage = validAverages.length > 0 
      ? validAverages.reduce((sum, avg) => sum + avg, 0) / validAverages.length 
      : 0;

    // Trier par moyenne pour calculer les rangs
    const sorted = [...studentData]
      .filter(d => d.average !== null)
      .sort((a, b) => (b.average || 0) - (a.average || 0));
    
    const firstAverage = sorted.length > 0 ? (sorted[0].average || 0) : 0;

    // Assigner les rangs et statistiques
    sorted.forEach((data, index) => {
      data.rank = index + 1;
      data.classAverage = classAverage;
      data.firstAverage = firstAverage;
      data.mention = getMention(data.average);
      data.appreciation = getAppreciation(data.average);
    });

    // Gérer les élèves sans notes
    studentData.forEach(data => {
      if (data.average === null) {
        data.rank = students.length;
        data.classAverage = classAverage;
        data.firstAverage = firstAverage;
        data.mention = 'Non évalué';
        data.appreciation = 'Aucune note disponible pour cette composition.';
      }
    });

    return studentData;
  }, [bulletinData, selectedCompositionId, evaluationGrades, manualClassNotes, classNotesConfig]);

  // Statistiques de classe
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

  // Template sélectionné
  const currentTemplate = useMemo(() => {
    return templates.find(t => t.id === selectedTemplate) || null;
  }, [templates, selectedTemplate]);

  const isLoading = loadingCompositions || loadingBulletin;

  // Export PDF
  const handleExportPDF = async () => {
    if (bulletinsData.length === 0) {
      toast.error('Aucun bulletin à exporter');
      return;
    }

    try {
      const selectedClass = availableClasses.find(c => c.id === selectedClassId);
      const className = selectedClass?.name || 'Classe';
      const compositionTitle = selectedComposition?.title || 'Composition';

      await exportBulletinsToPdf({
        className,
        evaluationTitle: compositionTitle,
        template: currentTemplate,
        bulletins: bulletinsData,
      });

      toast.success('PDF exporté avec succès');
    } catch (error) {
      console.error('Export PDF error:', error);
      toast.error("Erreur lors de l'export PDF");
    }
  };

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
                onValueChange={setSelectedClassId}
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

            {/* Sélection Composition/Examen */}
            <div>
              <label className="text-sm font-medium mb-2 block">Composition / Examen</label>
              <CompositionSelector
                compositions={compositions}
                selectedCompositionId={selectedCompositionId}
                onSelect={setSelectedCompositionId}
                isLoading={loadingCompositions}
                disabled={!selectedClassId}
              />
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
          {selectedCompositionId && bulletinsData.length > 0 && (
            <div className="flex gap-3 mt-4 pt-4 border-t">
              <Button 
                variant="outline"
                onClick={() => setExpandedAll(!expandedAll)}
                className="gap-2"
              >
                {expandedAll ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                {expandedAll ? 'Réduire tout' : 'Déplier tout'}
              </Button>
              <Button className="gap-2" onClick={handleExportPDF}>
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

      {/* Section Notes de Classe (si activée dans la composition) */}
      {selectedCompositionId && bulletinData?.includeClassNotes && (
        <ClassNotesSection
          evaluations={evaluationsForClassNotes}
          config={classNotesConfig}
          onConfigChange={setClassNotesConfig}
          isLoading={loadingEvaluations}
        />
      )}

      {/* Info si notes de classe désactivées */}
      {selectedCompositionId && bulletinData && !bulletinData.includeClassNotes && (
        <Card className="bg-muted/30">
          <CardContent className="py-4">
            <div className="flex items-center gap-3 text-muted-foreground">
              <AlertCircle className="h-5 w-5" />
              <p className="text-sm">
                Les notes de classe ne sont pas activées pour cette composition.
                Le bulletin affichera uniquement les notes de composition.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Statistiques de classe */}
      {selectedCompositionId && bulletinsData.length > 0 && (
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
                <p className="text-lg font-semibold">{selectedComposition?.title}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading state */}
      {isLoading && selectedCompositionId && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Bulletins */}
      {!isLoading && selectedCompositionId && bulletinsData.length > 0 && (
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

      {/* Empty state - pas d'élèves */}
      {!isLoading && selectedCompositionId && bulletinsData.length === 0 && bulletinData && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Aucun élève trouvé pour cette composition.</p>
          </CardContent>
        </Card>
      )}

      {/* Empty state - pas de composition sélectionnée */}
      {!selectedCompositionId && selectedClassId && !loadingCompositions && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            {compositions.length === 0 ? (
              <>
                <p className="font-medium">Aucune composition trouvée pour cette classe.</p>
                <p className="text-sm mt-2">
                  Créez d'abord une composition dans le module Évaluations → Compositions & Examens.
                </p>
              </>
            ) : (
              <p>Sélectionnez une composition pour générer les bulletins.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Empty state - pas de classe */}
      {!selectedClassId && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Sélectionnez une classe pour commencer.</p>
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
