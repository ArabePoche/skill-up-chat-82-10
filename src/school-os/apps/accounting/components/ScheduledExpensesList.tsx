/**
 * Liste des dépenses programmées avec gestion (modifier, supprimer)
 */
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, CalendarClock, RefreshCw } from 'lucide-react';
import { useScheduledExpenses, useDeleteScheduledExpense } from '../hooks/useScheduledExpenses';
import { AddScheduledExpenseDialog } from './AddScheduledExpenseDialog';
import { ScheduledExpenseConfirmationModal } from './ScheduledExpenseConfirmationModal';

interface Props {
  schoolId?: string;
}

export const ScheduledExpensesList: React.FC<Props> = ({ schoolId }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const { data: expenses = [], isLoading } = useScheduledExpenses(schoolId);
  const deleteExpense = useDeleteScheduledExpense();

  const today = new Date().toISOString().split('T')[0];
  const dueCount = expenses.filter(e => e.next_due_date <= today).length;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarClock className="h-5 w-5" />
            Dépenses programmées
            {dueCount > 0 && (
              <Badge variant="destructive" className="ml-1">{dueCount} à confirmer</Badge>
            )}
          </CardTitle>
          <div className="flex gap-2">
            {dueCount > 0 && (
              <Button size="sm" variant="destructive" onClick={() => setShowConfirmation(true)}>
                Confirmer ({dueCount})
              </Button>
            )}
            <Button size="sm" onClick={() => setShowAdd(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Programmer
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Chargement...</p>
          ) : expenses.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Aucune dépense programmée. Cliquez sur "Programmer" pour en créer une.
            </p>
          ) : (
            <div className="space-y-3">
              {expenses.map((exp) => {
                const isDue = exp.next_due_date <= today;
                return (
                  <div
                    key={exp.id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      isDue ? 'border-destructive/50 bg-destructive/5' : 'border-border'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{exp.category}</span>
                        <Badge variant="outline" className="text-xs">
                          <RefreshCw className="h-3 w-3 mr-1" />
                          {exp.recurrence === 'monthly' ? 'Mensuelle' : 'Annuelle'}
                        </Badge>
                        {isDue && <Badge variant="destructive" className="text-xs">Échue</Badge>}
                      </div>
                      {exp.description && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">{exp.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Prochaine : {new Date(exp.next_due_date).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 ml-3">
                      <span className="font-semibold text-sm whitespace-nowrap">
                        {exp.amount.toLocaleString('fr-FR')} FCFA
                      </span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => deleteExpense.mutate(exp.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <AddScheduledExpenseDialog schoolId={schoolId} open={showAdd} onOpenChange={setShowAdd} />
      <ScheduledExpenseConfirmationModal
        schoolId={schoolId}
        open={showConfirmation}
        onOpenChange={setShowConfirmation}
      />
    </>
  );
};
