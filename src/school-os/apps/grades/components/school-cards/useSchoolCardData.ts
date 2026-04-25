/**
 * Hook pour récupérer les données nécessaires à la génération des cartes scolaires
 */
import { useOfflineQuery } from '@/offline/hooks/useOfflineQuery';
import { supabase } from '@/integrations/supabase/client';

export interface SchoolCardStudent {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  student_code: string | null;
  photo_url: string | null;
  class_name: string;
  class_cycle: string;
}

export const useClassStudentsForCards = (classId?: string) => {
  return useOfflineQuery<SchoolCardStudent[]>({
    queryKey: ['class-students-cards', classId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students_school')
        .select('id, first_name, last_name, date_of_birth, gender, student_code, photo_url, classes(name, cycle)')
        .eq('class_id', classId!)
        .order('last_name');

      if (error) throw error;

      return (data || []).map((s: any) => ({
        id: s.id,
        first_name: s.first_name,
        last_name: s.last_name,
        date_of_birth: s.date_of_birth,
        gender: s.gender,
        student_code: s.student_code,
        photo_url: s.photo_url,
        class_name: s.classes?.name || '',
        class_cycle: s.classes?.cycle || '',
      }));
    },
    enabled: !!classId,
  });
};
