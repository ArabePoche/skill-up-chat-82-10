import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook pour récupérer toutes les écoles d'un utilisateur
 * Retourne les écoles dont il est créateur, membre ou enseignant
 */
export const useUserSchools = (userId?: string) => {
  return useQuery({
    queryKey: ['user-schools', userId],
    queryFn: async () => {
      if (!userId) return [];

      // Récupérer les écoles créées par l'utilisateur
      const { data: ownedSchools, error: ownedError } = await supabase
        .from('schools')
        .select('id, name, description, school_type')
        .eq('owner_id', userId);

      if (ownedError) {
        console.error('Error fetching owned schools:', ownedError);
        throw ownedError;
      }

      // Récupérer les écoles où l'utilisateur est membre du personnel (school_staff)
      const { data: staffSchools, error: staffError } = await supabase
        .from('school_staff')
        .select(`
          status,
          schools:school_id (
            id,
            name,
            description,
            school_type
          )
        `)
        .eq('user_id', userId)
        .eq('status', 'active');

      if (staffError) {
        console.error('Error fetching staff schools:', staffError);
        throw staffError;
      }

      // Récupérer les écoles où l'utilisateur est enseignant
      const { data: teacherSchools, error: teacherError } = await supabase
        .from('school_teachers')
        .select(`
          employment_status,
          schools:school_id (
            id,
            name,
            description,
            school_type
          )
        `)
        .eq('user_id', userId)
        .eq('employment_status', 'active');

      if (teacherError) {
        console.error('Error fetching teacher schools:', teacherError);
        throw teacherError;
      }

      // Récupérer les écoles où l'utilisateur est parent (via parent_family_associations → school_student_families)
      const { data: parentAssociations, error: parentError } = await supabase
        .from('parent_family_associations')
        .select(`
          status,
          school_student_families:family_id (
            id,
            school_id,
            schools:school_id (
              id,
              name,
              description,
              school_type
            )
          )
        `)
        .eq('user_id', userId)
        .eq('status', 'active');

      if (parentError) {
        console.error('Error fetching parent schools:', parentError);
        throw parentError;
      }

      // Combiner les résultats
      const owned = (ownedSchools || []).map(school => ({
        ...school,
        role: 'owner' as const
      }));

      const staff = (staffSchools || [])
        .filter(s => s.schools)
        .map(s => ({
          ...(s.schools as any),
          role: 'staff' as const
        }));

      const teacher = (teacherSchools || [])
        .filter(t => t.schools)
        .map(t => ({
          ...(t.schools as any),
          role: 'teacher' as const
        }));

      const parent = (parentAssociations || [])
        .filter(p => p.school_student_families && (p.school_student_families as any)?.schools)
        .map(p => ({
          ...((p.school_student_families as any).schools as any),
          role: 'parent' as const
        }));

      // Fusionner et dédupliquer par id (priorité: owner > staff > teacher > parent)
      const schoolMap = new Map();
      
      // Ajouter les écoles parent d'abord (priorité la plus basse)
      parent.forEach(s => schoolMap.set(s.id, s));
      // Puis les écoles enseignant
      teacher.forEach(s => schoolMap.set(s.id, s));
      // Puis les écoles staff
      staff.forEach(s => schoolMap.set(s.id, s));
      // Puis les écoles propriétaire (priorité la plus haute)
      owned.forEach(s => schoolMap.set(s.id, s));

      return Array.from(schoolMap.values());
    },
    enabled: !!userId,
  });
};
 