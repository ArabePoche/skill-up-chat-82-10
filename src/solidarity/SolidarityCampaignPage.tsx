import React, { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Clock, Heart, MessageSquareText, Share2, Users } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { generateShareLinks } from '@/hooks/useDeeplinks';
import coinSC from '@/assets/coin-soumboulah-cash.png';

import { buildSolidarityCampaignPath } from './campaignRoutes';
import {
  SolidarityContribution,
  useAddCampaignTestimonial,
  useCampaignContributions,
  useCampaignLike,
  useCampaignTestimonials,
  useContribute,
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
  const { mutate: contribute, isPending: contributionPending } = useContribute();
  const { mutate: addTestimonial, isPending: testimonialPending } = useAddCampaignTestimonial();
  const { mutate: recordShare } = useRecordCampaignShare();
  const { isLiked, likesCount, toggleLike, isLoading: likePending } = useCampaignLike(
    campaign?.id,
    campaign?.likes_count || 0
  );

  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [testimonial, setTestimonial] = useState('');

  const progress = campaign?.goal_amount
    ? Math.min(100, Math.round((campaign.collected_amount / campaign.goal_amount) * 100))
    : 0;
  const contributionCount = campaign?.contributor_count || 0;
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
      <div className="bg-gradient-to-r from-rose-500 via-pink-500 to-purple-500 px-4 pt-12 pb-6">
        <button onClick={() => navigate('/solidarity')} className="p-1 text-white/80 hover:text-white mb-4">
          <ArrowLeft size={24} />
        </button>

        <div className="space-y-3">
          <div className="h-52 rounded-2xl bg-white/10 overflow-hidden border border-white/15">
            {campaign.image_url ? (
              <img src={campaign.image_url} alt={campaign.title} className="w-full h-full object-cover" />
            ) : null}
          </div>

          <div className="space-y-2 text-white">
            <h1 className="text-2xl font-bold leading-tight">{campaign.title}</h1>
            <p className="text-white/80 text-sm whitespace-pre-wrap">{campaign.description}</p>
            {campaign.creator && (
              <div className="flex items-center gap-2 text-sm text-white/80">
                <Avatar className="w-7 h-7 border border-white/30">
                  <AvatarImage src={campaign.creator.avatar_url || ''} />
                  <AvatarFallback>
                    {campaign.creator.first_name?.[0]}{campaign.creator.last_name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <span>{campaign.creator.first_name} {campaign.creator.last_name}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 -mt-5 space-y-4">
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
              <div className="rounded-xl bg-muted px-3 py-3 text-muted-foreground">
                <Users size={18} className="mx-auto mb-1" />
                <div className="text-xs font-medium text-foreground">{fmt(contributionCount)}</div>
                <div className="text-[10px] uppercase tracking-wide">Contrib.</div>
              </div>
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

        {canContribute && (
          <Card>
            <CardContent className="p-4 space-y-3">
              <h2 className="font-semibold text-sm flex items-center gap-2">
                <Heart size={16} className="text-rose-500" /> Contribuer à cette cagnotte
              </h2>

              <div className="flex items-center gap-2">
                <img src={coinSC} alt="SC" className="w-5 h-5" />
                <Input
                  type="number"
                  min={1}
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="Montant en SC"
                />
              </div>

              <Input
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Message d’encouragement (optionnel)"
              />

              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                <input type="checkbox" checked={isAnonymous} onChange={(event) => setIsAnonymous(event.target.checked)} />
                Contribution anonyme
              </label>

              <p className="text-xs text-muted-foreground">
                Commission plateforme : {campaign.commission_rate}%
              </p>

              {isOwnCampaign && campaign.status === 'pending' && (
                <p className="text-xs text-amber-600">
                  Vous pouvez contribuer à votre propre cagnotte avant validation. Elle restera privée tant qu’elle n’est pas approuvée.
                </p>
              )}

              <Button
                onClick={handleContribute}
                disabled={contributionPending || !amount || Number(amount) <= 0}
                className="w-full bg-rose-500 hover:bg-rose-600 text-white"
              >
                {contributionPending ? 'Envoi...' : `Donner ${amount ? `${fmt(Number(amount))} SC` : ''}`}
              </Button>
            </CardContent>
          </Card>
        )}

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

        {canViewContributors && contributions.length > 0 && (
          <Card>
            <CardContent className="p-4 space-y-3">
              <h2 className="font-semibold text-sm">Historique des contributions</h2>
              {contributions.slice(0, 10).map((contribution) => (
                <div key={contribution.id} className="rounded-xl border border-border/60 p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    {contribution.is_anonymous ? (
                      <Avatar className="w-7 h-7">
                        <AvatarFallback>?</AvatarFallback>
                      </Avatar>
                    ) : (
                      <Avatar className="w-7 h-7">
                        <AvatarImage src={contribution.contributor?.avatar_url || ''} />
                        <AvatarFallback>
                          {contribution.contributor?.first_name?.[0]}{contribution.contributor?.last_name?.[0]}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <span className="flex-1 text-sm font-medium">
                      {contribution.is_anonymous
                        ? 'Anonyme'
                        : `${contribution.contributor?.first_name} ${contribution.contributor?.last_name}`}
                    </span>
                    <span className="font-medium text-sm flex items-center gap-1">
                      <img src={coinSC} alt="SC" className="w-4 h-4" />
                      {fmt(contribution.amount)}
                    </span>
                  </div>
                  <div className="pl-9 text-xs text-muted-foreground space-y-1">
                    <p>{format(new Date(contribution.created_at), 'dd MMM yyyy, HH:mm', { locale: fr })}</p>
                    {contribution.message && <p className="text-foreground/80">{contribution.message}</p>}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default SolidarityCampaignPage;