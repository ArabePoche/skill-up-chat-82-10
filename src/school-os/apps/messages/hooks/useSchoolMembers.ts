/**
 * Hook pour rechercher les membres de l'école (profs, parents, staff, élèves)
 * Utilisé dans le ComposeDialog pour sélectionner les destinataires
 * Pour les parents : ne montre que les profs des classes de leurs enfants + admin/directeur
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { SchoolMember } from '../types';

interface UseSchoolMembersOptions {
  isParent?: boolean;
  schoolYearId?: string;
}

export const useSchoolMembers = (schoolId?: string, options?: UseSchoolMembersOptions) => {
  const [searchQuery, setSearchQuery] = useState('');
  const { user } = useAuth();
  const isParent = options?.isParent || false;
  const schoolYearId = options?.schoolYearId;

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['school-members', schoolId, isParent, schoolYearId, user?.id],
    queryFn: async (): Promise<SchoolMember[]> => {
      if (!schoolId) return [];

      const result: SchoolMember[] = [];
      const seenIds = new Set<string>();

      if (isParent && user?.id) {
        // === PARENT MODE: only show teachers of their children's classes + admin ===

        // 1. Get parent's children's class IDs
        const { data: associations } = await supabase
          .from('parent_family_associations')
          .select('family_id, school_student_families!inner(school_id)')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .eq('school_student_families.school_id', schoolId);

        const familyIds = (associations || []).map(a => a.family_id);
        let childClassIds: string[] = [];

        if (familyIds.length > 0 && schoolYearId) {
          const { data: students } = await supabase
            .from('students_school')
            .select('class_id')
            .in('family_id', familyIds)
            .eq('school_id', schoolId)
            .eq('school_year_id', schoolYearId);

          childClassIds = [...new Set((students || []).map(s => s.class_id).filter(Boolean) as string[])];
        }

        // 2. Get teachers assigned to those classes via class_subjects
        if (childClassIds.length > 0) {
          const { data: classSubjects } = await supabase
            .from('class_subjects')
            .select('teacher_id')
            .in('class_id', childClassIds);

          const teacherUserIds = [...new Set((classSubjects || []).map(cs => cs.teacher_id).filter(Boolean) as string[])];

          if (teacherUserIds.length > 0) {
            // teacher_id in class_subjects references profiles.id
            const { data: teacherProfiles } = await supabase
              .from('profiles')
              .select('id, first_name, last_name, email, avatar_url')
              .in('id', teacherUserIds);

            (teacherProfiles || []).forEach(p => {
              if (!seenIds.has(p.id)) {
                seenIds.add(p.id);
                result.push({
                  id: p.id,
                  name: `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Enseignant',
                  email: p.email || '',
                  role: 'teacher',
                  avatar_url: p.avatar_url || undefined,
                });
              }
            });

            // Also try school_teachers table for teacher names
            const { data: teachers } = await (supabase as any)
              .from('school_teachers')
              .select('id, user_id, first_name, last_name, email')
              .eq('school_id', schoolId)
              .eq('status', 'active')
              .in('user_id', teacherUserIds);

            (teachers || []).forEach((t: any) => {
              const id = t.user_id || t.id;
              if (!seenIds.has(id)) {
                seenIds.add(id);
                result.push({
                  id,
                  name: `${t.first_name || ''} ${t.last_name || ''}`.trim(),
                  email: t.email || '',
                  role: 'teacher',
                });
              }
            });
          }
        }

        // 3. Get school owner/admin
        const { data: schoolData } = await supabase
          .from('schools')
          .select('owner_id')
          .eq('id', schoolId)
          .maybeSingle();

        if (schoolData?.owner_id && !seenIds.has(schoolData.owner_id)) {
          const { data: ownerProfile } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, email, avatar_url')
            .eq('id', schoolData.owner_id)
            .maybeSingle();

          if (ownerProfile) {
            seenIds.add(ownerProfile.id);
            result.push({
              id: ownerProfile.id,
              name: `${ownerProfile.first_name || ''} ${ownerProfile.last_name || ''}`.trim() || 'Directeur',
              email: ownerProfile.email || '',
              role: 'admin',
              avatar_url: ownerProfile.avatar_url || undefined,
            });
          }
        }

        // 4. Get staff (secretary, etc.)
        const { data: staff } = await (supabase as any)
          .from('school_staff')
          .select('id, user_id, first_name, last_name, email, position')
          .eq('school_id', schoolId)
          .eq('status', 'active');

        (staff || []).forEach((s: any) => {
          const id = s.user_id || s.id;
          if (!seenIds.has(id)) {
            seenIds.add(id);
            result.push({
              id,
              name: `${s.first_name || ''} ${s.last_name || ''}`.trim(),
              email: s.email || '',
              role: 'staff',
            });
          }
        });

        return result;
      }

      // === NON-PARENT MODE: show all members (existing logic) ===

      // 1. Get teachers
      const { data: teachers } = await (supabase as any)
        .from('school_teachers')
        .select('id, user_id, first_name, last_name, email')
        .eq('school_id', schoolId)
        .eq('status', 'active');

      (teachers || []).forEach((t: any) => {
        const id = t.user_id || t.id;
        if (!seenIds.has(id)) {
          seenIds.add(id);
          result.push({
            id,
            name: `${t.first_name || ''} ${t.last_name || ''}`.trim(),
            email: t.email || '',
            role: 'teacher',
          });
        }
      });

      // 2. Get staff
      const { data: staffAll } = await (supabase as any)
        .from('school_staff')
        .select('id, user_id, first_name, last_name, email, position')
        .eq('school_id', schoolId)
        .eq('status', 'active');

      (staffAll || []).forEach((s: any) => {
        const id = s.user_id || s.id;
        if (!seenIds.has(id)) {
          seenIds.add(id);
          result.push({
            id,
            name: `${s.first_name || ''} ${s.last_name || ''}`.trim(),
            email: s.email || '',
            role: 'staff',
          });
        }
      });

      // 3. Get users with roles in school
      const { data: userRoles } = await (supabase as any)
        .from('school_user_roles')
        .select(`user_id, school_roles!inner(name)`)
        .eq('school_id', schoolId);

      const roleUserIds = (userRoles || [])
        .map((ur: any) => ur.user_id)
        .filter((id: string) => !seenIds.has(id));

      if (roleUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email, avatar_url')
          .in('id', roleUserIds);

        (profiles || []).forEach((p) => {
          if (!seenIds.has(p.id)) {
            seenIds.add(p.id);
            const role = (userRoles || []).find((ur: any) => ur.user_id === p.id)?.school_roles?.name || 'member';
            result.push({
              id: p.id,
              name: `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Sans nom',
              email: p.email || '',
              role,
              avatar_url: p.avatar_url || undefined,
            });
          }
        });
      }

      // 4. Get parents via parent_family_associations
      const { data: parentAssociations } = await supabase
        .from('parent_family_associations')
        .select('user_id, school_student_families!inner(school_id)')
        .eq('status', 'active')
        .eq('school_student_families.school_id', schoolId);

      const parentUserIds = (parentAssociations || [])
        .map((pa: any) => pa.user_id)
        .filter((id: string) => !seenIds.has(id));

      if (parentUserIds.length > 0) {
        const { data: parentProfiles } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email, avatar_url')
          .in('id', parentUserIds);

        (parentProfiles || []).forEach((p) => {
          if (!seenIds.has(p.id)) {
            seenIds.add(p.id);
            result.push({
              id: p.id,
              name: `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Parent',
              email: p.email || '',
              role: 'parent',
              avatar_url: p.avatar_url || undefined,
            });
          }
        });
      }

      // 5. Get school owner
      const { data: schoolData } = await supabase
        .from('schools')
        .select('owner_id')
        .eq('id', schoolId)
        .maybeSingle();

      if (schoolData?.owner_id && !seenIds.has(schoolData.owner_id)) {
        const { data: ownerProfile } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email, avatar_url')
          .eq('id', schoolData.owner_id)
          .maybeSingle();

        if (ownerProfile) {
          result.push({
            id: ownerProfile.id,
            name: `${ownerProfile.first_name || ''} ${ownerProfile.last_name || ''}`.trim() || 'Propriétaire',
            email: ownerProfile.email || '',
            role: 'admin',
            avatar_url: ownerProfile.avatar_url || undefined,
          });
        }
      }

      return result;
    },
    enabled: !!schoolId,
    staleTime: 2 * 60 * 1000,
  });

  // Filter members by search query
  const filteredMembers = searchQuery.trim()
    ? members.filter((m) => {
        const q = searchQuery.toLowerCase();
        return (
          m.name.toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q) ||
          m.role.toLowerCase().includes(q)
        );
      })
    : members;

  // Group members by role
  const groups = [
    { key: 'admin', label: 'Administration', members: members.filter((m) => m.role === 'admin' || m.role === 'owner') },
    { key: 'teacher', label: 'Enseignants', members: members.filter((m) => m.role === 'teacher') },
    { key: 'staff', label: 'Personnel', members: members.filter((m) => m.role === 'staff' || m.role === 'secretary') },
    { key: 'parent', label: 'Parents', members: members.filter((m) => m.role === 'parent') },
    { key: 'student', label: 'Élèves', members: members.filter((m) => m.role === 'student') },
  ].filter((g) => g.members.length > 0);

  return {
    members,
    filteredMembers,
    groups,
    searchQuery,
    setSearchQuery,
    isLoading,
  };
};
