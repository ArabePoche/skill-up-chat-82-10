/**
 * Onglet Historique des bulletins générés
 */
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { History, Download, Eye, Search, FileText, Calendar, Users, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useReportCardHistory } from '../../hooks/useBulletins';
import { useSchoolClasses } from '@/school/hooks/useClasses';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface BulletinHistoryTabProps {
  schoolId: string;
  schoolYearId: string;
}

export const BulletinHistoryTab: React.FC<BulletinHistoryTabProps> = ({ 
  schoolId,
  schoolYearId 
}) => {
  const [filterClass, setFilterClass] = useState<string>('all');
  const [filterPeriod, setFilterPeriod] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch classes for filter
  const { data: classes = [] } = useSchoolClasses(schoolId, schoolYearId);

  // Fetch grading periods for filter
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

  // Fetch history with filters
  const { data: history = [], isLoading } = useReportCardHistory(
    schoolId, 
    schoolYearId,
    {
      classId: filterClass !== 'all' ? filterClass : undefined,
      periodId: filterPeriod !== 'all' ? filterPeriod : undefined,
    }
  );

  // Group by class and period for display
  const groupedHistory = history.reduce((acc, record) => {
    const key = `${record.class_id}-${record.grading_period_id}`;
    if (!acc[key]) {
      acc[key] = {
        classId: record.class_id,
        className: record.class?.name || 'Classe inconnue',
        periodId: record.grading_period_id,
        periodName: record.period?.name || 'Période inconnue',
        generatedAt: record.generated_at,
        generatedBy: record.generator 
          ? `${record.generator.first_name} ${record.generator.last_name}`
          : 'Inconnu',
        students: [],
      };
    }
    acc[key].students.push(record);
    return acc;
  }, {} as Record<string, {
    classId: string;
    className: string;
    periodId: string;
    periodName: string;
    generatedAt: string;
    generatedBy: string;
    students: typeof history;
  }>);

  const groupedList = Object.values(groupedHistory).filter(group => {
    if (searchQuery) {
      return group.className.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Filtres */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher une classe..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <Select value={filterClass} onValueChange={setFilterClass}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Classe" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les classes</SelectItem>
            {classes.map((cls) => (
              <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterPeriod} onValueChange={setFilterPeriod}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Période" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les périodes</SelectItem>
            {periods.map((period) => (
              <SelectItem key={period.id} value={period.id}>{period.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Liste des bulletins */}
      <Card className="flex-1 overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="w-4 h-4" />
            Historique des générations
            <Badge variant="outline" className="ml-auto">
              {groupedList.length} génération{groupedList.length !== 1 ? 's' : ''}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-auto">
          {groupedList.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Aucun bulletin généré</p>
              <p className="text-sm text-muted-foreground">
                Générez vos premiers bulletins depuis l'onglet "Génération"
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {groupedList.map((group) => (
                <div 
                  key={`${group.classId}-${group.periodId}`}
                  className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium">{group.className}</h4>
                        <Badge variant="outline">{group.periodName}</Badge>
                        <Badge variant="default" className="bg-green-500">
                          {group.students.length} bulletin{group.students.length > 1 ? 's' : ''}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(group.generatedAt), 'dd MMM yyyy à HH:mm', { locale: fr })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {group.students.length} élèves
                        </span>
                        <span>Par {group.generatedBy}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4 mr-1" />
                        Voir
                      </Button>
                      <Button variant="outline" size="sm">
                        <Download className="w-4 h-4 mr-1" />
                        Télécharger
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
