// Écran principal "Aide Solidaire" - Liste des cagnottes + création
import React, { useMemo, useState } from 'react';
import { ArrowLeft, Heart, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

import CampaignCard from './components/CampaignCard';
import CreateCampaignDialog from './components/CreateCampaignDialog';
import { buildSolidarityCampaignPath } from './campaignRoutes';
import { useSolidarityCampaigns } from './hooks/useSolidarityCampaigns';

type SortKey = 'recent' | 'popular' | 'ending_soon' | 'almost_done';

const sortLabels: Record<SortKey, string> = {
  recent: 'Récentes',
  popular: 'Populaires',
  ending_soon: 'Bientôt terminées',
  almost_done: 'Presque atteintes',
};

const SolidarityScreen: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: campaigns = [], isLoading } = useSolidarityCampaigns();
  const [showCreate, setShowCreate] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>('recent');
  const [showMyOnly, setShowMyOnly] = useState(false);

  const filtered = useMemo(() => {
    let list = [...campaigns];

    if (showMyOnly && user?.id) {
      list = list.filter((campaign) => campaign.creator_id === user.id);
    }

    switch (sortBy) {
      case 'popular':
        list.sort((left, right) => right.collected_amount - left.collected_amount);
        break;
      case 'ending_soon':
        list.sort((left, right) => {
          if (!left.deadline) return 1;
          if (!right.deadline) return -1;
          return new Date(left.deadline).getTime() - new Date(right.deadline).getTime();
        });
        break;
      case 'almost_done':
        list.sort((left, right) => {
          const progressLeft = left.goal_amount > 0 ? left.collected_amount / left.goal_amount : 0;
          const progressRight = right.goal_amount > 0 ? right.collected_amount / right.goal_amount : 0;
          return progressRight - progressLeft;
        });
        break;
      default:
        list.sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime());
        break;
    }

    return list;
  }, [campaigns, showMyOnly, sortBy, user?.id]);

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-gradient-to-r from-rose-500 via-pink-500 to-purple-500 px-4 pt-12 pb-6">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate(-1)} className="p-1 text-white/80 hover:text-white">
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Heart size={22} /> Aide Solidaire
            </h1>
            <p className="text-white/70 text-sm">Soutenez ceux qui en ont besoin</p>
          </div>
        </div>

        <Button
          onClick={() => setShowCreate(true)}
          className="w-full bg-white/20 hover:bg-white/30 text-white border border-white/30 backdrop-blur-sm"
        >
          <Plus size={18} /> Créer une cagnotte
        </Button>
      </div>

      <div className="px-4 py-3 flex items-center gap-2 overflow-x-auto">
        {(Object.keys(sortLabels) as SortKey[]).map((key) => (
          <button
            key={key}
            onClick={() => setSortBy(key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              sortBy === key
                ? 'bg-rose-500 text-white'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {sortLabels[key]}
          </button>
        ))}
        <button
          onClick={() => setShowMyOnly((current) => !current)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
            showMyOnly
              ? 'bg-purple-500 text-white'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          Mes cagnottes
        </button>
      </div>

      <div className="px-4 pb-24">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Heart size={48} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Aucune cagnotte trouvée</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((campaign) => (
              <CampaignCard
                key={campaign.id}
                campaign={campaign}
                onClick={() => navigate(buildSolidarityCampaignPath(campaign.id, campaign.title))}
              />
            ))}
          </div>
        )}
      </div>

      <CreateCampaignDialog open={showCreate} onOpenChange={setShowCreate} />
    </div>
  );
};

export default SolidarityScreen;
