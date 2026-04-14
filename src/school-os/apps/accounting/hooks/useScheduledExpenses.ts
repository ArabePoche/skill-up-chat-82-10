/**
 * Hook pour gérer les dépenses programmées (mensuelles/annuelles)
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ScheduledExpense {
  id: string;
  school_id: string;
  category: string;
  amount: number;
  description?: string;
  payment_method?: string;
  recurrence: 'monthly' | 'yearly';
  next_due_date: string;
  is_active: boolean;
  last_confirmed_at?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Récupérer les dépenses programmées d'une école
 */
export const useScheduledExpenses = (schoolId?: string) => {
  return useQuery({
    queryKey: ['scheduled-expenses', schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      const { data, error } = await supabase
        .from('scheduled_expenses')
        .select('*')
        .eq('school_id', schoolId)
        .eq('is_active', true)
        .order('next_due_date', { ascending: true });
      if (error) throw error;
      return data as ScheduledExpense[];
    },
    enabled: !!schoolId,
  });
};

/**
 * Récupérer les dépenses programmées dont la date est arrivée (aujourd'hui ou passée)
 */
export const useDueScheduledExpenses = (schoolId?: string) => {
  return useQuery({
    queryKey: ['due-scheduled-expenses', schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('scheduled_expenses')
        .select('*')
        .eq('school_id', schoolId)
        .eq('is_active', true)
        .lte('next_due_date', today)
        .order('next_due_date', { ascending: true });
      if (error) throw error;
      return data as ScheduledExpense[];
    },
    enabled: !!schoolId,
  });
};

/**
 * Ajouter une dépense programmée
 */
export const useAddScheduledExpense = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (expense: Omit<ScheduledExpense, 'id' | 'created_at' | 'updated_at' | 'is_active' | 'last_confirmed_at'>) => {
      const { data, error } = await supabase
        .from('scheduled_expenses')
        .insert(expense)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-expenses'] });
      queryClient.invalidateQueries({ queryKey: ['due-scheduled-expenses'] });
      toast.success('Dépense programmée créée');
    },
    onError: () => toast.error('Erreur lors de la création'),
  });
};

/**
 * Modifier une dépense programmée
 */
export const useUpdateScheduledExpense = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<ScheduledExpense> & { id: string }) => {
      const { error } = await supabase
        .from('scheduled_expenses')
        .update(data)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-expenses'] });
      queryClient.invalidateQueries({ queryKey: ['due-scheduled-expenses'] });
    },
  });
};

/**
 * Supprimer (désactiver) une dépense programmée
 */
export const useDeleteScheduledExpense = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('scheduled_expenses')
        .update({ is_active: false })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-expenses'] });
      queryClient.invalidateQueries({ queryKey: ['due-scheduled-expenses'] });
      toast.success('Dépense programmée supprimée');
    },
    onError: () => toast.error('Erreur lors de la suppression'),
  });
};

/**
 * Confirmer des dépenses programmées : créer les transactions et avancer la prochaine date
 */
export const useConfirmScheduledExpenses = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (expenses: ScheduledExpense[]) => {
      // Créer les transactions
      const transactions = expenses.map(exp => ({
        school_id: exp.school_id,
        type: 'expense' as const,
        category: exp.category,
        amount: exp.amount,
        transaction_date: new Date().toISOString().split('T')[0],
        description: exp.description ? `[Programmée] ${exp.description}` : '[Programmée]',
        payment_method: exp.payment_method,
      }));

      const { error: txError } = await supabase
        .from('school_transactions')
        .insert(transactions);
      if (txError) throw txError;

      // Avancer la prochaine date pour chaque dépense
      for (const exp of expenses) {
        const nextDate = new Date(exp.next_due_date);
        if (exp.recurrence === 'monthly') {
          nextDate.setMonth(nextDate.getMonth() + 1);
        } else {
          nextDate.setFullYear(nextDate.getFullYear() + 1);
        }
        const { error } = await supabase
          .from('scheduled_expenses')
          .update({
            next_due_date: nextDate.toISOString().split('T')[0],
            last_confirmed_at: new Date().toISOString(),
          })
          .eq('id', exp.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-expenses'] });
      queryClient.invalidateQueries({ queryKey: ['due-scheduled-expenses'] });
      queryClient.invalidateQueries({ queryKey: ['school-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounting-stats'] });
      toast.success('Dépenses confirmées et enregistrées');
    },
    onError: () => toast.error('Erreur lors de la confirmation'),
  });
};
