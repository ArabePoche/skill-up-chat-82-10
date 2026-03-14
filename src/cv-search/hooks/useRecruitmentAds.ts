/**
 * Hook pour gérer les annonces de recrutement payantes
 * CRUD + estimation de portée selon le budget
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface RecruitmentAd {
  id: string;
  owner_id: string;
  shop_id: string | null;
  title: string;
  description: string | null;
  skills: string[];
  location: string | null;
  salary_range: string | null;
  contract_type: string;
  experience_level: string;
  media_urls: string[];
  publish_type: 'post' | 'status';
  budget: number;
  estimated_reach: number;
  status: 'draft' | 'pending_payment' | 'active' | 'expired' | 'cancelled';
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateRecruitmentAdInput {
  title: string;
  description: string;
  skills: string[];
  location: string;
  salary_range: string;
  contract_type: string;
  experience_level: string;
  media_urls: string[];
  publish_type: 'post' | 'status';
  publish_as_post: boolean;
  publish_as_status: boolean;
  budget: number;
}

/**
 * Estime la portée en fonction du budget (FCFA)
 * Modèle simplifié : ~10 vues par 100 FCFA de base, avec bonus dégressif
 */
export const estimateReach = (budget: number): number => {
  if (budget <= 0) return 0;
  // Base: 10 vues / 100 FCFA pour les premiers 5000
  // Puis 8 vues / 100 FCFA jusqu'à 20000
  // Puis 5 vues / 100 FCFA au-delà
  let reach = 0;
  if (budget <= 5000) {
    reach = Math.floor(budget / 100) * 10;
  } else if (budget <= 20000) {
    reach = 500 + Math.floor((budget - 5000) / 100) * 8;
  } else {
    reach = 500 + 1200 + Math.floor((budget - 20000) / 100) * 5;
  }
  return reach;
};

/** Durée d'affichage en jours selon le budget */
export const estimateDuration = (budget: number): number => {
  if (budget <= 0) return 0;
  if (budget <= 2000) return 1;
  if (budget <= 5000) return 3;
  if (budget <= 10000) return 7;
  if (budget <= 25000) return 14;
  return 30;
};

export const useRecruitmentAds = (ownerId?: string) => {
  return useQuery({
    queryKey: ['recruitment-ads', ownerId],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('recruitment_ads' as any)
        .select('*')
        .eq('owner_id', ownerId!)
        .order('created_at', { ascending: false }) as any);

      if (error) throw error;
      return data as RecruitmentAd[];
    },
    enabled: !!ownerId,
  });
};

export const useCreateRecruitmentAd = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateRecruitmentAdInput & { owner_id: string; shop_id?: string }) => {
      const estimated_reach = estimateReach(input.budget);
      const durationDays = estimateDuration(input.budget);
      const expires_at = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await (supabase
        .from('recruitment_ads' as any)
        .insert({
          owner_id: input.owner_id,
          shop_id: input.shop_id || null,
          title: input.title,
          description: input.description,
          skills: input.skills,
          location: input.location,
          salary_range: input.salary_range,
          contract_type: input.contract_type,
          experience_level: input.experience_level,
          media_urls: input.media_urls,
          publish_type: input.publish_type,
          budget: input.budget,
          estimated_reach,
          status: 'pending_payment', // En attente de paiement
          is_active: false,
          expires_at,
        })
        .select()
        .single() as any);

      if (error) throw error;

      // === Créer un vrai Post si publishAsPost ===
      if (input.publish_as_post) {
        const postContent = `📢 **${input.title}**\n\n${input.description}\n\n` +
          (input.skills.length > 0 ? `🔧 Compétences : ${input.skills.join(', ')}\n` : '') +
          (input.location ? `📍 ${input.location}\n` : '') +
          (input.salary_range ? `💰 ${input.salary_range}\n` : '') +
          `📋 ${input.contract_type} · ${input.experience_level}`;

        const { data: postData, error: postError } = await supabase
          .from('posts')
          .insert({
            content: postContent,
            post_type: 'recruitment',
            author_id: input.owner_id,
            image_url: input.media_urls[0] || null,
            is_active: true,
            likes_count: 0,
            comments_count: 0,
          })
          .select()
          .single();

        if (!postError && postData && input.media_urls.length > 0) {
          const mediaRows = input.media_urls.map((url, idx) => ({
            post_id: postData.id,
            file_url: url,
            file_type: url.match(/\.(mp4|webm|mov)/) ? 'video' : 'image',
            order_index: idx,
          }));
          await supabase.from('post_media').insert(mediaRows);
        }
      }

      // === Créer un vrai Statut (Story) si publishAsStatus ===
      if (input.publish_as_status) {
        const hasImage = input.media_urls.some(url => !url.match(/\.(mp4|webm|mov)/));
        const hasVideo = input.media_urls.some(url => url.match(/\.(mp4|webm|mov)/));
        const firstMedia = input.media_urls[0] || null;

        await supabase
          .from('user_stories')
          .insert({
            user_id: input.owner_id,
            content_type: hasVideo ? 'video' : hasImage ? 'image' : 'text',
            content_text: `📢 ${input.title}`,
            media_url: firstMedia,
            background_color: '#2563eb',
            description: `${input.description}\n📍 ${input.location || ''} · ${input.contract_type}`,
          });
      }

      // Envoyer des notifications aux candidats correspondants
      if (input.skills.length > 0) {
        const { data: matchingCvs } = await supabase
          .from('public_cvs')
          .select('user_id')
          .eq('is_public', true);

        const matchedUserIds = (matchingCvs || [])
          .filter((cv: any) => {
            const cvString = JSON.stringify(cv).toLowerCase();
            return input.skills.some(s => cvString.includes(s.toLowerCase()));
          })
          .map((cv: any) => cv.user_id)
          .filter((id: string) => id !== input.owner_id);

        if (matchedUserIds.length > 0) {
          const notifications = matchedUserIds.map((userId: string) => ({
            user_id: userId,
            type: 'recruitment_ad',
            title: '📢 Nouvelle offre de recrutement',
            message: `"${input.title}" correspond à votre profil – Consultez l'annonce !`,
            is_read: false,
          }));
          await supabase.from('notifications').insert(notifications);
        }
      }

      return data;
    },
    onSuccess: () => {
      toast({
        title: '📢 Annonce créée !',
        description: 'Votre annonce est visible dans les posts et/ou statuts.',
      });
      queryClient.invalidateQueries({ queryKey: ['recruitment-ads'] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['stories'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Erreur',
        description: error.message || "Impossible de créer l'annonce",
        variant: 'destructive',
      });
    },
  });
};
