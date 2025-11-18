/**
 * Hooks pour gérer la comptabilité de l'école
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Transaction {
  id: string;
  school_id: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  transaction_date: string;
  description?: string;
  reference_number?: string;
  payment_method?: string;
  attached_file_url?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface AccountingStats {
  school_id: string;
  month: string;
  total_income: number;
  total_expense: number;
  net_balance: number;
}

/**
 * Récupérer toutes les transactions d'une école
 */
export const useTransactions = (schoolId?: string) => {
  return useQuery({
    queryKey: ['school-transactions', schoolId],
    queryFn: async () => {
      if (!schoolId) return [];

      const { data, error } = await supabase
        .from('school_transactions')
        .select('*')
        .eq('school_id', schoolId)
        .order('transaction_date', { ascending: false });

      if (error) throw error;
      return data as Transaction[];
    },
    enabled: !!schoolId,
  });
};

/**
 * Récupérer les statistiques comptables
 */
export const useAccountingStats = (schoolId?: string) => {
  return useQuery({
    queryKey: ['accounting-stats', schoolId],
    queryFn: async () => {
      if (!schoolId) return [];

      const { data, error } = await supabase
        .from('school_accounting_stats')
        .select('*')
        .eq('school_id', schoolId)
        .order('month', { ascending: false });

      if (error) throw error;
      return data as AccountingStats[];
    },
    enabled: !!schoolId,
  });
};

/**
 * Ajouter une transaction
 */
export const useAddTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (transaction: Omit<Transaction, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('school_transactions')
        .insert(transaction)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounting-stats'] });
      toast.success('Transaction ajoutée avec succès');
    },
    onError: (error) => {
      console.error('Erreur lors de l\'ajout de la transaction:', error);
      toast.error('Erreur lors de l\'ajout de la transaction');
    },
  });
};

/**
 * Modifier une transaction
 */
export const useUpdateTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...transaction }: Partial<Transaction> & { id: string }) => {
      const { data, error } = await supabase
        .from('school_transactions')
        .update(transaction)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounting-stats'] });
      toast.success('Transaction modifiée avec succès');
    },
    onError: (error) => {
      console.error('Erreur lors de la modification:', error);
      toast.error('Erreur lors de la modification');
    },
  });
};

/**
 * Supprimer une transaction
 */
export const useDeleteTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('school_transactions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounting-stats'] });
      toast.success('Transaction supprimée avec succès');
    },
    onError: (error) => {
      console.error('Erreur lors de la suppression:', error);
      toast.error('Erreur lors de la suppression');
    },
  });
};
