// Carte d'une cagnotte solidaire avec barre de progression
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Heart, Clock, CheckCircle, Users } from 'lucide-react';
import { SolidarityCampaign } from '../hooks/useSolidarityCampaigns';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import coinSC from '@/assets/coin-soumboulah-cash.png';

interface Props {
  campaign: SolidarityCampaign;
  onClick: () => void;
}

const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(n);

const CampaignCard: React.FC<Props> = ({ campaign, onClick }) => {
  const progress = campaign.goal_amount > 0
    ? Math.min(100, Math.round((campaign.collected_amount / campaign.goal_amount) * 100))
    : 0;

  const isCompleted = campaign.status === 'completed';
  const creator = campaign.creator;

  return (
    <Card
      className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow border-none bg-card"
      onClick={onClick}
    >
      {/* Image ou gradient par défaut */}
      <div className="h-32 bg-gradient-to-br from-rose-400 via-pink-400 to-purple-500 relative">
        {campaign.image_url && (
          <img src={campaign.image_url} alt="" className="w-full h-full object-cover" />
        )}
        {isCompleted && (
          <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
            <CheckCircle size={12} /> Objectif atteint
          </div>
        )}
        {campaign.status === 'pending' && (
          <div className="absolute top-2 right-2 bg-amber-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
            <Clock size={12} /> En attente
          </div>
        )}
      </div>

      <CardContent className="p-3 space-y-2">
        <h3 className="font-semibold text-sm line-clamp-2 text-foreground">{campaign.title}</h3>
        
        {creator && (
          <div className="flex items-center gap-2">
            <Avatar className="w-5 h-5">
              <AvatarImage src={creator.avatar_url || ''} />
              <AvatarFallback className="text-[10px]">
                {creator.first_name?.[0]}{creator.last_name?.[0]}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground">{creator.first_name} {creator.last_name}</span>
          </div>
        )}

        {/* Barre de progression */}
        <div className="space-y-1">
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-rose-500 to-pink-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1 text-foreground font-medium">
              <img src={coinSC} alt="SC" className="w-4 h-4" />
              {fmt(campaign.collected_amount)}
            </div>
            <span className="text-muted-foreground">/ {fmt(campaign.goal_amount)} SC</span>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{progress}% atteint</span>
          {campaign.deadline && (
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {format(new Date(campaign.deadline), 'dd MMM yyyy', { locale: fr })}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CampaignCard;
