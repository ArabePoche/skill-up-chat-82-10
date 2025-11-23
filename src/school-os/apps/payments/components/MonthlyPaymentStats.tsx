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
import { ScrollArea } from '@/components/ui/scroll-area';

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
    <ScrollArea className="h-full">
      <div className="space-y-4 sm:space-y-6 pr-2 sm:pr-4 pb-4">
        {stats.totalStudents === 0 && (
          <Card>
            <CardContent className="py-8 text-center">
              <Building2 className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-60" />
              <p className="text-sm text-muted-foreground">
                Aucune donnée de paiement trouvée pour cette école sur l'année scolaire active.
              </p>
            </CardContent>
          </Card>
        )}
        {/* Statistiques globales de l'école */}
        <div>
          <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
            <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            Statistiques Globales de l'École
          </h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
            {/* Gain annuel attendu */}
            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
              <CardContent className="pt-4 sm:pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground mb-1">Gain annuel attendu</p>
                    <p className="text-xl sm:text-2xl font-bold text-primary">
                      {formatCurrency(stats.totalExpectedMonthly * 9)}
                    </p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                      {stats.totalStudents} élèves × 9 mois
                    </p>
                  </div>
                  <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-primary opacity-50" />
                </div>
              </CardContent>
            </Card>

            {/* Total restant */}
            <Card className="border-orange-500/20">
              <CardContent className="pt-4 sm:pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground mb-1">Reste à payer</p>
                    <p className="text-xl sm:text-2xl font-bold text-orange-600">
                      {formatCurrency(stats.totalRemaining)}
                    </p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                      Pour l'année
                    </p>
                  </div>
                  <AlertCircle className="w-6 h-6 sm:w-8 sm:h-8 text-orange-600 opacity-50" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Stats du mois actuel */}
          <Card className="mt-3 sm:mt-4 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/30">
            <CardHeader className="pb-3 sm:pb-4">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="text-xs sm:text-base">Progression globale</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-1">Attendu par mois</p>
                  <p className="text-lg sm:text-xl font-bold">{formatCurrency(stats.totalExpectedMonthly)}</p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-1">Total payé</p>
                  <p className="text-lg sm:text-xl font-bold text-green-600">{formatCurrency(stats.totalPaid)}</p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-1">Reste à payer</p>
                  <p className="text-lg sm:text-xl font-bold text-orange-600">{formatCurrency(stats.totalRemaining)}</p>
                </div>
              </div>
              
              {/* Barre de progression */}
              <div className="mt-3 sm:mt-4">
                <div className="flex justify-between text-xs sm:text-sm mb-2">
                  <span className="text-muted-foreground">Progression annuelle</span>
                  <span className="font-medium">
                    {stats.totalPaid > 0 && (stats.totalPaid + stats.totalRemaining) > 0
                      ? Math.round((stats.totalPaid / (stats.totalPaid + stats.totalRemaining)) * 100)
                      : 0}%
                  </span>
                </div>
                <div className="w-full h-2.5 sm:h-3 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-300"
                    style={{ 
                      width: `${stats.totalPaid > 0 && (stats.totalPaid + stats.totalRemaining) > 0
                        ? Math.min((stats.totalPaid / (stats.totalPaid + stats.totalRemaining)) * 100, 100)
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
          <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Détails par Classe</h3>
          <div className="space-y-2">
            {stats.classesList.map(classStats => {
              const isExpanded = expandedClasses.has(classStats.classId);

              return (
                <Card key={classStats.classId}>
                  <Collapsible open={isExpanded} onOpenChange={() => toggleClass(classStats.classId)}>
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        className="w-full p-3 sm:p-4 h-auto justify-between hover:bg-muted/50"
                      >
                        <div className="flex items-center gap-2 sm:gap-3 flex-1 text-left min-w-0">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground shrink-0" />
                          ) : (
                            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm sm:text-base truncate">{classStats.className}</p>
                            <p className="text-xs sm:text-sm text-muted-foreground">
                              {classStats.studentCount} élève{classStats.studentCount > 1 ? 's' : ''}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-[10px] sm:text-sm text-muted-foreground">Total payé</p>
                            <p className="font-semibold text-xs sm:text-sm text-green-600">
                              {formatCurrency(classStats.totalPaid)}
                            </p>
                          </div>
                        </div>
                      </Button>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent>
                      <CardContent className="pt-0 pb-3 sm:pb-4">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 mb-3 sm:mb-4">
                          <div className="p-2 sm:p-3 bg-primary/5 rounded-lg">
                            <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">Attendu/mois</p>
                            <p className="text-base sm:text-lg font-bold text-primary">
                              {formatCurrency(classStats.expectedMonthly)}
                            </p>
                          </div>
                          <div className="p-2 sm:p-3 bg-green-500/5 rounded-lg">
                            <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">Total payé</p>
                            <p className="text-base sm:text-lg font-bold text-green-600">
                              {formatCurrency(classStats.totalPaid)}
                            </p>
                          </div>
                          <div className="p-2 sm:p-3 bg-orange-500/5 rounded-lg">
                            <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">Reste année</p>
                            <p className="text-base sm:text-lg font-bold text-orange-600">
                              {formatCurrency(classStats.totalRemaining)}
                            </p>
                          </div>
                        </div>
                        
                        {/* Progression annuelle */}
                        <div className="mt-2 sm:mt-3 p-2 sm:p-3 bg-muted/30 rounded-lg">
                          <p className="text-xs sm:text-sm font-medium mb-2">
                            Progression annuelle ({Math.round((classStats.totalPaid / (classStats.totalPaid + classStats.totalRemaining)) * 100)}%)
                          </p>
                          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-300"
                              style={{ width: `${Math.min((classStats.totalPaid / (classStats.totalPaid + classStats.totalRemaining)) * 100, 100)}%` }}
                            />
                          </div>
                          <div className="flex justify-between mt-2 text-[10px] sm:text-xs text-muted-foreground">
                            <span>Payé: {formatCurrency(classStats.totalPaid)}</span>
                            <span>Reste: {formatCurrency(classStats.totalRemaining)}</span>
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
    </ScrollArea>
  );
};
