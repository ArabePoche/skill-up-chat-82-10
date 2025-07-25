
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useTeacherWallet = (teacherId: string | undefined) => {
  return useQuery({
    queryKey: ['teacher-wallet', teacherId],
    queryFn: async () => {
      if (!teacherId) return null;

      const { data: wallet, error } = await supabase
        .from('teacher_wallets')
        .select('*')
        .eq('teacher_id', teacherId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching teacher wallet:', error);
        throw error;
      }

      return wallet;
    },
    enabled: !!teacherId,
  });
};

export const useTeacherTransactions = (teacherId: string | undefined) => {
  return useQuery({
    queryKey: ['teacher-transactions', teacherId],
    queryFn: async () => {
      if (!teacherId) return [];

      const { data: transactions, error } = await supabase
        .from('teacher_transactions')
        .select('*')
        .eq('teacher_id', teacherId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching teacher transactions:', error);
        throw error;
      }

      return transactions || [];
    },
    enabled: !!teacherId,
  });
};
