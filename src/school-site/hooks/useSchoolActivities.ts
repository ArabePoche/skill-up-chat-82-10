/**
 * Hook pour charger et gérer les activités d'une école (en cours, passées, à venir).
 * Utilisé dans la section Activités du site public de l'école.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface SchoolActivity {
  id: string;
  school_id: string;
  title: string;
  description: string | null;
  activity_date: string;
  end_date: string | null;
  location: string | null;
  image_url: string | null;
  status: 'upcoming' | 'ongoing' | 'past';
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const useSchoolActivities = (schoolId: string | undefined) => {
  return useQuery({
    queryKey: ['school-activities', schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      const { data, error } = await supabase
        .from('school_activities' as any)
        .select('*')
        .eq('school_id', schoolId)
        .order('activity_date', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as SchoolActivity[];
    },
    enabled: !!schoolId,
  });
};

export const useCreateActivity = () => {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: {
      school_id: string;
      title: string;
      description?: string;
      activity_date: string;
      end_date?: string;
      location?: string;
      image_url?: string;
      status: string;
    }) => {
      const { data, error } = await supabase
        .from('school_activities' as any)
        .insert({ ...input, created_by: user?.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['school-activities', vars.school_id] });
      toast.success('Activité créée');
    },
    onError: () => toast.error("Erreur lors de la création de l'activité"),
  });
};

export const useDeleteActivity = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, schoolId }: { id: string; schoolId: string }) => {
      const { error } = await supabase.from('school_activities' as any).delete().eq('id', id);
      if (error) throw error;
      return schoolId;
    },
    onSuccess: (schoolId) => {
      qc.invalidateQueries({ queryKey: ['school-activities', schoolId] });
      toast.success('Activité supprimée');
    },
    onError: () => toast.error("Erreur lors de la suppression"),
  });
};
