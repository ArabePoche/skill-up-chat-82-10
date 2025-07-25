
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useFormations = () => {
  return useQuery({
    queryKey: ['formations'],
    queryFn: async () => {
      console.log('Fetching formations...');

      const { data, error } = await supabase
        .from('formations')
        .select(`
          *,
          profiles:author_id (
            id,
            first_name,
            last_name,
            username
          )
        `);

      if (error) {
        console.error('Error fetching formations:', error);
        throw error;
      }

      console.log('Formations fetched:', data);
      return data || [];
    },
  });
};

export const useFormationById = (formationId: string | undefined) => {
  return useQuery({
    queryKey: ['formation', formationId],
    queryFn: async () => {
      if (!formationId) return null;

      console.log('Fetching formation by ID:', formationId);

      const { data, error } = await supabase
        .from('formations')
        .select(`
          *,
          profiles:author_id (
            id,
            first_name,
            last_name,
            username
          ),
          levels (
            *,
            lessons (
              *,
              exercises!exercises_lesson_id_fkey (
                id,
                title,
                description,
                content,
                type
              )
            )
          )
        `)
        .eq('id', formationId)
        .single();

      if (error) {
        console.error('Error fetching formation:', error);
        throw error;
      }

      console.log('Formation fetched:', data);
      return data;
    },
    enabled: !!formationId,
  });
};

export const useUserEnrollments = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['user-enrollments', userId],
    queryFn: async () => {
      if (!userId) {
        console.log('No user ID provided for enrollments');
        return [];
      }

      console.log('Fetching user enrollments for:', userId);

      try {
        // Récupérer les demandes d'inscription approuvées
        const { data: enrollmentRequests, error: enrollmentError } = await supabase
          .from('enrollment_requests')
          .select('formation_id, created_at, status')
          .eq('user_id', userId)
          .eq('status', 'approved');

        if (enrollmentError) {
          console.error('Error fetching enrollment requests:', enrollmentError);
          throw enrollmentError;
        }

        console.log('Enrollment requests found:', enrollmentRequests);

        if (!enrollmentRequests || enrollmentRequests.length === 0) {
          console.log('No approved enrollments found for user:', userId);
          return [];
        }

        // Récupérer les détails des formations pour les inscriptions approuvées
        const formationIds = enrollmentRequests.map(req => req.formation_id);
        
        // Simplifier la requête pour éviter l'erreur de relation ambiguë
        const { data: formations, error: formationsError } = await supabase
          .from('formations')
          .select(`
            *,
            profiles:author_id (
              id,
              first_name,
              last_name,
              username
            ),
            levels (
              *,
              lessons (
                *,
                exercises!exercises_lesson_id_fkey (
                  id,
                  title,
                  description,
                  content,
                  type
                )
              )
            )
          `)
          .in('id', formationIds)
          .eq('is_active', true);

        if (formationsError) {
          console.error('Error fetching formations details:', formationsError);
          throw formationsError;
        }

        console.log('Formations details fetched:', formations);

        // Combiner les données d'inscription avec les formations
        const enrichedEnrollments = enrollmentRequests.map(enrollment => {
          const formation = formations?.find(f => f.id === enrollment.formation_id);
          return {
            ...enrollment,
            formations: formation
          };
        }).filter(enrollment => enrollment.formations); // Filtrer les formations qui n'existent plus

        console.log('Final enriched enrollments:', enrichedEnrollments);
        return enrichedEnrollments;
      } catch (error) {
        console.error('Complete error in useUserEnrollments:', error);
        // Retourner un tableau vide plutôt que de throw l'erreur
        // pour éviter de casser l'interface utilisateur
        return [];
      }
    },
    enabled: !!userId,
    retry: 3,
    retryDelay: 1000,
  });
};
