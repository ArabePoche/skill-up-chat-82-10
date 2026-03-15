/**
 * Hook pour gérer les annonces payantes (recrutement + produit/service)
 * CRUD + estimation de portée selon le budget
 * Flux : création → pending_approval (si payant) → admin approuve → publication
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface RecruitmentAd {
  id: string;
  owner_id: string;
  shop_id: string | null;
  ad_type: 'recruitment' | 'product';
  title: string;
  description: string | null;
  skills: string[];
  location: string | null;
  salary_range: string | null;
  contract_type: string;
  experience_level: string;
  media_urls: string[];
  publish_type: 'post' | 'status';
  publish_as_post: boolean;
  publish_as_status: boolean;
  budget: number;
  estimated_reach: number;
  status: 'draft' | 'pending_approval' | 'pending_payment' | 'active' | 'rejected' | 'expired' | 'cancelled';
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  positions: string[];
  required_documents: string[];
  full_address: string;
  product_id: string | null;
  product_name: string | null;
  product_price: number | null;
  service_description: string | null;
}

export interface CreateRecruitmentAdInput {
  title: string;
  description: string;
  ad_type: 'recruitment' | 'product';
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
  positions?: string[];
  required_documents?: string[];
  full_address?: string;
  product_id?: string;
  product_name?: string;
  product_price?: number;
  service_description?: string;
}

/** Estime la portée en fonction du budget (FCFA) */
export const estimateReach = (budget: number): number => {
  if (budget <= 0) return 0;
  if (budget <= 5000) return Math.floor(budget / 100) * 10;
  if (budget <= 20000) return 500 + Math.floor((budget - 5000) / 100) * 8;
  return 500 + 1200 + Math.floor((budget - 20000) / 100) * 5;
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

/** Récupérer les annonces d'un utilisateur */
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

/** Récupérer toutes les annonces en attente d'approbation (admin) */
export const usePendingRecruitmentAds = () => {
  return useQuery({
    queryKey: ['recruitment-ads', 'pending'],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('recruitment_ads' as any)
        .select('*')
        .eq('status', 'pending_approval')
        .order('created_at', { ascending: false }) as any);
      if (error) throw error;
      return data as RecruitmentAd[];
    },
  });
};

/** Créer une annonce (statut pending_approval) */
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
          ad_type: input.ad_type || 'recruitment',
          title: input.title,
          description: input.description,
          skills: input.skills,
          location: input.location,
          salary_range: input.salary_range,
          contract_type: input.contract_type,
          experience_level: input.experience_level,
          media_urls: input.media_urls,
          publish_type: input.publish_type,
          publish_as_post: input.publish_as_post,
          publish_as_status: input.publish_as_status,
          budget: input.budget,
          estimated_reach,
          status: 'pending_approval',
          is_active: false,
          expires_at,
          positions: input.positions || [],
          required_documents: input.required_documents || [],
          full_address: input.full_address || '',
          product_id: input.product_id || null,
          product_name: input.product_name || null,
          product_price: input.product_price || null,
          service_description: input.service_description || null,
        })
        .select()
        .single() as any);

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: '📢 Annonce soumise !',
        description: "Votre annonce est en attente d'approbation par un administrateur.",
      });
      queryClient.invalidateQueries({ queryKey: ['recruitment-ads'] });
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

/** Admin approuve une annonce → publie dans posts/stories + notifie */
export const useApproveRecruitmentAd = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ad: RecruitmentAd) => {
      // 1. Mettre à jour le statut
      const { error: updateError } = await (supabase
        .from('recruitment_ads' as any)
        .update({ status: 'active', is_active: true })
        .eq('id', ad.id) as any);
      if (updateError) throw updateError;

      const isRecruitment = ad.ad_type === 'recruitment';

      // 2. Créer un Post si demandé
      if (ad.publish_as_post) {
        const postContent = isRecruitment
          ? `📢 **${ad.title}**\n\n${ad.description || ''}\n\n` +
            ((ad.skills || []).length > 0 ? `🔧 Compétences : ${ad.skills.join(', ')}\n` : '') +
            (ad.location ? `📍 ${ad.location}\n` : '') +
            (ad.salary_range ? `💰 ${ad.salary_range}\n` : '') +
            `📋 ${ad.contract_type} · ${ad.experience_level}`
          : `🛍️ **${ad.title}**\n\n${ad.description || ''}\n\n` +
            (ad.product_price ? `💰 ${ad.product_price.toLocaleString('fr-FR')} FCFA\n` : '') +
            (ad.service_description ? `${ad.service_description}\n` : '') +
            (ad.location ? `📍 ${ad.location}\n` : '');

        const { data: postData, error: postError } = await supabase
          .from('posts')
          .insert({
            content: postContent,
            post_type: isRecruitment ? 'recruitment' : 'annonce',
            author_id: ad.owner_id,
            image_url: (ad.media_urls || [])[0] || null,
            is_active: true,
            likes_count: 0,
            comments_count: 0,
            recruitment_ad_id: ad.id,
            required_profiles: isRecruitment ? (ad.skills || []) : [],
            shop_id: ad.shop_id || null,
          } as any)
          .select()
          .single();

        if (!postError && postData && (ad.media_urls || []).length > 0) {
          const mediaRows = ad.media_urls.map((url, idx) => ({
            post_id: postData.id,
            file_url: url,
            file_type: url.match(/\.(mp4|webm|mov)/) ? 'video' : 'image',
            order_index: idx,
          }));
          await supabase.from('post_media').insert(mediaRows);
        }
      }

      // 3. Créer un Statut (Story) si demandé
      if (ad.publish_as_status) {
        const mediaUrls = ad.media_urls || [];
        const hasVideo = mediaUrls.some(url => url.match(/\.(mp4|webm|mov)/));
        const hasImage = mediaUrls.some(url => !url.match(/\.(mp4|webm|mov)/));
        const firstMedia = mediaUrls[0] || null;

        const storyDescription = isRecruitment
          ? [ad.description || '', '', (ad.skills || []).length > 0 ? `🔧 Compétences : ${ad.skills.join(', ')}` : '', ad.location ? `📍 ${ad.location}` : '', ad.salary_range ? `💰 ${ad.salary_range}` : '', `📋 ${ad.contract_type} · ${ad.experience_level}`].filter(Boolean).join('\n')
          : [ad.description || '', '', ad.product_price ? `💰 ${ad.product_price.toLocaleString('fr-FR')} FCFA` : '', ad.service_description || '', ad.location ? `📍 ${ad.location}` : ''].filter(Boolean).join('\n');

        await supabase
          .from('user_stories')
          .insert({
            user_id: ad.owner_id,
            content_type: hasVideo ? 'video' : hasImage ? 'image' : 'text',
            content_text: `${isRecruitment ? '📢' : '🛍️'} ${ad.title}`,
            media_url: firstMedia,
            background_color: isRecruitment ? '#2563eb' : '#16a34a',
            description: storyDescription,
            recruitment_ad_id: ad.id,
          } as any);
      }

      // 4. Notifier les candidats correspondants (recrutement uniquement)
      if (isRecruitment && (ad.skills || []).length > 0) {
        const { data: matchingCvs } = await supabase.from('public_cvs').select('user_id').eq('is_public', true);
        const matchedUserIds = (matchingCvs || [])
          .filter((cv: any) => { const cvString = JSON.stringify(cv).toLowerCase(); return ad.skills.some(s => cvString.includes(s.toLowerCase())); })
          .map((cv: any) => cv.user_id)
          .filter((id: string) => id !== ad.owner_id);

        if (matchedUserIds.length > 0) {
          const notifications = matchedUserIds.map((userId: string) => ({
            user_id: userId, type: 'recruitment_ad',
            title: '📢 Nouvelle offre de recrutement',
            message: `"${ad.title}" correspond à votre profil – Consultez l'annonce !`,
            is_read: false,
          }));
          await supabase.from('notifications').insert(notifications);
        }
      }

      // 5. Notifier le propriétaire
      await supabase.from('notifications').insert({
        user_id: ad.owner_id, type: 'recruitment_ad',
        title: '✅ Annonce approuvée',
        message: `Votre annonce "${ad.title}" a été approuvée et publiée !`,
        is_read: false,
      });
    },
    onSuccess: () => {
      toast({ title: '✅ Annonce approuvée', description: "L'annonce a été publiée." });
      queryClient.invalidateQueries({ queryKey: ['recruitment-ads'] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['stories'] });
    },
    onError: (error: any) => {
      toast({ title: 'Erreur', description: error.message || "Impossible d'approuver", variant: 'destructive' });
    },
  });
};

/** Admin rejette une annonce */
export const useRejectRecruitmentAd = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ adId, ownerId, title }: { adId: string; ownerId: string; title: string }) => {
      const { error } = await (supabase
        .from('recruitment_ads' as any)
        .update({ status: 'rejected', is_active: false })
        .eq('id', adId) as any);
      if (error) throw error;
      await supabase.from('notifications').insert({
        user_id: ownerId, type: 'recruitment_ad',
        title: '❌ Annonce refusée',
        message: `Votre annonce "${title}" n'a pas été approuvée.`,
        is_read: false,
      });
    },
    onSuccess: () => {
      toast({ title: '❌ Annonce refusée', description: 'Le propriétaire a été notifié.' });
      queryClient.invalidateQueries({ queryKey: ['recruitment-ads'] });
    },
    onError: (error: any) => {
      toast({ title: 'Erreur', description: error.message || "Impossible de refuser", variant: 'destructive' });
    },
  });
};
