/**
 * Modale plein écran de confirmation des dépenses programmées échues.
 * Permet de confirmer, modifier le montant, reporter ou retirer chaque dépense.
 */
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Check, X, CalendarPlus, Pencil, AlertTriangle, RefreshCw } from 'lucide-react';
import {
  useDueScheduledExpenses,
  useConfirmScheduledExpenses,
  useUpdateScheduledExpense,
  ScheduledExpense,
} from '../hooks/useScheduledExpenses';

interface Props {
  schoolId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ExpenseAction {
  expense: ScheduledExpense;
  action: 'confirm' | 'skip' | 'postpone';
  editedAmount?: number;
}

export const ScheduledExpenseConfirmationModal: React.FC<Props> = ({ schoolId, open, onOpenChange }) => {
  const { data: dueExpenses = [] } = useDueScheduledExpenses(schoolId);
  const confirmExpenses = useConfirmScheduledExpenses();
  const updateExpense = useUpdateScheduledExpense();

  const [actions, setActions] = useState<Map<string, ExpenseAction>>(new Map());
  const [editingId, setEditingId] = useState<string | null>(null);

  // Initialiser toutes les dépenses en mode "confirm"
  useEffect(() => {
    if (dueExpenses.length > 0) {
      const map = new Map<string, ExpenseAction>();
      dueExpenses.forEach((exp) => {
        map.set(exp.id, { expense: exp, action: 'confirm' });
      });
      setActions(map);
    }
  }, [dueExpenses]);

  const setAction = (id: string, action: 'confirm' | 'skip' | 'postpone') => {
    setActions((prev) => {
      const next = new Map(prev);
      const item = next.get(id);
      if (item) next.set(id, { ...item, action });
      return next;
    });
  };

  const setEditedAmount = (id: string, amount: number) => {
    setActions((prev) => {
      const next = new Map(prev);
      const item = next.get(id);
      if (item) next.set(id, { ...item, editedAmount: amount });
      return next;
    });
  };

  const handleSubmit = async () => {
    const toConfirm: ScheduledExpense[] = [];
    const toPostpone: string[] = [];

    actions.forEach(({ expense, action, editedAmount }) => {
      if (action === 'confirm') {
        toConfirm.push({
          ...expense,
          amount: editedAmount ?? expense.amount,
        });
      } else if (action === 'postpone') {
        toPostpone.push(expense.id);
      }
      // 'skip' = retirer, on ne fait rien (la dépense reste telle quelle)
    });

    if (toConfirm.length > 0) {
      await confirmExpenses.mutateAsync(toConfirm);
    }

    // Reporter = avancer la date d'un mois/an
    for (const id of toPostpone) {
      const item = actions.get(id);
      if (!item) continue;
      const nextDate = new Date(item.expense.next_due_date);
      if (item.expense.recurrence === 'monthly') {
        nextDate.setMonth(nextDate.getMonth() + 1);
      } else {
        nextDate.setFullYear(nextDate.getFullYear() + 1);
      }
      await updateExpense.mutateAsync({
        id,
        next_due_date: nextDate.toISOString().split('T')[0],
      });
    }

    onOpenChange(false);
  };

  const confirmedCount = Array.from(actions.values()).filter((a) => a.action === 'confirm').length;
  const totalAmount = Array.from(actions.values())
    .filter((a) => a.action === 'confirm')
    .reduce((sum, a) => sum + (a.editedAmount ?? a.expense.amount), 0);

  if (dueExpenses.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-none w-screen h-screen m-0 p-0 rounded-none border-none flex flex-col">
        {/* Header */}
        <div className="shrink-0 border-b bg-destructive/5 px-6 py-5">
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            <h2 className="text-xl font-bold">Dépenses programmées à confirmer</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            {dueExpenses.length} dépense(s) arrivée(s) à échéance. Confirmez, modifiez ou reportez chacune.
          </p>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 px-6 py-4">
          <div className="max-w-2xl mx-auto space-y-4">
            {dueExpenses.map((exp) => {
              const item = actions.get(exp.id);
              if (!item) return null;
              const isEditing = editingId === exp.id;

              return (
                <div
                  key={exp.id}
                  className={`rounded-xl border-2 p-4 transition-colors ${
                    item.action === 'confirm'
                      ? 'border-primary/30 bg-primary/5'
                      : item.action === 'postpone'
                      ? 'border-amber-400/30 bg-amber-50/50 dark:bg-amber-950/20'
                      : 'border-muted bg-muted/30 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-semibold">{exp.category}</span>
                        <Badge variant="outline" className="text-xs">
                          <RefreshCw className="h-3 w-3 mr-1" />
                          {exp.recurrence === 'monthly' ? 'Mensuelle' : 'Annuelle'}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Échue le {new Date(exp.next_due_date).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                      {exp.description && (
                        <p className="text-sm text-muted-foreground">{exp.description}</p>
                      )}

                      {/* Montant éditable */}
                      <div className="mt-2 flex items-center gap-2">
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              className="w-36 h-8"
                              defaultValue={item.editedAmount ?? exp.amount}
                              onChange={(e) => setEditedAmount(exp.id, parseFloat(e.target.value) || 0)}
                              autoFocus
                            />
                            <span className="text-sm text-muted-foreground">FCFA</span>
                            <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                              <Check className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-bold">
                              {(item.editedAmount ?? exp.amount).toLocaleString('fr-FR')} FCFA
                            </span>
                            {item.action === 'confirm' && (
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingId(exp.id)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-col gap-1.5 shrink-0">
                      <Button
                        size="sm"
                        variant={item.action === 'confirm' ? 'default' : 'outline'}
                        className="w-full justify-start text-xs"
                        onClick={() => setAction(exp.id, 'confirm')}
                      >
                        <Check className="h-3.5 w-3.5 mr-1" />
                        Confirmer
                      </Button>
                      <Button
                        size="sm"
                        variant={item.action === 'postpone' ? 'secondary' : 'outline'}
                        className="w-full justify-start text-xs"
                        onClick={() => setAction(exp.id, 'postpone')}
                      >
                        <CalendarPlus className="h-3.5 w-3.5 mr-1" />
                        Reporter
                      </Button>
                      <Button
                        size="sm"
                        variant={item.action === 'skip' ? 'destructive' : 'outline'}
                        className="w-full justify-start text-xs"
                        onClick={() => setAction(exp.id, 'skip')}
                      >
                        <X className="h-3.5 w-3.5 mr-1" />
                        Retirer
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="shrink-0 border-t bg-card px-6 py-4">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <div className="text-sm">
              <span className="text-muted-foreground">
                {confirmedCount} dépense(s) à enregistrer ·{' '}
              </span>
              <span className="font-bold text-lg">{totalAmount.toLocaleString('fr-FR')} FCFA</span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Plus tard
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={confirmExpenses.isPending || updateExpense.isPending}
              >
                {confirmExpenses.isPending ? 'Traitement...' : 'Valider'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
