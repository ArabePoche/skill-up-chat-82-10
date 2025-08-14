
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface Promotion {
  id: string;
  name: string;
  formation_id: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface StudentPromotion {
  id: string;
  student_id: string;
  promotion_id: string;
  joined_at: string;
  is_active: boolean;
  promotions?: Promotion;
}

export const usePromotions = (formationId?: string) => {
  return useQuery({
    queryKey: ['promotions', formationId],
    queryFn: async () => {
      if (!formationId) return [];

      console.log('Fetching promotions for formation:', formationId);

      const { data, error } = await supabase
        .from('promotions')
        .select('*')
        .eq('formation_id', formationId)
        .eq('is_active', true)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching promotions:', error);
        throw error;
      }

      console.log('Promotions fetched:', data?.length || 0);
      return data || [];
    },
    enabled: !!formationId,
  });
};

export const useStudentPromotion = (formationId?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['student-promotion', user?.id, formationId],
    queryFn: async () => {
      if (!user?.id || !formationId) return null;

      console.log('Fetching student promotion:', { userId: user.id, formationId });

      const { data, error } = await supabase
        .from('student_promotions')
        .select(`
          *,
          promotions (
            id,
            name,
            formation_id
          )
        `)
        .eq('student_id', user.id)
        .eq('is_active', true)
        .eq('promotions.formation_id', formationId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching student promotion:', error);
        throw error;
      }

      console.log('Student promotion found:', data);
      return data as StudentPromotion | null;
    },
    enabled: !!user?.id && !!formationId,
  });
};

export const useCreatePromotion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, formationId }: { name: string; formationId: string }) => {
      console.log('Creating promotion:', { name, formationId });

      const { data, error } = await supabase
        .from('promotions')
        .insert({
          name,
          formation_id: formationId,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating promotion:', error);
        throw error;
      }

      console.log('Promotion created:', data);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['promotions', data.formation_id] });
      toast.success('Promotion créée avec succès');
    },
    onError: (error) => {
      console.error('Error creating promotion:', error);
      toast.error('Erreur lors de la création de la promotion');
    },
  });
};

export const useAssignStudentToPromotion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ studentId, promotionId }: { studentId: string; promotionId: string }) => {
      console.log('Assigning student to promotion:', { studentId, promotionId });

      const { data, error } = await supabase
        .from('student_promotions')
        .insert({
          student_id: studentId,
          promotion_id: promotionId,
        })
        .select()
        .single();

      if (error) {
        console.error('Error assigning student to promotion:', error);
        throw error;
      }

      console.log('Student assigned to promotion:', data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-promotion'] });
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
      toast.success('Étudiant assigné à la promotion');
    },
    onError: (error) => {
      console.error('Error assigning student to promotion:', error);
      toast.error('Erreur lors de l\'assignation à la promotion');
    },
  });
};
