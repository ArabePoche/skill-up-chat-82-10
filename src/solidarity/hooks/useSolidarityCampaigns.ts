// Hook pour gérer les cagnottes solidaires (CRUD, contributions, config admin)
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { sendPushNotification } from '@/utils/notificationHelpers';
import { buildSolidarityCampaignPath } from '../campaignRoutes';

interface CreatorProfile {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  username?: string | null;
}

interface ContributionCountRow {
  campaign_id: string;
}

interface CampaignInteractionRow {
  campaign_id: string;
}

interface CampaignNotificationSubscriptionRow {
  user_id: string;
}

export interface SolidarityCampaign {
  id: string;
  creator_id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  goal_amount: number;
  collected_amount: number;
  commission_rate: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'closed';
  rejection_reason: string | null;
  approved_by: string | null;
  approved_at: string | null;
  deadline: string | null;
  category: string;
  beneficiary_name: string | null;
  created_at: string;
  updated_at: string;
  contributor_count?: number;
  likes_count?: number;
  shares_count?: number;
  testimonials_count?: number;
  user_has_liked?: boolean;
  creator?: { first_name: string; last_name: string; avatar_url: string | null };
}

export interface SolidarityContribution {
  id: string;
  campaign_id: string;
  contributor_id: string;
  amount: number;
  commission_amount: number;
  message: string | null;
  is_anonymous: boolean;
  created_at: string;
  campaign_title?: string;
  contributor?: { first_name: string; last_name: string; avatar_url: string | null };
}

export interface SolidarityTestimonial {
  id: string;
  campaign_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  author?: { first_name: string; last_name: string; avatar_url: string | null };
}

export interface SolidarityCommissionSettings {
  id: string;
  default_commission_rate: number;
  min_campaign_goal: number;
  max_campaign_goal: number;
  max_active_campaigns_per_user: number;
  updated_at: string;
}

const buildDisplayName = (profile?: Partial<CreatorProfile> | null) => {
  if (!profile) return 'Un utilisateur';
  if (profile.first_name && profile.last_name) {
    return `${profile.first_name} ${profile.last_name}`;
  }
  return profile.username || profile.first_name || profile.last_name || 'Un utilisateur';
};

const fetchProfileDisplay = async (userId: string) => {
  const { data } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, avatar_url, username')
    .eq('id', userId)
    .single();

  return data as CreatorProfile | null;
};

const emptyQueryResult = <T,>() => Promise.resolve({ data: [] as T[], error: null as { message?: string } | null });

const buildCountMap = (rows: CampaignInteractionRow[] | null | undefined) => {
  const countMap = new Map<string, number>();

  (rows || []).forEach((row) => {
    countMap.set(row.campaign_id, (countMap.get(row.campaign_id) || 0) + 1);
  });

  return countMap;
};

const enrichCampaigns = async (campaigns: SolidarityCampaign[], userId?: string) => {
  if (campaigns.length === 0) {
    return campaigns;
  }

  const creatorIds = [...new Set(campaigns.map((campaign) => campaign.creator_id).filter(Boolean))];
  const campaignIds = campaigns.map((campaign) => campaign.id);

  const [
    { data: profiles, error: profilesError },
    { data: likesRows, error: likesError },
    { data: testimonialsRows, error: testimonialsError },
    { data: sharesRows, error: sharesError },
    { data: userLikesRows, error: userLikesError },
  ] = await Promise.all([
    creatorIds.length > 0
      ? supabase
          .from('profiles')
          .select('id, first_name, last_name, avatar_url')
          .in('id', creatorIds)
      : emptyQueryResult<CreatorProfile>(),
    campaignIds.length > 0
      ? supabase
          .from('solidarity_campaign_likes')
          .select('campaign_id')
          .in('campaign_id', campaignIds)
      : emptyQueryResult<CampaignInteractionRow>(),
    campaignIds.length > 0
      ? supabase
          .from('solidarity_campaign_testimonials')
          .select('campaign_id')
          .in('campaign_id', campaignIds)
      : emptyQueryResult<CampaignInteractionRow>(),
    campaignIds.length > 0
      ? supabase
          .from('solidarity_campaign_shares')
          .select('campaign_id')
          .in('campaign_id', campaignIds)
      : emptyQueryResult<CampaignInteractionRow>(),
    campaignIds.length > 0 && userId
      ? supabase
          .from('solidarity_campaign_likes')
          .select('campaign_id')
          .in('campaign_id', campaignIds)
          .eq('user_id', userId)
      : emptyQueryResult<CampaignInteractionRow>(),
  ]);

  if (profilesError) {
    console.warn('Impossible de charger les profils des créateurs de cagnottes:', profilesError.message);
  }

  if (likesError) {
    console.warn('Impossible de charger les likes des cagnottes:', likesError.message);
  }

  if (testimonialsError) {
    console.warn('Impossible de charger les témoignages des cagnottes:', testimonialsError.message);
  }

  if (sharesError) {
    console.warn('Impossible de charger les partages des cagnottes:', sharesError.message);
  }

  if (userLikesError) {
    console.warn('Impossible de charger les likes du visiteur sur les cagnottes:', userLikesError.message);
  }

  const profileMap = new Map(
    (((profiles || []) as CreatorProfile[]) || []).map((profile) => [
      profile.id,
      {
        first_name: profile.first_name,
        last_name: profile.last_name,
        avatar_url: profile.avatar_url,
      },
    ])
  );

  const likeCountMap = buildCountMap((likesRows || []) as CampaignInteractionRow[]);
  const testimonialCountMap = buildCountMap((testimonialsRows || []) as CampaignInteractionRow[]);
  const shareCountMap = buildCountMap((sharesRows || []) as CampaignInteractionRow[]);
  const likedCampaignIds = new Set(((userLikesRows || []) as CampaignInteractionRow[]).map((row) => row.campaign_id));

  return campaigns.map((campaign) => ({
    ...campaign,
    contributor_count: Number(campaign.contributor_count || 0),
    likes_count: likeCountMap.get(campaign.id) || 0,
    shares_count: shareCountMap.get(campaign.id) || 0,
    testimonials_count: testimonialCountMap.get(campaign.id) || 0,
    user_has_liked: likedCampaignIds.has(campaign.id),
    creator: profileMap.get(campaign.creator_id),
  }));
};

const notifyAdminsForCampaign = async (campaign: Pick<SolidarityCampaign, 'id' | 'title'>, senderId: string) => {
  await supabase.from('notifications').insert({
    user_id: null,
    sender_id: senderId,
    title: 'Nouvelle cagnotte à valider',
    message: `La cagnotte "${campaign.title}" attend une validation administrateur.`,
    type: 'solidarity_campaign',
    is_read: false,
    is_for_all_admins: true,
  });

  const { data: admins } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'admin');

  const adminIds = (admins || []).map((admin) => admin.id).filter(Boolean);
  if (adminIds.length === 0) return;

  await sendPushNotification({
    userIds: adminIds,
    title: 'Nouvelle cagnotte à valider',
    message: `La cagnotte "${campaign.title}" attend votre validation.`,
    type: 'solidarity_campaign',
    clickAction: '/admin',
    data: { campaignId: campaign.id, targetTab: 'solidarity' },
    playLocalSound: false,
  });
};

const notifyCampaignOwner = async ({
  ownerId,
  senderId,
  title,
  message,
  campaignId,
  campaignTitle,
  type,
}: {
  ownerId: string;
  senderId: string | null;
  title: string;
  message: string;
  campaignId: string;
  campaignTitle: string;
  type: 'solidarity_campaign' | 'solidarity_contribution';
}) => {
  await supabase.from('notifications').insert({
    user_id: ownerId,
    sender_id: senderId,
    title,
    message,
    type,
    is_read: false,
    is_for_all_admins: false,
  });

  await sendPushNotification({
    userIds: [ownerId],
    title,
    message,
    type,
    clickAction: buildSolidarityCampaignPath(campaignId, campaignTitle),
    data: { campaignId },
    playLocalSound: false,
  });
};

const notifyCampaignInteraction = async ({
  campaignId,
  campaignTitle,
  actorId,
  actorName,
  ownerId,
  title,
  message,
  type,
}: {
  campaignId: string;
  campaignTitle: string;
  actorId: string;
  actorName: string;
  ownerId: string;
  title: string;
  message: string;
  type: 'solidarity_like' | 'solidarity_testimonial';
}) => {
  if (ownerId === actorId) return;

  await supabase.from('notifications').insert({
    user_id: ownerId,
    sender_id: actorId,
    title,
    message,
    type,
    is_read: false,
    is_for_all_admins: false,
  });

  await sendPushNotification({
    userIds: [ownerId],
    title,
    message,
    type,
    clickAction: buildSolidarityCampaignPath(campaignId, campaignTitle),
    data: { campaignId, actorId, actorName },
    playLocalSound: false,
  });
};

const notifyCampaignFollowers = async ({
  campaignId,
  campaignTitle,
  senderId,
  title,
  message,
  type,
  data,
  excludedUserIds = [],
}: {
  campaignId: string;
  campaignTitle: string;
  senderId: string | null;
  title: string;
  message: string;
  type: 'solidarity_campaign' | 'solidarity_contribution' | 'solidarity_like' | 'solidarity_testimonial';
  data?: Record<string, string>;
  excludedUserIds?: string[];
}) => {
  const { data: subscriptions, error } = await (supabase
    .from('solidarity_campaign_notification_subscriptions' as any)
    .select('user_id')
    .eq('campaign_id', campaignId) as any);

  if (error) throw error;

  const blockedIds = new Set(excludedUserIds.filter(Boolean));
  const recipientIds = [...new Set(((subscriptions || []) as CampaignNotificationSubscriptionRow[])
    .map((subscription) => subscription.user_id)
    .filter((userId) => userId && !blockedIds.has(userId)))];

  if (recipientIds.length === 0) return;

  await supabase.from('notifications').insert(
    recipientIds.map((userId) => ({
      user_id: userId,
      sender_id: senderId,
      title,
      message,
      type,
      is_read: false,
      is_for_all_admins: false,
    }))
  );

  await sendPushNotification({
    userIds: recipientIds,
    title,
    message,
    type,
    clickAction: buildSolidarityCampaignPath(campaignId, campaignTitle),
    data: {
      campaignId,
      ...(data || {}),
    },
    playLocalSound: false,
  });
};

// Récupérer les campagnes visibles selon les politiques RLS en vigueur.
export const useSolidarityCampaigns = (statusFilter?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['solidarity-campaigns', statusFilter, user?.id],
    queryFn: async () => {
      let query = supabase
        .from('solidarity_campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      const campaigns = (data || []) as unknown as SolidarityCampaign[];
      return enrichCampaigns(campaigns, user?.id);
    },
  });
};

export const useSolidarityCampaign = (campaignId?: string | null) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['solidarity-campaign', campaignId, user?.id],
    queryFn: async () => {
      if (!campaignId) return null;

      const { data, error } = await supabase
        .from('solidarity_campaigns')
        .select('*')
        .eq('id', campaignId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      const [campaign] = await enrichCampaigns([data as unknown as SolidarityCampaign], user?.id);
      return campaign || null;
    },
    enabled: !!campaignId,
  });
};

// Récupérer les contributions d'une campagne
export const useCampaignContributions = (campaignId: string | null) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['solidarity-contributions', campaignId, user?.id],
    queryFn: async () => {
      if (!campaignId || !user?.id) return [];
      const { data, error } = await supabase
        .from('solidarity_contributions')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false });
      if (error) throw error;

      const contributions = (data || []) as unknown as SolidarityContribution[];
      if (contributions.length === 0) {
        return contributions;
      }

      const contributorIds = [...new Set(contributions.map((contribution) => contribution.contributor_id).filter(Boolean))];
      if (contributorIds.length === 0) {
        return contributions;
      }

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, avatar_url')
        .in('id', contributorIds);

      if (profilesError) {
        console.warn('Impossible de charger les profils des contributeurs de cagnotte:', profilesError.message);
        return contributions;
      }

      const profileMap = new Map(
        ((profiles || []) as CreatorProfile[]).map((profile) => [
          profile.id,
          {
            first_name: profile.first_name,
            last_name: profile.last_name,
            avatar_url: profile.avatar_url,
          },
        ])
      );

      return contributions.map((contribution) => ({
        ...contribution,
        contributor: profileMap.get(contribution.contributor_id),
      }));
    },
    enabled: !!campaignId && !!user?.id,
  });
};

export const useCampaignNotificationSubscription = (campaignId?: string | null) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: isSubscribed = false } = useQuery({
    queryKey: ['solidarity-campaign-notification-subscription', campaignId, user?.id],
    queryFn: async () => {
      if (!campaignId || !user?.id) return false;

      const { data, error } = await (supabase
        .from('solidarity_campaign_notification_subscriptions' as any)
        .select('id')
        .eq('campaign_id', campaignId)
        .eq('user_id', user.id)
        .maybeSingle() as any);

      if (error) throw error;
      return !!data;
    },
    enabled: !!campaignId && !!user?.id,
  });

  const subscribeMutation = useMutation({
    mutationFn: async () => {
      if (!campaignId || !user?.id) throw new Error('Connectez-vous pour suivre cette cagnotte');

      const { error } = await (supabase
        .from('solidarity_campaign_notification_subscriptions' as any)
        .insert({
          campaign_id: campaignId,
          user_id: user.id,
        }) as any);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['solidarity-campaign-notification-subscription', campaignId, user?.id] });
      toast.success('Suivi de la cagnotte activé');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Impossible d\'activer le suivi de cette cagnotte');
    },
  });

  const unsubscribeMutation = useMutation({
    mutationFn: async () => {
      if (!campaignId || !user?.id) throw new Error('Connectez-vous pour modifier ce suivi');

      const { error } = await (supabase
        .from('solidarity_campaign_notification_subscriptions' as any)
        .delete()
        .eq('campaign_id', campaignId)
        .eq('user_id', user.id) as any);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['solidarity-campaign-notification-subscription', campaignId, user?.id] });
      toast.success('Suivi de la cagnotte désactivé');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Impossible de désactiver le suivi de cette cagnotte');
    },
  });

  return {
    isSubscribed,
    subscribe: subscribeMutation.mutateAsync,
    unsubscribe: unsubscribeMutation.mutateAsync,
    isLoading: subscribeMutation.isPending || unsubscribeMutation.isPending,
  };
};

export const useCampaignTestimonials = (campaignId: string | null) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['solidarity-testimonials', campaignId, user?.id],
    queryFn: async () => {
      if (!campaignId || !user?.id) return [];

      const { data, error } = await supabase
        .from('solidarity_campaign_testimonials')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const testimonials = (data || []) as unknown as SolidarityTestimonial[];
      if (testimonials.length === 0) {
        return testimonials;
      }

      const authorIds = [...new Set(testimonials.map((testimonial) => testimonial.user_id).filter(Boolean))];
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, avatar_url')
        .in('id', authorIds);

      if (profilesError) {
        console.warn('Impossible de charger les auteurs des témoignages:', profilesError.message);
        return testimonials;
      }

      const profileMap = new Map(
        ((profiles || []) as CreatorProfile[]).map((profile) => [
          profile.id,
          {
            first_name: profile.first_name,
            last_name: profile.last_name,
            avatar_url: profile.avatar_url,
          },
        ])
      );

      return testimonials.map((testimonial) => ({
        ...testimonial,
        author: profileMap.get(testimonial.user_id),
      }));
    },
    enabled: !!campaignId && !!user?.id,
  });
};

// Config des commissions
export const useSolidaritySettings = () => {
  return useQuery({
    queryKey: ['solidarity-commission-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('solidarity_commission_settings')
        .select('*')
        .single();
      if (error) throw error;
      return data as SolidarityCommissionSettings;
    },
  });
};

// Créer une campagne
export const useCreateCampaign = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (campaign: {
      title: string;
      description: string;
      goal_amount: number;
      deadline?: string;
      category?: string;
      beneficiary_name?: string;
      image_url?: string;
      commission_rate: number;
      galleryMedia?: Array<{ url: string; type: 'image' | 'video' }>;
    }) => {
      if (!user?.id) throw new Error('Non connecté');
      const { galleryMedia, ...campaignData } = campaign;
      const { data, error } = await supabase
        .from('solidarity_campaigns')
        .insert({
          ...campaignData,
          creator_id: user.id,
        })
        .select()
        .single();
      if (error) throw error;

      if (galleryMedia && galleryMedia.length > 0) {
        const mediaRows = galleryMedia.map((item, index) => ({
          campaign_id: (data as SolidarityCampaign).id,
          uploader_id: user.id,
          media_url: item.url,
          media_type: item.type,
          position: index,
        }));
        const { error: mediaError } = await supabase
          .from('solidarity_campaign_media')
          .insert(mediaRows);
        if (mediaError) {
          console.error('Erreur lors de l\'insertion des médias de la galerie:', mediaError);
          toast.error('La cagnotte a été créée mais certains médias de la galerie n\'ont pas pu être enregistrés.');
        }
      }

      try {
        await notifyAdminsForCampaign(data as SolidarityCampaign, user.id);
      } catch (notificationError) {
        console.error('Erreur notification admin cagnotte:', notificationError);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['solidarity-campaigns'] });
      toast.success('Cagnotte soumise pour validation !');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erreur lors de la création');
    },
  });
};

// Contribuer à une campagne (débite SC)
export const useContribute = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ campaignId, amount, message, isAnonymous, commissionRate }: {
      campaignId: string;
      amount: number;
      message?: string;
      isAnonymous?: boolean;
      commissionRate: number;
    }) => {
      if (!user?.id) throw new Error('Non connecté');
      const commissionAmount = Math.round(amount * commissionRate / 100);

      // Vérifier le solde SC
      const { data: wallet } = await supabase
        .from('user_wallets')
        .select('soumboulah_cash')
        .eq('user_id', user.id)
        .single();

      if (!wallet || wallet.soumboulah_cash < amount) {
        throw new Error('Solde SC insuffisant');
      }

      const { data: campaignDetails, error: campaignDetailsError } = await supabase
        .from('solidarity_campaigns')
        .select('id, title, collected_amount, goal_amount, status, creator_id')
        .eq('id', campaignId)
        .single();

      if (campaignDetailsError) throw campaignDetailsError;
      const canSelfContribute = campaignDetails.creator_id === user.id && campaignDetails.status === 'pending';
      if (campaignDetails.status !== 'approved' && !canSelfContribute) {
        throw new Error('Cette cagnotte n’accepte pas encore les contributions.');
      }

      const { data: contributionResult, error: contributionError } = await supabase.rpc(
        'contribute_to_solidarity_campaign',
        {
          p_campaign_id: campaignId,
          p_amount: amount,
          p_message: message || null,
          p_is_anonymous: isAnonymous || false,
          p_commission_rate: commissionAmount > 0 ? commissionRate : 0,
        }
      );
      if (contributionError) throw contributionError;

      const result = contributionResult as { success?: boolean; message?: string; new_collected_amount?: number } | null;
      if (!result?.success) {
        throw new Error(result?.message || 'Erreur lors de la contribution');
      }

      const contributorProfile = await fetchProfileDisplay(user.id);
      const contributorName = buildDisplayName(contributorProfile);

      if (campaignDetails.creator_id !== user.id) {
        try {
          await notifyCampaignOwner({
            ownerId: campaignDetails.creator_id,
            senderId: user.id,
            title: 'Nouvelle contribution à votre cagnotte',
            message: `${contributorName} a contribué à "${campaignDetails.title}".`,
            campaignId,
            campaignTitle: campaignDetails.title,
            type: 'solidarity_contribution',
          });
        } catch (notificationError) {
          console.error('Erreur notification contribution cagnotte:', notificationError);
        }
      }

      try {
        const goalReached = Number(result.new_collected_amount || 0) >= Number(campaignDetails.goal_amount || 0);
        await notifyCampaignFollowers({
          campaignId,
          campaignTitle: campaignDetails.title,
          senderId: user.id,
          title: goalReached
            ? 'Objectif atteint pour cette cagnotte'
            : 'Nouvelle évolution sur la cagnotte suivie',
          message: goalReached
            ? `${contributorName} vient d'atteindre l'objectif de "${campaignDetails.title}" avec une nouvelle contribution.`
            : `${contributorName} a contribué à la cagnotte "${campaignDetails.title}".`,
          type: goalReached ? 'solidarity_campaign' : 'solidarity_contribution',
          data: { actorName: contributorName },
          excludedUserIds: [user.id, campaignDetails.creator_id],
        });
      } catch (notificationError) {
        console.error('Erreur notification abonnés cagnotte:', notificationError);
      }

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['solidarity-campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['solidarity-campaign'] });
      queryClient.invalidateQueries({ queryKey: ['solidarity-contributions'] });
      queryClient.invalidateQueries({ queryKey: ['user-wallet'] });
      queryClient.invalidateQueries({ queryKey: ['wallet-transactions'] });
      toast.success('Contribution envoyée avec succès !');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erreur lors de la contribution');
    },
  });
};

export const useCampaignLike = (campaignId?: string | null, initialLikesCount = 0) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: isLiked = false } = useQuery({
    queryKey: ['solidarity-campaign-like', campaignId, user?.id],
    queryFn: async () => {
      if (!campaignId || !user?.id) return false;

      const { data, error } = await supabase
        .from('solidarity_campaign_likes')
        .select('id')
        .eq('campaign_id', campaignId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return !!data;
    },
    enabled: !!campaignId && !!user?.id,
  });

  const { data: likesCount = initialLikesCount } = useQuery({
    queryKey: ['solidarity-campaign-likes-count', campaignId],
    queryFn: async () => {
      if (!campaignId || !user?.id) return initialLikesCount;

      const { count, error } = await supabase
        .from('solidarity_campaign_likes')
        .select('*', { count: 'exact', head: true })
        .eq('campaign_id', campaignId);

      if (error) throw error;
      return count ?? initialLikesCount;
    },
    enabled: !!campaignId && !!user?.id,
  });

  const toggleLikeMutation = useMutation({
    mutationFn: async () => {
      if (!campaignId) throw new Error('Cagnotte introuvable');
      if (!user?.id) throw new Error('Connectez-vous pour aimer cette cagnotte');

      if (isLiked) {
        const { error } = await supabase
          .from('solidarity_campaign_likes')
          .delete()
          .eq('campaign_id', campaignId)
          .eq('user_id', user.id);

        if (error) throw error;
        return;
      }

      const { error } = await supabase
        .from('solidarity_campaign_likes')
        .insert({ campaign_id: campaignId, user_id: user.id });

      if (error) throw error;

      const [campaignResponse, likerProfile] = await Promise.all([
        supabase
          .from('solidarity_campaigns')
          .select('id, title, creator_id')
          .eq('id', campaignId)
          .single(),
        fetchProfileDisplay(user.id),
      ]);

      if (campaignResponse.error) throw campaignResponse.error;

      const likerName = buildDisplayName(likerProfile);

      await notifyCampaignInteraction({
        campaignId,
        campaignTitle: campaignResponse.data.title,
        actorId: user.id,
        actorName: likerName,
        ownerId: campaignResponse.data.creator_id,
        title: 'Nouveau j’aime sur votre cagnotte',
        message: `${likerName} a aimé votre cagnotte "${campaignResponse.data.title}".`,
        type: 'solidarity_like',
      });

      try {
        await notifyCampaignFollowers({
          campaignId,
          campaignTitle: campaignResponse.data.title,
          senderId: user.id,
          title: 'Nouvelle réaction sur la cagnotte suivie',
          message: `${likerName} a aimé la cagnotte "${campaignResponse.data.title}".`,
          type: 'solidarity_like',
          data: { actorName: likerName },
          excludedUserIds: [user.id, campaignResponse.data.creator_id],
        });
      } catch (notificationError) {
        console.error('Erreur notification abonnés après like:', notificationError);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['solidarity-campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['solidarity-campaign'] });
      queryClient.invalidateQueries({ queryKey: ['solidarity-campaign-like', campaignId, user?.id] });
      queryClient.invalidateQueries({ queryKey: ['solidarity-campaign-likes-count', campaignId] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Impossible de mettre à jour le like');
    },
  });

  return {
    isLiked,
    likesCount,
    toggleLike: toggleLikeMutation.mutate,
    isLoading: toggleLikeMutation.isPending,
  };
};

export const useAddCampaignTestimonial = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ campaignId, content }: { campaignId: string; content: string }) => {
      if (!user?.id) throw new Error('Connectez-vous pour publier un témoignage');

      const trimmedContent = content.trim();
      if (!trimmedContent) throw new Error('Le témoignage est vide');

      const { error } = await supabase
        .from('solidarity_campaign_testimonials')
        .insert({
          campaign_id: campaignId,
          user_id: user.id,
          content: trimmedContent,
        });

      if (error) throw error;

      const [campaignResponse, authorProfile] = await Promise.all([
        supabase
          .from('solidarity_campaigns')
          .select('id, title, creator_id')
          .eq('id', campaignId)
          .single(),
        fetchProfileDisplay(user.id),
      ]);

      if (campaignResponse.error) throw campaignResponse.error;

      const authorName = buildDisplayName(authorProfile);

      await notifyCampaignInteraction({
        campaignId,
        campaignTitle: campaignResponse.data.title,
        actorId: user.id,
        actorName: authorName,
        ownerId: campaignResponse.data.creator_id,
        title: 'Nouveau témoignage sur votre cagnotte',
        message: `${authorName} a publié un témoignage sur "${campaignResponse.data.title}".`,
        type: 'solidarity_testimonial',
      });

      try {
        await notifyCampaignFollowers({
          campaignId,
          campaignTitle: campaignResponse.data.title,
          senderId: user.id,
          title: 'Nouveau témoignage sur la cagnotte suivie',
          message: `${authorName} a publié un témoignage sur "${campaignResponse.data.title}".`,
          type: 'solidarity_testimonial',
          data: { actorName: authorName },
          excludedUserIds: [user.id, campaignResponse.data.creator_id],
        });
      } catch (notificationError) {
        console.error('Erreur notification abonnés après témoignage:', notificationError);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['solidarity-campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['solidarity-campaign'] });
      queryClient.invalidateQueries({ queryKey: ['solidarity-testimonials'] });
      toast.success('Témoignage publié');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Impossible de publier le témoignage');
    },
  });
};

export const useRecordCampaignShare = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ campaignId, channel }: { campaignId: string; channel?: string }) => {
      if (!campaignId || !user?.id) return;

      const { error } = await supabase
        .from('solidarity_campaign_shares')
        .insert({
          campaign_id: campaignId,
          user_id: user.id,
          channel: channel || 'native',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['solidarity-campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['solidarity-campaign'] });
    },
  });
};

// Admin : approuver / rejeter une campagne
export const useAdminCampaignAction = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ campaignId, action, rejectionReason, commissionRate }: {
      campaignId: string;
      action: 'approved' | 'rejected';
      rejectionReason?: string;
      commissionRate?: number;
    }) => {
      if (!user?.id) throw new Error('Non connecté');
      const { data: campaignDetails, error: campaignDetailsError } = await supabase
        .from('solidarity_campaigns')
        .select('id, title, creator_id')
        .eq('id', campaignId)
        .single();
      if (campaignDetailsError) throw campaignDetailsError;

      const updateData: any = {
        status: action,
        approved_by: user.id,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      if (action === 'rejected' && rejectionReason) {
        updateData.rejection_reason = rejectionReason;
      }
      if (action === 'approved' && commissionRate !== undefined) {
        updateData.commission_rate = commissionRate;
      }
      const { error } = await supabase
        .from('solidarity_campaigns')
        .update(updateData)
        .eq('id', campaignId);
      if (error) throw error;

      try {
        await notifyCampaignOwner({
          ownerId: campaignDetails.creator_id,
          senderId: user.id,
          title: action === 'approved' ? 'Votre cagnotte a été approuvée' : 'Votre cagnotte a été rejetée',
          message:
            action === 'approved'
              ? `La cagnotte "${campaignDetails.title}" est maintenant visible et peut recevoir des contributions.`
              : `La cagnotte "${campaignDetails.title}" a été rejetée.${rejectionReason ? ` Motif: ${rejectionReason}` : ''}`,
          campaignId,
          campaignTitle: campaignDetails.title,
          type: 'solidarity_campaign',
        });
      } catch (notificationError) {
        console.error('Erreur notification décision admin cagnotte:', notificationError);
      }
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['solidarity-campaigns'] });
      toast.success(vars.action === 'approved' ? 'Cagnotte approuvée !' : 'Cagnotte rejetée');
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
};

// ─── Galerie de médias ────────────────────────────────────────────────────────

export interface SolidarityCampaignMedia {
  id: string;
  campaign_id: string;
  uploader_id: string;
  media_url: string;
  media_type: 'image' | 'video';
  caption: string | null;
  position: number;
  created_at: string;
}

export const useCampaignGallery = (campaignId: string | null) => {
  return useQuery({
    queryKey: ['solidarity-campaign-media', campaignId],
    queryFn: async () => {
      if (!campaignId) return [];
      const { data, error } = await supabase
        .from('solidarity_campaign_media')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('position', { ascending: true })
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as SolidarityCampaignMedia[];
    },
    enabled: !!campaignId,
  });
};

export const useAddCampaignMedia = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      campaignId,
      mediaUrl,
      mediaType,
      caption,
      position,
    }: {
      campaignId: string;
      mediaUrl: string;
      mediaType: 'image' | 'video';
      caption?: string;
      position?: number;
    }) => {
      if (!user?.id) throw new Error('Non connecté');
      const [campaignResponse, uploaderProfile] = await Promise.all([
        supabase
          .from('solidarity_campaigns')
          .select('id, title, creator_id')
          .eq('id', campaignId)
          .single(),
        fetchProfileDisplay(user.id),
      ]);

      if (campaignResponse.error) throw campaignResponse.error;

      const { error } = await supabase
        .from('solidarity_campaign_media')
        .insert({
          campaign_id: campaignId,
          uploader_id: user.id,
          media_url: mediaUrl,
          media_type: mediaType,
          caption: caption || null,
          position: position ?? 0,
        });
      if (error) throw error;

      const uploaderName = buildDisplayName(uploaderProfile);

      try {
        await notifyCampaignFollowers({
          campaignId,
          campaignTitle: campaignResponse.data.title,
          senderId: user.id,
          title: 'Nouveau contenu sur la cagnotte suivie',
          message: `${uploaderName} a ajouté ${mediaType === 'video' ? 'une vidéo' : 'une image'} à la cagnotte "${campaignResponse.data.title}".`,
          type: 'solidarity_campaign',
          data: { actorName: uploaderName, mediaType },
          excludedUserIds: [user.id, campaignResponse.data.creator_id],
        });
      } catch (notificationError) {
        console.error('Erreur notification abonnés après ajout de média:', notificationError);
      }
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['solidarity-campaign-media', vars.campaignId] });
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erreur lors de l\'ajout du média');
    },
  });
};

export const useDeleteCampaignMedia = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ mediaId, campaignId }: { mediaId: string; campaignId: string }) => {
      if (!user?.id) throw new Error('Non connecté');
      const { error } = await supabase
        .from('solidarity_campaign_media')
        .delete()
        .eq('id', mediaId)
        .eq('uploader_id', user.id);
      if (error) throw error;
      return campaignId;
    },
    onSuccess: (campaignId) => {
      queryClient.invalidateQueries({ queryKey: ['solidarity-campaign-media', campaignId] });
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erreur lors de la suppression du média');
    },
  });
};

// Admin : mettre à jour la config des commissions
export const useUpdateSolidaritySettings = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: Partial<SolidarityCommissionSettings>) => {
      if (!user?.id) throw new Error('Non connecté');
      const { error } = await supabase
        .from('solidarity_commission_settings')
        .update({ ...settings, updated_by: user.id, updated_at: new Date().toISOString() })
        .not('id', 'is', null);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['solidarity-commission-settings'] });
      toast.success('Paramètres mis à jour');
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
};
