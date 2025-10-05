/**
 * Hook pour trouver les utilisateurs dont les numéros correspondent aux contacts
 */
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface MatchingUser {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  phone_country_code: string | null;
}

export const useMatchingUsers = () => {
  const [matchingUsers, setMatchingUsers] = useState<MatchingUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const findMatchingUsers = async (phoneNumbers: string[]) => {
    if (phoneNumbers.length === 0) {
      toast({
        title: "Aucun numéro",
        description: "Aucun numéro de téléphone à rechercher",
        variant: "destructive",
      });
      return [];
    }

    setIsLoading(true);
    try {
      // Normaliser les numéros (enlever espaces, tirets, etc.)
      const normalizedNumbers = phoneNumbers.map(num => 
        num.replace(/[\s\-\(\)]/g, '')
      );

      // Récupérer l'utilisateur actuel
      const { data: { user } } = await supabase.auth.getUser();

      // Rechercher les profils avec ces numéros
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, phone, phone_country_code')
        .not('phone', 'is', null)
        .neq('id', user?.id || ''); // Exclure l'utilisateur actuel

      if (error) throw error;

      // Filtrer les profils qui correspondent aux numéros de contacts
      const matches = profiles?.filter(profile => {
        if (!profile.phone) return false;
        const profilePhone = profile.phone.replace(/[\s\-\(\)]/g, '');
        return normalizedNumbers.some(num => 
          num.includes(profilePhone) || profilePhone.includes(num)
        );
      }) || [];

      setMatchingUsers(matches);
      return matches;
    } catch (error) {
      console.error('Erreur lors de la recherche des utilisateurs:', error);
      toast({
        title: "Erreur",
        description: "Impossible de rechercher les utilisateurs",
        variant: "destructive",
      });
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  return {
    matchingUsers,
    isLoading,
    findMatchingUsers
  };
};
