/**
 * Hook pour gérer les offres d'emploi des boutiques
 * CRUD pour les propriétaires de boutique
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ShopJobListing {
  id: string;
  shop_id: string;
  owner_id: string;
  title: string;
  description: string | null;
  keywords: string[];
  location: string | null;
  experience_level: string;
  is_active: boolean;
  created_at: string;
}

export const useShopJobListings = (ownerId?: string) => {
  return useQuery({
    queryKey: ['shop-job-listings', ownerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shop_job_listings')
        .select('*')
        .eq('owner_id', ownerId!)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ShopJobListing[];
    },
    enabled: !!ownerId,
  });
};

export const useCreateJobListing = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (listing: {
      shop_id: string;
      owner_id: string;
      title: string;
      description: string;
      keywords: string[];
      location: string;
      experience_level: string;
    }) => {
      const { data, error } = await supabase
        .from('shop_job_listings')
        .insert(listing)
        .select()
        .single();

      if (error) throw error;

      // Notifier les CV correspondants (matching par mots-clés)
      if (listing.keywords.length > 0) {
        const keywordPattern = listing.keywords.map(k => `%${k}%`);
        
        // Chercher les CV publics avec des compétences correspondantes
        const { data: matchingCvs } = await supabase
          .from('public_cvs')
          .select('user_id')
          .eq('is_public', true);

        // Filtrer côté client les CV avec des compétences matchantes
        const matchedUserIds = (matchingCvs || [])
          .filter(cv => {
            const skills = JSON.stringify(cv).toLowerCase();
            return listing.keywords.some(k => skills.includes(k.toLowerCase()));
          })
          .map(cv => cv.user_id)
          .filter(id => id !== listing.owner_id);

        // Envoyer les notifications aux candidats correspondants
        if (matchedUserIds.length > 0) {
          const notifications = matchedUserIds.map(userId => ({
            user_id: userId,
            type: 'job_match',
            title: 'Offre correspondant à votre profil',
            message: `Une nouvelle offre "${listing.title}" correspond à vos compétences`,
            is_read: false,
          }));

          await supabase.from('notifications').insert(notifications);
        }
      }

      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Offre publiée !',
        description: 'Les candidats correspondants seront notifiés.',
      });
      queryClient.invalidateQueries({ queryKey: ['shop-job-listings'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Erreur',
        description: error.message || "Impossible de publier l'offre",
        variant: 'destructive',
      });
    },
  });
};
