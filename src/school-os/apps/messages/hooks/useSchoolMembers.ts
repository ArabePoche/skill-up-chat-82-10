/**
 * Hook pour rechercher les membres de l'école (profs, parents, staff, élèves)
 * Utilisé dans le ComposeDialog pour sélectionner les destinataires
 */
import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SchoolMember } from '../types';

export const useSchoolMembers = (schoolId?: string) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch all school members (teachers, staff, parents via user roles)
  const { data: members = [], isLoading } = useQuery({
    queryKey: ['school-members', schoolId],
    queryFn: async (): Promise<SchoolMember[]> => {
      if (!schoolId) return [];

      const result: SchoolMember[] = [];
      const seenIds = new Set<string>();

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

      // 3. Get users with roles in school (parents, students, etc.)
      const { data: userRoles } = await (supabase as any)
        .from('school_user_roles')
        .select(`
          user_id,
          school_roles!inner(name)
        `)
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

      // 4. Get school owner
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
