/**
 * Vue statistiques détaillées des notes
 * Affiche moyennes de classe, classement élèves, moyennes par matière
 */
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  BookOpen, TrendingUp, TrendingDown, Users, Award, Target,
  BarChart3, GraduationCap, ArrowUp, ArrowDown, Minus
} from 'lucide-react';
import { useGradesStats } from '../hooks/useGradesStats';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts';

interface GradesStatsViewProps {
  availableClasses: Array<{
    id: string;
    name: string;
    cycle: string;
    current_students: number;
    max_students: number;
    subjects: Array<{ id: string; name: string }>;
  }>;
  schoolId: string;
  schoolYearId: string;
}

const getGradeColor = (average: number): string => {
  if (average >= 16) return 'hsl(var(--chart-2))';
  if (average >= 14) return 'hsl(var(--chart-1))';
  if (average >= 12) return 'hsl(var(--primary))';
  if (average >= 10) return 'hsl(var(--chart-4))';
  return 'hsl(var(--destructive))';
};

const getGradeBadge = (average: number) => {
  if (average >= 16) return { label: 'Excellent', variant: 'default' as const };
  if (average >= 14) return { label: 'Très bien', variant: 'default' as const };
  if (average >= 12) return { label: 'Bien', variant: 'secondary' as const };
  if (average >= 10) return { label: 'Passable', variant: 'outline' as const };
  return { label: 'Insuffisant', variant: 'destructive' as const };
};

export const GradesStatsView: React.FC<GradesStatsViewProps> = ({
  availableClasses,
}) => {
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const { data: stats, isLoading } = useGradesStats(selectedClassId);

  // Distribution des notes pour le graphique
  const distributionData = stats?.students
    ? [
        { range: '0-5', count: stats.students.filter(s => s.average < 5).length, color: 'hsl(var(--destructive))' },
        { range: '5-8', count: stats.students.filter(s => s.average >= 5 && s.average < 8).length, color: 'hsl(var(--chart-5))' },
        { range: '8-10', count: stats.students.filter(s => s.average >= 8 && s.average < 10).length, color: 'hsl(var(--chart-4))' },
        { range: '10-12', count: stats.students.filter(s => s.average >= 10 && s.average < 12).length, color: 'hsl(var(--chart-3))' },
        { range: '12-14', count: stats.students.filter(s => s.average >= 12 && s.average < 14).length, color: 'hsl(var(--primary))' },
        { range: '14-16', count: stats.students.filter(s => s.average >= 14 && s.average < 16).length, color: 'hsl(var(--chart-1))' },
        { range: '16-20', count: stats.students.filter(s => s.average >= 16).length, color: 'hsl(var(--chart-2))' },
      ]
    : [];

  const pieData = stats?.students
    ? [
        { name: 'Réussite (≥10)', value: stats.students.filter(s => s.average >= 10).length, fill: 'hsl(var(--chart-2))' },
        { name: 'Échec (<10)', value: stats.students.filter(s => s.average < 10).length, fill: 'hsl(var(--destructive))' },
      ]
    : [];

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Sélecteur de classe */}
      <div className="mb-3 flex-shrink-0">
        <label className="text-sm font-medium mb-1 block">Classe</label>
        <Select value={selectedClassId} onValueChange={setSelectedClassId}>
          <SelectTrigger>
            <SelectValue placeholder="Sélectionner une classe" />
          </SelectTrigger>
          <SelectContent>
            {availableClasses.map((cls) => (
              <SelectItem key={cls.id} value={cls.id}>
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  {cls.name}
                  <Badge variant="outline" className="ml-1">{cls.current_students} élèves</Badge>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!selectedClassId ? (
        <Card className="flex-1 flex items-center justify-center">
          <div className="text-center py-6">
            <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <h3 className="text-base font-semibold mb-1">Statistiques des notes</h3>
            <p className="text-sm text-muted-foreground">Sélectionnez une classe pour voir les statistiques</p>
          </div>
        </Card>
      ) : isLoading ? (
        <Card className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Chargement des statistiques...</p>
        </Card>
      ) : !stats || stats.students.length === 0 ? (
        <Card className="flex-1 flex items-center justify-center">
          <div className="text-center py-6">
            <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <h3 className="text-base font-semibold mb-1">Aucune donnée</h3>
            <p className="text-sm text-muted-foreground">Aucune note n'a été saisie pour cette classe</p>
          </div>
        </Card>
      ) : (
        <ScrollArea className="flex-1">
          <div className="space-y-4 pb-4">
            {/* Cartes résumé */}
            <div className="grid grid-cols-2 gap-2">
              <Card className="border-l-4" style={{ borderLeftColor: getGradeColor(stats.class_average) }}>
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Target className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Moy. classe</span>
                  </div>
                  <p className="text-2xl font-bold">{stats.class_average.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">/20</p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-primary">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Taux réussite</span>
                  </div>
                  <p className="text-2xl font-bold">{stats.pass_rate.toFixed(0)}%</p>
                  <p className="text-xs text-muted-foreground">≥ 10/20</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="h-4 w-4 text-chart-2" />
                    <span className="text-xs text-muted-foreground">Plus haute</span>
                  </div>
                  <p className="text-xl font-bold text-chart-2">{stats.highest_average.toFixed(2)}</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingDown className="h-4 w-4 text-destructive" />
                    <span className="text-xs text-muted-foreground">Plus basse</span>
                  </div>
                  <p className="text-xl font-bold text-destructive">{stats.lowest_average.toFixed(2)}</p>
                </CardContent>
              </Card>
            </div>

            {/* Distribution des notes */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Distribution des moyennes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={distributionData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="range" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip 
                        formatter={(value: number) => [`${value} élève(s)`, 'Effectif']}
                        contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                      />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {distributionData.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Pie réussite/échec */}
                <div className="flex items-center justify-center gap-6 mt-3">
                  <div className="h-24 w-24">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={20}
                          outerRadius={40}
                          dataKey="value"
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-1 text-sm">
                    {pieData.map((d, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.fill }} />
                        <span>{d.name}: <strong>{d.value}</strong></span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Moyennes par matière */}
            {stats.subject_averages.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    Moyennes par matière
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {stats.subject_averages.map((subject) => (
                    <div key={subject.subject_id}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium truncate mr-2">{subject.subject_name}</span>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge variant={subject.average >= 10 ? 'default' : 'destructive'} className="text-xs">
                            {subject.average.toFixed(1)}/20
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            ({subject.grades_count} notes)
                          </span>
                        </div>
                      </div>
                      <Progress value={(subject.average / 20) * 100} className="h-2" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Classement des élèves */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Award className="h-4 w-4" />
                  Classement des élèves ({stats.students.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stats.students.map((student, index) => {
                    const grade = getGradeBadge(student.average);
                    const rank = index + 1;
                    return (
                      <div
                        key={student.student_id}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/30 transition-colors"
                      >
                        {/* Rang */}
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                          rank === 1 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                          rank === 2 ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' :
                          rank === 3 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {rank <= 3 ? (
                            <Award className="h-4 w-4" />
                          ) : rank}
                        </div>

                        {/* Avatar */}
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium flex-shrink-0">
                          {student.first_name?.[0]}{student.last_name?.[0]}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {student.last_name} {student.first_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {student.grades_count} notes • Min: {student.worst_score.toFixed(1)} • Max: {student.best_score.toFixed(1)}
                          </p>
                        </div>

                        {/* Moyenne */}
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-bold" style={{ color: getGradeColor(student.average) }}>
                            {student.average.toFixed(2)}
                          </p>
                          <Badge variant={grade.variant} className="text-[10px] px-1.5 py-0">
                            {grade.label}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      )}
    </div>
  );
};
