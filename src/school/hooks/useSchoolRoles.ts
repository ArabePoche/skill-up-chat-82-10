import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook pour récupérer tous les rôles disponibles pour une école
 * Inclut les rôles système et les rôles personnalisés de l'école
 */
export interface SchoolRole {
  id: string;
  name: string;
  description: string | null;
  is_system: boolean;
  school_id: string | null;
}

export const useSchoolRoles = (schoolId: string | undefined) => {
  return useQuery({
    queryKey: ['school-roles', schoolId],
    queryFn: async (): Promise<SchoolRole[]> => {
      if (!schoolId) return [];

      // Récupérer les rôles système (school_id IS NULL) ET les rôles personnalisés de l'école
      const { data, error } = await supabase
        .from('school_roles')
        .select('id, name, description, is_system, school_id')
        .or(`school_id.is.null,school_id.eq.${schoolId}`)
        .order('is_system', { ascending: false })
        .order('name');

      if (error) {
        console.error('Error fetching school roles:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!schoolId,
  });
};

/**
 * Hook pour récupérer uniquement les rôles assignables (excluant owner)
 * Utilisé dans le modal de demande d'adhésion
 */
export const useAssignableRoles = (schoolId: string | undefined) => {
  return useQuery({
    queryKey: ['assignable-roles', schoolId],
    queryFn: async (): Promise<SchoolRole[]> => {
      if (!schoolId) return [];

      const { data, error } = await supabase
        .from('school_roles')
        .select('id, name, description, is_system, school_id')
        .or(`school_id.is.null,school_id.eq.${schoolId}`)
        .not('name', 'eq', 'owner') // Exclure le rôle owner
        .not('name', 'eq', 'admin') // Exclure le rôle admin (attribué uniquement par le propriétaire)
        .order('is_system', { ascending: false })
        .order('name');

      if (error) {
        console.error('Error fetching assignable roles:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!schoolId,
  });
};

/**
 * Labels traduits pour les rôles système
 */
export const ROLE_LABELS: Record<string, string> = {
  owner: 'Propriétaire',
  admin: 'Administrateur',
  secretary: 'Secrétaire',
  teacher: 'Enseignant',
  parent: 'Parent',
  student: 'Élève',
  supervisor: 'Superviseur',
};

/**
 * Descriptions des rôles système
 */
export const ROLE_DESCRIPTIONS: Record<string, string> = {
  owner: 'Accès total à l\'école',
  admin: 'Gestion complète de l\'école',
  secretary: 'Gestion administrative',
  teacher: 'Gestion pédagogique et notes',
  parent: 'Consultation et communication',
  student: 'Accès étudiant',
  supervisor: 'Surveillance et discipline',
};
