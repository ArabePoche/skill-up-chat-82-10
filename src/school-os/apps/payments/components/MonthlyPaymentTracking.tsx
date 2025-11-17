/**
 * Composant principal pour le suivi mensuel des paiements
 * Affiche le statut de paiement par mois pour chaque élève
 */
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, Calendar, Users, AlertCircle, CheckCircle2, Clock, FileText } from 'lucide-react';
import { useMonthlyPaymentTracking, useFilteredTracking, StudentMonthlyTracking } from '../hooks/useMonthlyPaymentTracking';
import { MonthlyPaymentCard } from './MonthlyPaymentCard';

interface MonthlyPaymentTrackingProps {
  schoolId?: string;
}

export const MonthlyPaymentTracking: React.FC<MonthlyPaymentTrackingProps> = ({ schoolId }) => {
  const { trackingData, isLoading, yearStart } = useMonthlyPaymentTracking(schoolId);
  
  const [filters, setFilters] = useState({
    status: 'all' as 'all' | 'up_to_date' | 'partial' | 'late',
    classId: '',
    month: 'all',
    searchQuery: ''
  });

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center space-y-2">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
          <p className="text-sm text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête avec statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total élèves</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Users className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">À jour</p>
                <p className="text-2xl font-bold text-green-600">{stats.upToDate}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Partiellement payé</p>
                <p className="text-2xl font-bold text-orange-600">{stats.partial}</p>
              </div>
              <Clock className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">En retard</p>
                <p className="text-2xl font-bold text-red-600">{stats.late}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtres */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Suivi mensuel des paiements
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Recherche */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un élève..."
                value={filters.searchQuery}
                onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
                className="pl-9"
              />
            </div>

            {/* Filtre par statut */}
            <Select
              value={filters.status}
              onValueChange={(value: any) => setFilters({ ...filters, status: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Filtrer par statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="up_to_date">À jour</SelectItem>
                <SelectItem value="partial">Partiellement payé</SelectItem>
                <SelectItem value="late">En retard</SelectItem>
              </SelectContent>
            </Select>

            {/* Filtre par mois */}
            <Select
              value={filters.month}
              onValueChange={(value) => setFilters({ ...filters, month: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Filtrer par mois" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les mois</SelectItem>
                {monthOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Réinitialiser les filtres */}
            <Button
              variant="outline"
              onClick={() => setFilters({ status: 'all', classId: '', month: '', searchQuery: '' })}
            >
              Réinitialiser
            </Button>
          </div>

          {/* Légende */}
          <div className="flex flex-wrap gap-3 pt-2 border-t">
            <div className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-muted-foreground">Payé</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 rounded-full bg-orange-500"></div>
              <span className="text-muted-foreground">Partiellement payé</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-muted-foreground">En retard</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 rounded-full bg-muted"></div>
              <span className="text-muted-foreground">À venir</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Liste des élèves */}
      <div className="space-y-4">
        {filteredData.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Aucun élève ne correspond aux critères de filtrage.
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
    </div>
  );
};
