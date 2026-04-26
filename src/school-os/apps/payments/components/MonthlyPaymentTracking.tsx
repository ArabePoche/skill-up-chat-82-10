/**
 * Composant principal pour le suivi mensuel des paiements
 * Affiche le statut de paiement par mois pour chaque élève
 */
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, Calendar, Users, AlertCircle, CheckCircle2, Clock, FileText, Filter, X } from 'lucide-react';
import { useMonthlyPaymentTracking, useFilteredTracking, StudentMonthlyTracking } from '../hooks/useMonthlyPaymentTracking';
import { useMonthlyPaymentStats } from '../hooks/useMonthlyPaymentStats';
import { MonthlyPaymentCard } from './MonthlyPaymentCard';
import { MonthlyPaymentStats } from './MonthlyPaymentStats';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslation } from 'react-i18next';

interface MonthlyPaymentTrackingProps {
  schoolId?: string;
}

export const MonthlyPaymentTracking: React.FC<MonthlyPaymentTrackingProps> = ({ schoolId }) => {
  const { t } = useTranslation();
  const { trackingData, isLoading, yearStart, schoolMonths } = useMonthlyPaymentTracking(schoolId);
  const [schoolYearId, setSchoolYearId] = React.useState<string | undefined>();

  // Récupérer l'ID de l'année scolaire active
  React.useEffect(() => {
    if (trackingData.length > 0) {
      setSchoolYearId(trackingData[0].student.school_year_id);
    }
  }, [trackingData]);
  
  const { stats: globalStats, isLoading: statsLoading } = useMonthlyPaymentStats(schoolId, schoolYearId);
  
  const [filters, setFilters] = useState({
    status: 'all' as 'all' | 'up_to_date' | 'partial' | 'late',
    classId: '',
    month: 'all',
    searchQuery: ''
  });

  const [showFilters, setShowFilters] = useState(false);

  const filteredData = useFilteredTracking(trackingData, filters);

  // Statistiques globales
  const stats = React.useMemo(() => {
    const upToDate = trackingData.filter(t => t.overallStatus === 'up_to_date').length;
    const partial = trackingData.filter(t => t.overallStatus === 'partial').length;
    const late = trackingData.filter(t => t.overallStatus === 'late').length;
    
    return { upToDate, partial, late, total: trackingData.length };
  }, [trackingData]);

  // Générer les mois pour le filtre
  const monthOptions = React.useMemo(() => {
    if (!trackingData.length) return [];
    return trackingData[0]?.months.map(m => ({
      value: m.month,
      label: m.monthLabel
    })) || [];
  }, [trackingData]);

  // Générer les classes disponibles depuis les données des élèves
  const classOptions = useMemo(() => {
    const classMap = new Map<string, { id: string; name: string }>();
    trackingData.forEach(t => {
      if (t.student.class_id && t.student.classes?.name) {
        classMap.set(t.student.class_id, {
          id: t.student.class_id,
          name: t.student.classes.name
        });
      }
    });
    return Array.from(classMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [trackingData]);

  if (isLoading || statsLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center space-y-2">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
          <p className="text-sm text-muted-foreground">{t('payments.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <Tabs defaultValue="statistics" className="flex flex-col h-full">
      <TabsList className="grid w-full max-w-md grid-cols-2 mb-3 sm:mb-4 shrink-0">
        <TabsTrigger value="statistics" className="text-xs sm:text-sm">{t('payments.statisticsTab')}</TabsTrigger>
        <TabsTrigger value="tracking" className="text-xs sm:text-sm">{t('payments.trackingTab')}</TabsTrigger>
      </TabsList>

      {/* Onglet Statistiques détaillées */}
      <TabsContent value="statistics" className="flex-1 overflow-hidden mt-0 pt-0 hidden data-[state=active]:block">
        <MonthlyPaymentStats stats={globalStats} />
      </TabsContent>

      {/* Onglet Suivi des élèves */}
      <TabsContent value="tracking" className="flex-col h-full mt-0 pt-0 hidden data-[state=active]:flex">
        <div className="flex flex-col h-full">

          {/* Barre de recherche et filtre - FIXE */}
          <div className="mb-2 shrink-0 space-y-2">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                <Input
                  placeholder={t('payments.searchPlaceholder')}
                  value={filters.searchQuery}
                  onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
                  className="pl-7 h-8 text-xs"
                />
              </div>
              <Button
                variant={showFilters ? "default" : "outline"}
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="h-8 px-3"
              >
                {showFilters ? <X className="w-3 h-3" /> : <Filter className="w-3 h-3" />}
              </Button>
            </div>

            {/* Filtres avancés - Masquables */}
            {showFilters && (
              <Card>
                <CardContent className="p-2 space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    {/* Filtre par statut */}
                    <Select
                      value={filters.status}
                      onValueChange={(value: any) => setFilters({ ...filters, status: value })}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder={t('payments.status')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('payments.statusAll')}</SelectItem>
                        <SelectItem value="up_to_date">{t('payments.statusUpToDate')}</SelectItem>
                        <SelectItem value="partial">{t('payments.statusPartial')}</SelectItem>
                        <SelectItem value="late">{t('payments.statusLate')}</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Filtre par classe */}
                    <Select
                      value={filters.classId || 'all'}
                      onValueChange={(value) => setFilters({ ...filters, classId: value === 'all' ? '' : value })}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder={t('payments.class')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('payments.allClasses')}</SelectItem>
                        {classOptions.map(cls => (
                          <SelectItem key={cls.id} value={cls.id}>
                            {cls.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Filtre par mois */}
                    <Select
                      value={filters.month}
                      onValueChange={(value) => setFilters({ ...filters, month: value })}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder={t('payments.monthly')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('payments.allMonths')}</SelectItem>
                        {monthOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    variant="ghost"
                    onClick={() => setFilters({ status: 'all', classId: '', month: 'all', searchQuery: '' })}
                    className="w-full h-7 text-xs"
                  >
                    {t('payments.resetFilters')}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

      {/* Liste des élèves - SCROLLABLE */}
      <ScrollArea className="flex-1">
        <div className="space-y-2 sm:space-y-4 pr-2 sm:pr-4">
          {filteredData.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                {t('payments.noStudentMatchFilter')}
              </CardContent>
            </Card>
          ) : (
            filteredData.map(tracking => (
              <MonthlyPaymentCard
                key={tracking.student.id}
                tracking={tracking}
              />
            ))
          )}
        </div>
      </ScrollArea>
        </div>
      </TabsContent>
    </Tabs>
  );
};
