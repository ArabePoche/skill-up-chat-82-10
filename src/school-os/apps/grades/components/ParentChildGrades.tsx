// Composant pour afficher les notes d'un enfant (vue parent, lecture seule)
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

interface ParentChildGradesProps {
  studentId: string;
  classId: string | null;
}

interface GradeRow {
  id: string;
  score: number | null;
  is_absent: boolean | null;
  is_excused: boolean | null;
  evaluation_name: string;
  subject_name: string;
  max_score: number;
  date: string | null;
}

export const ParentChildGrades: React.FC<ParentChildGradesProps> = ({ studentId, classId }) => {
  const { data: grades, isLoading } = useQuery({
    queryKey: ['parent-child-grades', studentId],
    queryFn: async (): Promise<GradeRow[]> => {
      // Fetch grades with evaluation and subject info
      const { data, error } = await supabase
        .from('grades')
        .select(`
          id, score, is_absent, is_excused,
          evaluation_id
        `)
        .eq('student_id', studentId)
        .order('entered_at', { ascending: false });

      if (error) throw error;
      if (!data || data.length === 0) return [];

      // Get evaluation details
      const evalIds = [...new Set(data.map(g => g.evaluation_id))];
      
      const { data: evals } = await (supabase as any)
        .from('class_evaluations')
        .select('id, name, max_score, date, subject_id, subjects(name)')
        .in('id', evalIds);

      const evalMap = new Map();
      (evals || []).forEach((e: any) => evalMap.set(e.id, e));

      return data.map(g => {
        const ev = evalMap.get(g.evaluation_id);
        return {
          id: g.id,
          score: g.score,
          is_absent: g.is_absent,
          is_excused: g.is_excused,
          evaluation_name: ev?.name || 'Évaluation',
          subject_name: ev?.subjects?.name || 'Matière',
          max_score: ev?.max_score || 20,
          date: ev?.date || null,
        };
      });
    },
    enabled: !!studentId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!grades || grades.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        Aucune note enregistrée pour le moment
      </p>
    );
  }

  // Group by subject
  const bySubject = grades.reduce((acc, g) => {
    if (!acc[g.subject_name]) acc[g.subject_name] = [];
    acc[g.subject_name].push(g);
    return acc;
  }, {} as Record<string, GradeRow[]>);

  return (
    <div className="space-y-3">
      {Object.entries(bySubject).map(([subject, subjectGrades]) => {
        const avg = subjectGrades.filter(g => g.score !== null).reduce((sum, g) => sum + (g.score! / g.max_score * 20), 0) / subjectGrades.filter(g => g.score !== null).length;
        
        return (
          <div key={subject} className="border rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-sm">{subject}</span>
              {!isNaN(avg) && (
                <Badge variant={avg >= 10 ? 'default' : 'destructive'} className="text-xs">
                  Moy: {avg.toFixed(1)}/20
                </Badge>
              )}
            </div>
            <div className="space-y-1">
              {subjectGrades.map(g => (
                <div key={g.id} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground truncate flex-1">{g.evaluation_name}</span>
                  <span className="font-medium ml-2">
                    {g.is_absent ? (
                      <Badge variant="outline" className="text-xs">Absent</Badge>
                    ) : g.score !== null ? (
                      <span className={g.score / g.max_score >= 0.5 ? 'text-green-600' : 'text-red-500'}>
                        {g.score}/{g.max_score}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};
