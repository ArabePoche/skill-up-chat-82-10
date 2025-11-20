/**
 * Composant d'affichage des statistiques détaillées des paiements mensuels
 * Affiche les montants par classe et les totaux globaux
 */
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  TrendingUp, 
  DollarSign, 
  AlertCircle, 
  Calendar,
  ChevronDown,
  ChevronRight,
  Building2
} from 'lucide-react';
import { GlobalMonthlyStats } from '../hooks/useMonthlyPaymentStats';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';

interface MonthlyPaymentStatsProps {
  stats: GlobalMonthlyStats;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    minimumFractionDigits: 0,
  }).format(amount);
};

export const MonthlyPaymentStats: React.FC<MonthlyPaymentStatsProps> = ({ stats }) => {
  const [expandedClasses, setExpandedClasses] = useState<Set<string>>(new Set());

  const toggleClass = (classId: string) => {
    setExpandedClasses(prev => {
      const next = new Set(prev);
      if (next.has(classId)) {
        next.delete(classId);
      } else {
        next.add(classId);
      }
      return next;
    });
  };

  const currentMonthName = new Intl.DateTimeFormat('fr-FR', { 
    month: 'long',
    year: 'numeric'
  }).format(new Date());

  return (
    <div className="space-y-6">
      {/* Statistiques globales de l'école */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-primary" />
          Statistiques Globales de l'École
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Montant mensuel attendu */}
          <Card className="border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Attendu par mois</p>
                  <p className="text-2xl font-bold text-primary">
                    {formatCurrency(stats.totalExpectedMonthly)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats.totalStudents} élèves
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>

          {/* Total déjà payé */}
          <Card className="border-green-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total payé</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(stats.totalPaid)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Tous mois confondus
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-green-600 opacity-50" />
              </div>
            </CardContent>
          </Card>

          {/* Total restant */}
          <Card className="border-orange-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Reste à payer</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {formatCurrency(stats.totalRemaining)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Pour l'année
                  </p>
                </div>
                <AlertCircle className="w-8 h-8 text-orange-600 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stats du mois actuel */}
        <Card className="mt-4 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/30">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Mois actuel - {currentMonthName}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Attendu ce mois</p>
                <p className="text-xl font-bold">{formatCurrency(stats.currentMonthExpected)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Déjà payé</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(stats.currentMonthPaid)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Reste à payer</p>
                <p className="text-xl font-bold text-orange-600">{formatCurrency(stats.currentMonthRemaining)}</p>
              </div>
            </div>
            
            {/* Barre de progression */}
            <div className="mt-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Progression</span>
                <span className="font-medium">
                  {stats.currentMonthExpected > 0 
                    ? Math.round((stats.currentMonthPaid / stats.currentMonthExpected) * 100)
                    : 0}%
                </span>
              </div>
              <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-300"
                  style={{ 
                    width: `${stats.currentMonthExpected > 0 
                      ? Math.min((stats.currentMonthPaid / stats.currentMonthExpected) * 100, 100)
                      : 0}%` 
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Statistiques par classe */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Détails par Classe</h3>
        <div className="space-y-2">
          {stats.classesList.map(classStats => {
            const isExpanded = expandedClasses.has(classStats.classId);
            const progressPercent = classStats.currentMonthExpected > 0
              ? (classStats.currentMonthPaid / classStats.currentMonthExpected) * 100
              : 0;

            return (
              <Card key={classStats.classId}>
                <Collapsible open={isExpanded} onOpenChange={() => toggleClass(classStats.classId)}>
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full p-4 h-auto justify-between hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-3 flex-1 text-left">
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-muted-foreground" />
                        )}
                        <div className="flex-1">
                          <p className="font-semibold">{classStats.className}</p>
                          <p className="text-sm text-muted-foreground">
                            {classStats.studentCount} élève{classStats.studentCount > 1 ? 's' : ''}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Mois actuel</p>
                          <p className="font-semibold">
                            {formatCurrency(classStats.currentMonthPaid)} / {formatCurrency(classStats.currentMonthExpected)}
                          </p>
                        </div>
                      </div>
                    </Button>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <CardContent className="pt-0 pb-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="p-3 bg-primary/5 rounded-lg">
                          <p className="text-xs text-muted-foreground mb-1">Attendu/mois</p>
                          <p className="text-lg font-bold text-primary">
                            {formatCurrency(classStats.expectedMonthly)}
                          </p>
                        </div>
                        <div className="p-3 bg-green-500/5 rounded-lg">
                          <p className="text-xs text-muted-foreground mb-1">Total payé</p>
                          <p className="text-lg font-bold text-green-600">
                            {formatCurrency(classStats.totalPaid)}
                          </p>
                        </div>
                        <div className="p-3 bg-orange-500/5 rounded-lg">
                          <p className="text-xs text-muted-foreground mb-1">Reste année</p>
                          <p className="text-lg font-bold text-orange-600">
                            {formatCurrency(classStats.totalRemaining)}
                          </p>
                        </div>
                      </div>
                      
                      {/* Progression mois actuel */}
                      <div className="mt-3 p-3 bg-muted/30 rounded-lg">
                        <p className="text-sm font-medium mb-2">
                          Progression du mois actuel ({Math.round(progressPercent)}%)
                        </p>
                        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-300"
                            style={{ width: `${Math.min(progressPercent, 100)}%` }}
                          />
                        </div>
                        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                          <span>Payé: {formatCurrency(classStats.currentMonthPaid)}</span>
                          <span>Reste: {formatCurrency(classStats.currentMonthRemaining)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};
