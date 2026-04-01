import React, { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Bell, BellOff, Clock, HandCoins, Heart, Images, MessageSquareText, Share2, Target, Users, X } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { generateShareLinks } from '@/hooks/useDeeplinks';
import coinSC from '@/assets/coin-soumboulah-cash.png';

import { buildSolidarityCampaignPath } from './campaignRoutes';
import CampaignGalleryUploader, { isVideoUrl } from './components/CampaignGalleryUploader';
import {
  SolidarityContribution,
  useAddCampaignTestimonial,
  useCampaignContributions,
  useCampaignGallery,
  useCampaignLike,
  useCampaignNotificationSubscription,
  useCampaignTestimonials,
  useContribute,
  useDeleteCampaignMedia,
  useRecordCampaignShare,
  useSolidarityCampaign,
} from './hooks/useSolidarityCampaigns';

const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(n);

type ContributorSummary = {
  contributorId: string;
  amount: number;
  contributionCount: number;
  latestAt: string;
  isFullyAnonymous: boolean;
  contributor?: SolidarityContribution['contributor'];
};

const buildContributorSummaries = (contributions: SolidarityContribution[]) => {
  const summaries = new Map<string, ContributorSummary>();

  contributions.forEach((contribution) => {
    const existing = summaries.get(contribution.contributor_id);

    if (!existing) {
      summaries.set(contribution.contributor_id, {
        contributorId: contribution.contributor_id,
        amount: contribution.amount,
        contributionCount: 1,
        latestAt: contribution.created_at,
        isFullyAnonymous: !!contribution.is_anonymous,
        contributor: contribution.is_anonymous ? undefined : contribution.contributor,
      });
      return;
    }

    existing.amount += contribution.amount;
    existing.contributionCount += 1;
    if (new Date(contribution.created_at).getTime() > new Date(existing.latestAt).getTime()) {
      existing.latestAt = contribution.created_at;
    }
    existing.isFullyAnonymous = existing.isFullyAnonymous && !!contribution.is_anonymous;
    if (!contribution.is_anonymous && contribution.contributor) {
      existing.contributor = contribution.contributor;
    }
  });

  return [...summaries.values()].sort(
    (left, right) => new Date(right.latestAt).getTime() - new Date(left.latestAt).getTime()
  );
};

const SolidarityCampaignPage: React.FC = () => {
  const navigate = useNavigate();
  const { campaignId } = useParams<{ campaignId: string }>();
  const { user, profile } = useAuth();
  const { data: campaign, isLoading } = useSolidarityCampaign(campaignId);
  const { data: contributions = [] } = useCampaignContributions(campaign?.id || null);
  const { data: testimonials = [] } = useCampaignTestimonials(campaign?.id || null);
  const { data: galleryMedia = [] } = useCampaignGallery(campaign?.id || null);
  const { mutate: contribute, isPending: contributionPending } = useContribute();
  const { mutate: addTestimonial, isPending: testimonialPending } = useAddCampaignTestimonial();
  const { mutate: recordShare } = useRecordCampaignShare();
  const { mutate: deleteMedia } = useDeleteCampaignMedia();
  const { isLiked, likesCount, toggleLike, isLoading: likePending } = useCampaignLike(
    campaign?.id,
    campaign?.likes_count || 0
  );
  const { isSubscribed, subscribe, unsubscribe, isLoading: notifLoading } = useCampaignNotificationSubscription(campaign?.id);

  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [testimonial, setTestimonial] = useState('');
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [isContributionsModalOpen, setIsContributionsModalOpen] = useState(false);

  const progress = campaign?.goal_amount
    ? Math.min(100, Math.round((campaign.collected_amount / campaign.goal_amount) * 100))
    : 0;
  const remainingAmount = campaign
    ? Math.max(0, campaign.goal_amount - campaign.collected_amount)
    : 0;
  const contributionCount = campaign?.contributor_count || 0;
  const numericAmount = Number(amount) || 0;
  const userContributions = user?.id
    ? contributions.filter((contribution) => contribution.contributor_id === user.id)
    : [];
  const isOwnCampaign = !!campaign && user?.id === campaign.creator_id;
  const canContribute = !!campaign && (campaign.status === 'approved' || (isOwnCampaign && campaign.status === 'pending'));
  const canViewContributors = !!campaign && !!user?.id && (
    isOwnCampaign ||
    profile?.role === 'admin' ||
    userContributions.length > 0
  );

  const contributorSummaries = useMemo(
    () => buildContributorSummaries(contributions),
    [contributions]
  );

  const campaignPath = campaign
    ? buildSolidarityCampaignPath(campaign.id, campaign.title)
    : '/solidarity';

  const suggestedAmounts = useMemo(() => {
    const candidates = [100, 250, 500, 1000];

    if (!remainingAmount) {
      return candidates;
    }

    return [...new Set([...candidates.filter((candidate) => candidate < remainingAmount), remainingAmount])]
      .filter((candidate) => candidate > 0)
      .slice(0, 4);
  }, [remainingAmount]);

  const handleContribute = () => {
    if (!campaign) return;

    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0) return;

    contribute({
      campaignId: campaign.id,
      amount: numericAmount,
      message: message.trim() || undefined,
      isAnonymous,
      commissionRate: campaign.commission_rate,
    });

    setAmount('');
    setMessage('');
    setIsAnonymous(false);
  };

  const handleSubmitTestimonial = () => {
    if (!campaign) return;

    addTestimonial(
      { campaignId: campaign.id, content: testimonial },
      {
        onSuccess: () => setTestimonial(''),
      }
    );
  };

  const handleShare = async () => {
    if (!campaign) return;

    const { webUrl, appUrl } = generateShareLinks(campaignPath);
    const shareText = campaign.description || `Découvrez la cagnotte ${campaign.title}`;
    const fallbackText = `${shareText}\n\nLien web: ${webUrl}\nLien app: ${appUrl}`;
    let recorded = false;
    let channel = 'copy';

    try {
      if (navigator.share) {
        await navigator.share({
          title: campaign.title,
          text: fallbackText,
          url: webUrl,
        });
        channel = 'native';
      } else {
        await navigator.clipboard.writeText(fallbackText);
      }

      toast.success('Lien de la cagnotte prêt à être partagé avec fallback app');
      recorded = true;
    } catch (error) {
      if (!navigator.share) {
        toast.error('Impossible de copier le lien de la cagnotte');
      }
    }

    if (recorded) {
      recordShare({ campaignId: campaign.id, channel });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background px-4 py-20 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen bg-background px-4 py-20">
        <Button variant="ghost" onClick={() => navigate('/solidarity')} className="mb-4">
          <ArrowLeft size={18} className="mr-2" /> Retour aux cagnottes
        </Button>
        <Card>
          <CardContent className="p-6 text-center space-y-2">
            <p className="font-semibold">Cagnotte introuvable</p>
            <p className="text-sm text-muted-foreground">
              Le lien est invalide ou la cagnotte n’est pas visible avec votre compte.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="relative bg-[linear-gradient(160deg,_rgb(15,23,42)_0%,_rgb(30,41,59)_55%,_rgb(51,65,85)_100%)] px-4 pt-12 pb-8 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(244,63,94,0.18),_transparent_60%)]" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-rose-500/40 to-transparent" />
        <div className="flex items-center justify-between mb-5">
          <button onClick={() => navigate('/solidarity')} className="relative p-1 text-white/60 hover:text-white transition-colors">
            <ArrowLeft size={22} />
          </button>
          {user?.id && (
            <button
              onClick={() => isSubscribed ? unsubscribe() : subscribe()}
              disabled={notifLoading}
              className={`relative p-2 rounded-full transition-colors ${isSubscribed ? 'bg-rose-500/20 text-rose-400' : 'bg-white/10 text-white/60 hover:text-white'}`}
              title={isSubscribed ? 'Désactiver les notifications' : 'Activer les notifications'}
            >
              {isSubscribed ? <BellOff size={20} /> : <Bell size={20} />}
            </button>
          )}
        </div>

        <div className="relative space-y-4">
          <div className="h-52 rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
            {campaign.image_url ? (
              <img src={campaign.image_url} alt={campaign.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center">
                <Images size={40} className="text-white/20" />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold leading-tight text-white tracking-tight">{campaign.title}</h1>
            <p className="text-slate-300 text-sm whitespace-pre-wrap leading-relaxed">{campaign.description}</p>
            {campaign.creator && (
              <div className="flex items-center gap-2 pt-1">
                <Avatar className="w-7 h-7 border border-white/20 ring-1 ring-rose-500/30">
                  <AvatarImage src={campaign.creator.avatar_url || ''} />
                  <AvatarFallback className="bg-slate-700 text-white/80 text-xs">
                    {campaign.creator.first_name?.[0]}{campaign.creator.last_name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm text-slate-400">
                  par <span className="text-white/80 font-medium">{campaign.creator.first_name} {campaign.creator.last_name}</span>
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 -mt-5 space-y-4">
        {canContribute && (
          <Card className="overflow-hidden border-none shadow-[0_24px_80px_-28px_rgba(244,63,94,0.65)]">
            <CardContent className="p-0">
              <div className="bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.24),_transparent_32%),linear-gradient(135deg,_rgb(225,29,72),_rgb(236,72,153)_54%,_rgb(249,115,22))] p-5 text-white">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/90">
                      <HandCoins size={14} /> Soutien prioritaire
                    </div>
                    <div>
                      <h2 className="text-xl font-black leading-tight sm:text-2xl">
                        Contribuer maintenant
                      </h2>
                      <p className="mt-1 max-w-xl text-sm text-white/85">
                        Chaque contribution rapproche cette cagnotte de son objectif.
                      </p>
                    </div>
                  </div>

                  <div className="w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-left backdrop-blur-sm sm:w-auto sm:min-w-[190px] sm:text-right">
                    <div className="text-[11px] uppercase tracking-[0.2em] text-white/75">Reste à réunir</div>
                    <div className="mt-1 flex items-center gap-1 text-lg font-black sm:justify-end">
                      <img src={coinSC} alt="SC" className="h-5 w-5" />
                      {fmt(remainingAmount)} SC
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-2">
                  <div className="rounded-2xl border border-white/15 bg-white/10 px-3 py-3 backdrop-blur-sm">
                    <div className="text-[11px] uppercase tracking-[0.16em] text-white/70">Collecté</div>
                    <div className="mt-1 flex items-center gap-1 text-base font-bold">
                      <img src={coinSC} alt="SC" className="h-4 w-4" />
                      {fmt(campaign.collected_amount)}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/15 bg-white/10 px-3 py-3 backdrop-blur-sm">
                    <div className="text-[11px] uppercase tracking-[0.16em] text-white/70">Objectif</div>
                    <div className="mt-1 flex items-center gap-1 text-base font-bold">
                      <Target size={14} /> {progress}%
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/15 bg-white/10 px-3 py-3 backdrop-blur-sm">
                    <div className="text-[11px] uppercase tracking-[0.16em] text-white/70">Soutiens</div>
                    <div className="mt-1 flex items-center gap-1 text-base font-bold">
                      <Users size={14} /> {fmt(contributionCount)}
                    </div>
                  </div>
                </div>

                <div className="mt-5 space-y-4 rounded-[28px] border border-white/20 bg-white p-4 text-slate-900 shadow-2xl sm:p-5">
                  <div className="grid gap-3 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
                    <div className="space-y-3">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                        <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Montant en SC
                        </label>
                        <div className="flex items-center gap-3">
                          <img src={coinSC} alt="SC" className="h-6 w-6" />
                          <Input
                            type="number"
                            min={1}
                            value={amount}
                            onChange={(event) => setAmount(event.target.value)}
                            placeholder="Saisissez le montant a donner"
                            className="h-12 rounded-xl border border-slate-300 bg-white px-4 text-xl font-black text-slate-950 shadow-none placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-rose-300"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold">Choisissez un montant rapide</p>
                          
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {suggestedAmounts.map((suggestedAmount) => (
                            <button
                              key={suggestedAmount}
                              type="button"
                              onClick={() => setAmount(String(suggestedAmount))}
                              className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm font-semibold transition-all ${numericAmount === suggestedAmount ? 'border-rose-500 bg-rose-500 text-white shadow-sm' : 'border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300 hover:bg-rose-100'}`}
                            >
                              <img src={coinSC} alt="SC" className="h-4 w-4" />
                              {fmt(suggestedAmount)} SC
                            </button>
                          ))}
                        </div>
                      </div>

                      <Input
                        value={message}
                        onChange={(event) => setMessage(event.target.value)}
                        placeholder="Ajoutez un mot de soutien (optionnel)"
                        className="h-12 rounded-2xl border-slate-200"
                      />

                      <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600 cursor-pointer">
                        <input type="checkbox" checked={isAnonymous} onChange={(event) => setIsAnonymous(event.target.checked)} />
                        Rendre ma contribution anonyme
                      </label>
                    </div>

                    <div className="rounded-3xl bg-slate-950 p-4 text-white">
                      <div className="text-[11px] uppercase tracking-[0.2em] text-white/55">Impact immédiat</div>
                      <div className="mt-3 space-y-3">
                        <div>
                          <div className="text-sm text-white/70">Votre don</div>
                          <div className="mt-1 flex items-center gap-1 text-2xl font-black">
                            <img src={coinSC} alt="SC" className="h-5 w-5" />
                            {fmt(numericAmount)} SC
                          </div>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-amber-300 via-rose-400 to-pink-400 transition-all"
                            style={{ width: `${Math.min(100, progress + (campaign.goal_amount ? (numericAmount / campaign.goal_amount) * 100 : 0))}%` }}
                          />
                        </div>
                        <p className="text-sm text-white/75">
                          Après votre soutien, la cagnotte peut atteindre jusqu’à <span className="font-semibold text-white">{Math.min(100, Math.round(progress + (campaign.goal_amount ? (numericAmount / campaign.goal_amount) * 100 : 0)))}%</span> de son objectif.
                        </p>
                        <Button
                          onClick={handleContribute}
                          disabled={contributionPending || !amount || Number(amount) <= 0}
                          className="h-12 w-full rounded-2xl bg-white text-rose-600 hover:bg-white/90 font-bold"
                        >
                          {contributionPending ? 'Envoi...' : `Soutenir avec ${amount ? `${fmt(Number(amount))} SC` : 'un don'}`}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {isOwnCampaign && campaign.status === 'pending' && (
                    <p className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-700">
                      Vous pouvez contribuer à votre propre cagnotte avant validation. Elle restera privée tant qu’elle n’est pas approuvée.
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-none shadow-lg">
          <CardContent className="p-4 space-y-4">
            <div className="space-y-2">
              <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-rose-500 to-pink-500 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1 font-semibold text-foreground">
                  <img src={coinSC} alt="SC" className="w-5 h-5" />
                  {fmt(campaign.collected_amount)} SC
                </div>
                <span className="text-muted-foreground">sur {fmt(campaign.goal_amount)} SC</span>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 text-center">
              <button
                type="button"
                onClick={() => toggleLike()}
                disabled={likePending}
                className={`rounded-xl px-3 py-3 transition-colors ${isLiked ? 'bg-rose-500 text-white' : 'bg-muted text-muted-foreground'}`}
              >
                <Heart size={18} className="mx-auto mb-1" fill={isLiked ? 'currentColor' : 'none'} />
                <div className="text-xs font-medium">{fmt(likesCount)}</div>
                <div className="text-[10px] uppercase tracking-wide">J’aime</div>
              </button>
              <button
                type="button"
                onClick={() => setIsContributionsModalOpen(true)}
                className="rounded-xl bg-muted px-3 py-3 text-muted-foreground transition-colors hover:bg-muted/80"
              >
                <Users size={18} className="mx-auto mb-1" />
                <div className="text-xs font-medium text-foreground">{fmt(contributionCount)}</div>
                <div className="text-[10px] uppercase tracking-wide">Contrib.</div>
              </button>
              <div className="rounded-xl bg-muted px-3 py-3 text-muted-foreground">
                <MessageSquareText size={18} className="mx-auto mb-1" />
                <div className="text-xs font-medium text-foreground">{fmt(campaign.testimonials_count || 0)}</div>
                <div className="text-[10px] uppercase tracking-wide">Témoins</div>
              </div>
              <button
                type="button"
                onClick={handleShare}
                className="rounded-xl bg-muted px-3 py-3 text-muted-foreground hover:bg-muted/80 transition-colors"
              >
                <Share2 size={18} className="mx-auto mb-1" />
                <div className="text-xs font-medium text-foreground">{fmt(campaign.shares_count || 0)}</div>
                <div className="text-[10px] uppercase tracking-wide">Partages</div>
              </button>
            </div>

            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              {campaign.deadline && (
                <span className="flex items-center gap-1">
                  <Clock size={14} /> Jusqu’au {format(new Date(campaign.deadline), 'dd MMM yyyy', { locale: fr })}
                </span>
              )}
              {campaign.beneficiary_name && (
                <span>Bénéficiaire : {campaign.beneficiary_name}</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold text-sm flex items-center gap-1.5">
                  <Images size={15} className="text-rose-500" />
                  Galerie
                </h2>
                <p className="text-xs text-muted-foreground">
                  Photos et vidéos de présentation et de suivi.
                </p>
              </div>
            </div>

            {galleryMedia.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {galleryMedia.map((item) => (
                  <div
                    key={item.id}
                    className="relative aspect-square rounded-lg overflow-hidden border border-border bg-muted cursor-pointer group"
                    onClick={() => setLightboxUrl(item.media_url)}
                  >
                    {item.media_type === 'video' ? (
                      <video
                        src={item.media_url}
                        className="w-full h-full object-cover"
                        muted
                        preload="metadata"
                      />
                    ) : (
                      <img
                        src={item.media_url}
                        alt={item.caption || `Média ${item.position + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    )}
                    {isOwnCampaign && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteMedia({ mediaId: item.id, campaignId: campaign.id });
                        }}
                        className="absolute top-1 right-1 rounded-full bg-black/60 p-0.5 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Aucun média dans la galerie pour le moment.</p>
            )}

            {isOwnCampaign && (
              <CampaignGalleryUploader campaignId={campaign.id} existingCount={galleryMedia.length} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold text-sm">Témoignages</h2>
                <p className="text-xs text-muted-foreground">
                  Les soutiens et retours visibles sur cette cagnotte.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={handleShare}>
                <Share2 size={14} className="mr-2" /> Partager
              </Button>
            </div>

            <div className="space-y-3">
              <Textarea
                value={testimonial}
                onChange={(event) => setTestimonial(event.target.value)}
                placeholder="Laissez un témoignage ou un mot de soutien"
                className="min-h-[96px]"
                disabled={!user?.id}
              />
              <Button
                onClick={handleSubmitTestimonial}
                disabled={testimonialPending || !testimonial.trim() || !user?.id}
                className="bg-slate-900 hover:bg-slate-800 text-white"
              >
                {testimonialPending ? 'Publication...' : 'Publier mon témoignage'}
              </Button>
              {!user?.id && (
                <p className="text-xs text-muted-foreground">
                  Connectez-vous pour publier un témoignage ou aimer cette cagnotte.
                </p>
              )}
            </div>

            {testimonials.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun témoignage pour le moment.</p>
            ) : (
              <div className="space-y-3">
                {testimonials.map((entry) => (
                  <div key={entry.id} className="rounded-xl border border-border/60 p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={entry.author?.avatar_url || ''} />
                        <AvatarFallback>
                          {entry.author?.first_name?.[0]}{entry.author?.last_name?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-medium leading-none">
                          {entry.author?.first_name} {entry.author?.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(entry.created_at), 'dd MMM yyyy, HH:mm', { locale: fr })}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-foreground/90 whitespace-pre-wrap">{entry.content}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-4">
            <div>
              <h2 className="font-semibold text-sm">Contributeurs</h2>
              <p className="text-xs text-muted-foreground">
                Le nombre de contributeurs est public, mais la liste détaillée reste réservée aux contributeurs, au créateur et aux admins.
              </p>
            </div>

            {canViewContributors ? (
              contributorSummaries.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun contributeur affichable pour le moment.</p>
              ) : (
                <div className="space-y-3">
                  {contributorSummaries.map((entry) => (
                    <div key={entry.contributorId} className="rounded-xl border border-border/60 p-3 flex items-center gap-3">
                      {entry.isFullyAnonymous ? (
                        <Avatar className="w-10 h-10">
                          <AvatarFallback>?</AvatarFallback>
                        </Avatar>
                      ) : (
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={entry.contributor?.avatar_url || ''} />
                          <AvatarFallback>
                            {entry.contributor?.first_name?.[0]}{entry.contributor?.last_name?.[0]}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">
                          {entry.isFullyAnonymous
                            ? 'Contributeur anonyme'
                            : `${entry.contributor?.first_name} ${entry.contributor?.last_name}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {entry.contributionCount} contribution(s) • Dernier soutien le {format(new Date(entry.latestAt), 'dd MMM yyyy', { locale: fr })}
                        </p>
                      </div>
                      <div className="text-sm font-semibold flex items-center gap-1">
                        <img src={coinSC} alt="SC" className="w-4 h-4" />
                        {fmt(entry.amount)}
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              <div className="rounded-xl bg-muted/50 p-3 text-sm text-muted-foreground">
                Contribuez à cette cagnotte pour débloquer la liste détaillée des contributeurs.
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={!!lightboxUrl} onOpenChange={(open) => { if (!open) setLightboxUrl(null); }}>
          <DialogContent className="max-w-3xl border-none bg-black/95 p-2 flex items-center justify-center">
            <DialogTitle className="sr-only">Aperçu du média</DialogTitle>
            {lightboxUrl && (
              isVideoUrl(lightboxUrl) ? (
                <video
                  src={lightboxUrl}
                  controls
                  autoPlay
                  className="max-h-[80vh] max-w-full rounded-lg"
                />
              ) : (
                <img
                  src={lightboxUrl}
                  alt="Aperçu"
                  className="max-h-[80vh] max-w-full rounded-lg object-contain"
                />
              )
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={isContributionsModalOpen} onOpenChange={setIsContributionsModalOpen}>
          <DialogContent className="w-[calc(100vw-1rem)] max-w-3xl overflow-hidden border-none p-0 shadow-[0_32px_100px_-40px_rgba(15,23,42,0.65)] sm:w-full sm:max-h-[88vh]">
            <DialogHeader className="border-b bg-[linear-gradient(135deg,_rgb(15,23,42),_rgb(30,41,59)_55%,_rgb(225,29,72))] px-5 py-5 text-left text-white sm:px-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-2">
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/80">
                    <Users size={13} /> Espace contributeurs
                  </div>
                  <div>
                    <DialogTitle className="text-xl font-black leading-tight text-white sm:text-2xl">
                      Contributeurs et historique
                    </DialogTitle>
                    <DialogDescription className="mt-1 max-w-2xl text-sm text-white/75">
                      {canViewContributors
                        ? `Consultez les soutiens recus pour ${campaign.title}.`
                        : 'Contribuez a cette cagnotte pour debloquer la liste detaillee des contributeurs et l historique des contributions.'}
                    </DialogDescription>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 sm:min-w-[280px]">
                  <div className="rounded-2xl border border-white/10 bg-white/10 px-3 py-3 backdrop-blur-sm">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-white/60">Contrib.</div>
                    <div className="mt-1 text-lg font-black text-white">{fmt(contributionCount)}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/10 px-3 py-3 backdrop-blur-sm">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-white/60">Collecte</div>
                    <div className="mt-1 flex items-center gap-1 text-lg font-black text-white">
                      <img src={coinSC} alt="SC" className="h-4 w-4" />
                      {fmt(campaign.collected_amount)}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/10 px-3 py-3 backdrop-blur-sm">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-white/60">Objectif</div>
                    <div className="mt-1 text-lg font-black text-white">{progress}%</div>
                  </div>
                </div>
              </div>
            </DialogHeader>

            <ScrollArea className="h-[72vh] sm:h-auto sm:max-h-[calc(88vh-150px)]">
              <div className="space-y-6 px-4 py-4 sm:px-6 sm:py-5">
                {canViewContributors ? (
                  contributions.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-border bg-muted/40 p-5 text-sm text-muted-foreground">
                      Aucune contribution detaillee a afficher pour le moment.
                    </div>
                  ) : (
                    <>
                      <section className="space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <h3 className="text-sm font-bold text-foreground">Principaux contributeurs</h3>
                            <p className="text-xs text-muted-foreground">Vue consolidee par personne avec total cumule.</p>
                          </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          {contributorSummaries.map((entry) => (
                            <div key={entry.contributorId} className="rounded-3xl border border-border/60 bg-card p-4 shadow-sm">
                              <div className="flex items-center gap-3">
                                {entry.isFullyAnonymous ? (
                                  <Avatar className="h-11 w-11 ring-2 ring-rose-100">
                                    <AvatarFallback>?</AvatarFallback>
                                  </Avatar>
                                ) : (
                                  <Avatar className="h-11 w-11 ring-2 ring-rose-100">
                                    <AvatarImage src={entry.contributor?.avatar_url || ''} />
                                    <AvatarFallback>
                                      {entry.contributor?.first_name?.[0]}{entry.contributor?.last_name?.[0]}
                                    </AvatarFallback>
                                  </Avatar>
                                )}

                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-semibold text-foreground">
                                    {entry.isFullyAnonymous
                                      ? 'Contributeur anonyme'
                                      : `${entry.contributor?.first_name} ${entry.contributor?.last_name}`}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {entry.contributionCount} contribution(s) • Dernier soutien le {format(new Date(entry.latestAt), 'dd MMM yyyy', { locale: fr })}
                                  </p>
                                </div>

                                <div className="rounded-2xl bg-rose-50 px-3 py-2 text-right text-rose-700">
                                  <div className="text-[10px] uppercase tracking-[0.16em]">Total</div>
                                  <div className="mt-1 flex items-center gap-1 text-sm font-bold">
                                    <img src={coinSC} alt="SC" className="h-4 w-4" />
                                    {fmt(entry.amount)}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>

                      <section className="space-y-3">
                        <div>
                          <h3 className="text-sm font-bold text-foreground">Historique detaille</h3>
                          <p className="text-xs text-muted-foreground">Chronologie des dons et messages de soutien.</p>
                        </div>

                        <div className="space-y-3">
                          {contributions.map((contribution) => (
                            <div key={contribution.id} className="rounded-3xl border border-border/60 bg-card p-4 shadow-sm">
                              <div className="flex items-start gap-3">
                                {contribution.is_anonymous ? (
                                  <Avatar className="h-10 w-10 ring-2 ring-slate-100">
                                    <AvatarFallback>?</AvatarFallback>
                                  </Avatar>
                                ) : (
                                  <Avatar className="h-10 w-10 ring-2 ring-slate-100">
                                    <AvatarImage src={contribution.contributor?.avatar_url || ''} />
                                    <AvatarFallback>
                                      {contribution.contributor?.first_name?.[0]}{contribution.contributor?.last_name?.[0]}
                                    </AvatarFallback>
                                  </Avatar>
                                )}

                                <div className="min-w-0 flex-1 space-y-2">
                                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-semibold text-foreground">
                                        {contribution.is_anonymous
                                          ? 'Anonyme'
                                          : `${contribution.contributor?.first_name} ${contribution.contributor?.last_name}`}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {format(new Date(contribution.created_at), 'dd MMM yyyy, HH:mm', { locale: fr })}
                                      </p>
                                    </div>

                                    <div className="inline-flex w-fit items-center gap-1 rounded-full bg-slate-950 px-3 py-1.5 text-sm font-semibold text-white">
                                      <img src={coinSC} alt="SC" className="h-4 w-4" />
                                      {fmt(contribution.amount)} SC
                                    </div>
                                  </div>

                                  {contribution.message && (
                                    <div className="rounded-2xl bg-muted/50 px-3 py-3 text-sm text-foreground/80">
                                      {contribution.message}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>
                    </>
                  )
                ) : (
                  <div className="rounded-3xl border border-dashed border-border bg-muted/40 p-5 text-sm text-muted-foreground">
                    Contribuez a cette cagnotte pour debloquer la liste detaillee des contributeurs et l historique complet des soutiens.
                  </div>
                )}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default SolidarityCampaignPage;