// Application de gestion des paiements scolaires
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserSchool } from '@/school/hooks/useSchool';
import { PaymentsView } from './components/PaymentsView';

export const PaymentsApp: React.FC = () => {
  // Récupérer l'utilisateur connecté
  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  // Récupérer l'école de l'utilisateur
  const { data: school } = useUserSchool(user?.id);

  if (!school) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Chargement de l'école...</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-3 sm:p-4 md:p-6">
      <PaymentsView schoolId={school.id} />
    </div>
  );
};
