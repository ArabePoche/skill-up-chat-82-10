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
        num.replace(/[^0-9+]/g, '')
      );
      
      console.log('🔍 Recherche de contacts avec les numéros normalization:', normalizedNumbers);

      // Appeler la fonction RPC sécurisée (SECURITY DEFINER, bypass RLS)
      const { data: matches, error } = await supabase
        .rpc('find_contacts_by_phone', {
          phone_numbers: normalizedNumbers,
        });

      if (error) throw error;

      setMatchingUsers(matches || []);
      return matches || [];
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
