import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TeacherApplication {
  id: string;
  user_id: string;
  status: 'pending' | 'approved' | 'rejected';
  motivation_message: string;
  experience_years: number | null;
  education_level: string;
  specialties: string[];
  availability: string;
  created_at: string;
  updated_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  profiles: {
    first_name: string;
    last_name: string;
    phone: string;
  } | null;
  teacher_application_formations: {
    formations: {
      id: string;
      title: string;
    };
  }[];
  teacher_application_files: {
    id: string;
    file_name: string;
    file_url: string;
    file_type: string;
    file_size: number;
    uploaded_at: string;
  }[];
  teacher_reviews: {
    id: string;
    decision: string;
    comment: string;
    created_at: string;
    reviewer_id: string;
  }[];
}

export const useTeacherApplications = () => {
  return useQuery({
    queryKey: ['teacher-applications'],
    queryFn: async () => {
      // Récupérer les candidatures avec les relations
      const { data: applications, error } = await supabase
        .from('teacher_applications')
        .select(`
          *,
          teacher_application_formations(
            formations(id, title)
          ),
          teacher_application_files(*),
          teacher_reviews(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Récupérer les profils des utilisateurs
      const userIds = applications?.map(app => app.user_id) || [];
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, phone')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Combiner les données
      const result = applications?.map(app => ({
        ...app,
        profiles: profiles?.find(p => p.id === app.user_id) || null
      })) || [];

      return result as TeacherApplication[];
    },
    staleTime: 1 * 60 * 1000, // 1 minute
  });
};

export const usePendingTeacherApplicationsCount = () => {
  return useQuery({
    queryKey: ['pending-teacher-applications-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('teacher_applications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      if (error) throw error;
      return count || 0;
    },
    staleTime: 30 * 1000, // 30 secondes
  });
};