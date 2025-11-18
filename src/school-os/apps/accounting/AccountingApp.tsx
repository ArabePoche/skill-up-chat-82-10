/**
 * Application de comptabilité de l'école
 */
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserSchool } from '@/school/hooks/useSchool';
import { AccountingView } from './components/AccountingView';

export const AccountingApp: React.FC = () => {
  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const { data: school } = useUserSchool(user?.id);

  if (!school) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Chargement de l'école...</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-6">
      <AccountingView schoolId={school.id} />
    </div>
  );
};
