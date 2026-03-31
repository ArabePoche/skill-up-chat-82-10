// Dialog de détail d'une cagnotte + contribution
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SolidarityCampaign, useCampaignContributions, useContribute } from '../hooks/useSolidarityCampaigns';
import { Heart, Users, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import coinSC from '@/assets/coin-soumboulah-cash.png';
import { useAuth } from '@/hooks/useAuth';

interface Props {
  campaign: SolidarityCampaign | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(n);

const CampaignDetailDialog: React.FC<Props> = ({ campaign, open, onOpenChange }) => {
  const { user } = useAuth();
  const { data: contributions = [] } = useCampaignContributions(campaign?.id || null);
  const { mutate: contribute, isPending } = useContribute();
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);

  if (!campaign) return null;

  const progress = campaign.goal_amount > 0
    ? Math.min(100, Math.round((campaign.collected_amount / campaign.goal_amount) * 100))
    : 0;
  const contributionCount = campaign.contributor_count ?? contributions.length;
  const userContributions = user?.id
    ? contributions.filter((contribution) => contribution.contributor_id === user.id)
    : [];

  const isOwnCampaign = user?.id === campaign.creator_id;
  const canContribute = campaign.status === 'approved' || (isOwnCampaign && campaign.status === 'pending');

  const handleContribute = () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) return;
    contribute({
      campaignId: campaign.id,
      amount: amt,
      message: message.trim() || undefined,
      isAnonymous,
      commissionRate: campaign.commission_rate,
    });
    setAmount('');
    setMessage('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Heart className="text-rose-500" size={18} />
            {campaign.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Image */}
          <div className="h-40 rounded-lg bg-gradient-to-br from-rose-400 via-pink-400 to-purple-500 overflow-hidden">
            {campaign.image_url && (
              <img src={campaign.image_url} alt="" className="w-full h-full object-cover" />
            )}
          </div>

          {/* Description */}
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{campaign.description}</p>

          {campaign.beneficiary_name && (
            <p className="text-sm"><strong>Bénéficiaire :</strong> {campaign.beneficiary_name}</p>
          )}

          {/* Progression */}
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
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users size={14} /> {contributionCount} contributeur(s)
              </span>
              {campaign.deadline && (
                <span className="flex items-center gap-1">
                  <Clock size={14} /> Jusqu'au {format(new Date(campaign.deadline), 'dd MMM yyyy', { locale: fr })}
                </span>
              )}
            </div>
          </div>

          {/* Formulaire de contribution */}
          {canContribute && (
            <div className="p-3 rounded-lg bg-muted/50 space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Heart size={14} className="text-rose-500" /> Contribuer
              </h4>
              <div className="flex items-center gap-2">
                <img src={coinSC} alt="SC" className="w-5 h-5" />
                <Input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="Montant en SC"
                  min={1}
                />
              </div>
              <Input
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Message d'encouragement (optionnel)"
              />
              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                <input type="checkbox" checked={isAnonymous} onChange={e => setIsAnonymous(e.target.checked)} />
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
                disabled={isPending || !amount || Number(amount) <= 0}
                className="w-full bg-rose-500 hover:bg-rose-600 text-white"
              >
                {isPending ? 'Envoi...' : `Donner ${amount ? fmt(Number(amount)) + ' SC' : ''}`}
              </Button>
            </div>
          )}

          {/* Liste des contributeurs */}
          {contributions.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Historique des contributions</h4>
              {contributions.slice(0, 10).map(c => (
                <div key={c.id} className="rounded-lg border border-border/60 p-2 space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                  {c.is_anonymous ? (
                    <Avatar className="w-6 h-6">
                      <AvatarFallback className="text-[10px]">?</AvatarFallback>
                    </Avatar>
                  ) : (
                    <Avatar className="w-6 h-6">
                      <AvatarImage src={c.contributor?.avatar_url || ''} />
                      <AvatarFallback className="text-[10px]">
                        {c.contributor?.first_name?.[0]}{c.contributor?.last_name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <span className="flex-1 text-foreground">
                    {c.is_anonymous ? 'Anonyme' : `${c.contributor?.first_name} ${c.contributor?.last_name}`}
                  </span>
                  <span className="font-medium text-foreground flex items-center gap-1">
                    <img src={coinSC} alt="" className="w-4 h-4" />
                    {fmt(c.amount)}
                  </span>
                </div>
                  <div className="pl-8 text-xs text-muted-foreground space-y-1">
                    <p>{format(new Date(c.created_at), 'dd MMM yyyy, HH:mm', { locale: fr })}</p>
                    {c.message && <p className="text-foreground/80">{c.message}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {userContributions.length > 0 && (
            <div className="space-y-2 rounded-lg bg-muted/40 p-3">
              <h4 className="text-sm font-semibold">Mes contributions</h4>
              {userContributions.slice(0, 5).map((contribution) => (
                <div key={contribution.id} className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{format(new Date(contribution.created_at), 'dd MMM yyyy, HH:mm', { locale: fr })}</span>
                  <span className="flex items-center gap-1 font-medium text-foreground">
                    <img src={coinSC} alt="" className="w-4 h-4" />
                    {fmt(contribution.amount)} SC
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CampaignDetailDialog;
