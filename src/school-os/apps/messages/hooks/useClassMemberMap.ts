/**
 * Hook pour construire un mapping classId -> membres (profs et parents) de cette classe
 * Utilisé par le RecipientGroupPicker pour filtrer par classe
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SchoolMember } from '../types';

export const useClassMemberMap = (
  schoolId?: string,
  schoolYearId?: string,
  allMembers?: SchoolMember[]
) => {
  return useQuery({
    queryKey: ['class-member-map', schoolId, schoolYearId],
    queryFn: async (): Promise<Record<string, SchoolMember[]>> => {
      if (!schoolId || !schoolYearId || !allMembers?.length) return {};

      const memberById = new Map(allMembers.map(m => [m.id, m]));
      const result: Record<string, SchoolMember[]> = {};

      // 1. Teachers per class via class_subjects
      const { data: classSubjects } = await supabase
        .from('class_subjects')
        .select('class_id, teacher_id')
        .not('teacher_id', 'is', null);

      (classSubjects || []).forEach((cs: any) => {
        if (!cs.teacher_id || !cs.class_id) return;
        const member = memberById.get(cs.teacher_id);
        if (member) {
          if (!result[cs.class_id]) result[cs.class_id] = [];
          if (!result[cs.class_id].find(m => m.id === member.id)) {
            result[cs.class_id].push(member);
          }
        }
      });

      // 2. Parents per class: students_school -> family -> parent_family_associations
      const { data: students } = await supabase
        .from('students_school')
        .select('class_id, family_id')
        .eq('school_id', schoolId)
        .eq('school_year_id', schoolYearId)
        .not('class_id', 'is', null)
        .not('family_id', 'is', null);

      const familyClassMap = new Map<string, string[]>();
      (students || []).forEach((s: any) => {
        if (!s.family_id || !s.class_id) return;
        if (!familyClassMap.has(s.family_id)) familyClassMap.set(s.family_id, []);
        const classes = familyClassMap.get(s.family_id)!;
        if (!classes.includes(s.class_id)) classes.push(s.class_id);
      });

      if (familyClassMap.size > 0) {
        const { data: parentAssocs } = await supabase
          .from('parent_family_associations')
          .select('user_id, family_id')
          .eq('status', 'active')
          .in('family_id', Array.from(familyClassMap.keys()));

        (parentAssocs || []).forEach((pa: any) => {
          const member = memberById.get(pa.user_id);
          if (!member) return;
          const classIds = familyClassMap.get(pa.family_id) || [];
          classIds.forEach(classId => {
            if (!result[classId]) result[classId] = [];
            if (!result[classId].find(m => m.id === member.id)) {
              result[classId].push(member);
            }
          });
        });
      }

      return result;
    },
    enabled: !!schoolId && !!schoolYearId && (allMembers?.length || 0) > 0,
    staleTime: 2 * 60 * 1000,
  });
};
