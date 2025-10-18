/**
 * Badge pour afficher le professeur qui a validé/rejeté un exercice
 */
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle2, XCircle } from 'lucide-react';

interface ValidatedByTeacherBadgeProps {
  teacherId: string;
  status: 'approved' | 'rejected';
}

export const ValidatedByTeacherBadge: React.FC<ValidatedByTeacherBadgeProps> = ({ 
  teacherId, 
  status 
}) => {
  // Récupérer les infos du professeur
  const { data: teacher } = useQuery({
    queryKey: ['teacher-profile', teacherId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', teacherId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!teacherId,
  });

  if (!teacher) return null;

  const displayName = `${teacher.first_name || ''} ${teacher.last_name || ''}`.trim() || 'Professeur';

  return (
    <div className={`
      inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium
      ${status === 'approved' 
        ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' 
        : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
      }
    `}>
      {status === 'approved' ? (
        <CheckCircle2 size={12} />
      ) : (
        <XCircle size={12} />
      )}
      <span>
        {status === 'approved' ? 'Validé' : 'Rejeté'} par {displayName}
      </span>
    </div>
  );
};
