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
 * Inclut automatiquement les paiements des élèves
 */
export const useTransactions = (schoolId?: string) => {
  return useQuery({
    queryKey: ['school-transactions', schoolId],
    queryFn: async () => {
      if (!schoolId) return [];

      // Récupérer les transactions manuelles
      const { data: transactions, error: transError } = await supabase
        .from('school_transactions')
        .select('*')
        .eq('school_id', schoolId)
        .order('transaction_date', { ascending: false });

      if (transError) throw transError;

      // Récupérer les paiements des élèves
      const { data: studentPayments, error: paymentsError } = await supabase
        .from('school_students_payment')
        .select(`
          *,
          student:students_school(
            first_name,
            last_name
          )
        `)
        .eq('school_id', schoolId)
        .order('payment_date', { ascending: false });

      if (paymentsError) throw paymentsError;

      // Convertir les paiements des élèves en format transaction
      const studentTransactions: Transaction[] = (studentPayments || []).map(payment => ({
        id: payment.id,
        school_id: payment.school_id,
        type: 'income' as const,
        category: 'Paiements élèves',
        amount: payment.amount,
        transaction_date: payment.payment_date,
        description: payment.notes 
          ? `Paiement élève: ${(payment as any).student?.first_name || ''} ${(payment as any).student?.last_name || ''} - ${payment.notes}`
          : `Paiement élève: ${(payment as any).student?.first_name || ''} ${(payment as any).student?.last_name || ''}`,
        reference_number: payment.reference_number || undefined,
        payment_method: payment.payment_method,
        attached_file_url: undefined,
        created_by: payment.received_by,
        created_at: payment.created_at,
        updated_at: payment.updated_at,
      }));

      // Combiner et trier par date
      const allTransactions = [...(transactions || []), ...studentTransactions];
      allTransactions.sort((a, b) => 
        new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime()
      );

      return allTransactions;
    },
    enabled: !!schoolId,
  });
};

/**
 * Récupérer les statistiques comptables
 * Calcule les revenus en incluant les paiements des élèves
 */
export const useAccountingStats = (schoolId?: string) => {
  return useQuery({
    queryKey: ['accounting-stats', schoolId],
    queryFn: async () => {
      if (!schoolId) return [];

      // Récupérer les stats de base
      const { data: baseStats, error: statsError } = await supabase
        .from('school_accounting_stats')
        .select('*')
        .eq('school_id', schoolId)
        .order('month', { ascending: false });

      if (statsError) throw statsError;

      // Récupérer les paiements des élèves
      const { data: studentPayments, error: paymentsError } = await supabase
        .from('school_students_payment')
        .select('amount, payment_date')
        .eq('school_id', schoolId);

      if (paymentsError) throw paymentsError;

      // Calculer les revenus des élèves par mois
      const paymentsByMonth: { [key: string]: number } = {};
      studentPayments?.forEach(payment => {
        const month = payment.payment_date.substring(0, 7); // YYYY-MM
        paymentsByMonth[month] = (paymentsByMonth[month] || 0) + payment.amount;
      });

      // Combiner les stats avec les paiements des élèves
      const stats = baseStats?.map(stat => {
        const month = stat.month?.substring(0, 7) || '';
        const studentRevenue = paymentsByMonth[month] || 0;
        const totalIncome = (stat.total_income || 0) + studentRevenue;
        
        return {
          ...stat,
          total_income: totalIncome,
          net_balance: totalIncome - (stat.total_expense || 0),
        };
      }) || [];

      // Ajouter les mois qui n'existent que dans les paiements élèves
      Object.keys(paymentsByMonth).forEach(month => {
        if (!stats.find(s => s.month?.startsWith(month))) {
          stats.push({
            school_id: schoolId,
            month: `${month}-01`,
            total_income: paymentsByMonth[month],
            total_expense: 0,
            net_balance: paymentsByMonth[month],
          });
        }
      });

      // Trier par mois décroissant
      stats.sort((a, b) => (b.month || '').localeCompare(a.month || ''));

      return stats as AccountingStats[];
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
