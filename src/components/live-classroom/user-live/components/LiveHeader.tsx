import React from 'react';
import { ArrowLeft, Users, Coins, Crown, Globe, Lock, BarChart2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FollowButtonInline } from './FollowButtonInline';
import type { LiveStreamRecord, LiveGiftTotals } from '../utils/types';
import iconSC from '@/assets/coin-soumboulah-cash.png';
import iconSB from '@/assets/coin-soumboulah-bonus.png';
import iconH from '@/assets/coin-habbah.png';

interface LiveHeaderProps {
  stream: LiveStreamRecord | null;
  isHost: boolean;
  audienceCount: number;
  liveGiftTotals: LiveGiftTotals;
  onBack: () => void;
  onShowViewers: () => void;
  onShowRegistrants: () => void;
  formatScAmount: (n: number) => string;
}

export const LiveHeader: React.FC<LiveHeaderProps> = ({
  stream,
  isHost,
  audienceCount,
  liveGiftTotals,
  onBack,
  onShowViewers,
  onShowRegistrants,
  formatScAmount,
}) => {
  if (!stream) return null;

  const hostName = stream.host?.first_name && stream.host?.last_name 
    ? `${stream.host.first_name} ${stream.host.last_name}`
    : stream.host?.username || 'Utilisateur';

  const compactHostName = hostName.length <= 14 ? hostName : `${hostName.slice(0, 12).trimEnd()}…`;

  return (
    <header className="absolute top-0 left-0 right-0 z-50 flex items-start justify-between p-3 pointer-events-none">
      <div className="flex flex-col gap-2 pointer-events-auto">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="h-9 w-9 rounded-full bg-black/25 text-white backdrop-blur-md hover:bg-black/40"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>

          <div className="flex items-center gap-2 rounded-full bg-black/25 p-1 pr-3 backdrop-blur-md border border-white/10">
            <Avatar className="h-8 w-8 border border-white/20">
              <AvatarImage src={stream.host?.avatar_url || ''} />
              <AvatarFallback className="bg-zinc-800 text-xs text-white">
                {hostName.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col leading-none">
              <div className="flex items-center gap-1">
                <span className="text-[11px] font-bold text-white max-w-[100px] truncate">
                  {compactHostName}
                </span>
                {isHost && (
                  <Crown className="h-2.5 w-2.5 text-amber-400 fill-amber-400" />
                )}
                {!isHost && stream.host_id && (
                  <FollowButtonInline hostId={stream.host_id} />
                )}
              </div>
              <div className="flex items-center gap-1 mt-0.5" onClick={onShowViewers} role="button">
                <Users className="h-2.5 w-2.5 text-zinc-400" />
                <span className="text-[9px] font-medium text-zinc-300">
                  {audienceCount} spectateurs
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 ml-1">
          <Badge className="bg-red-600/90 text-white border-0 text-[10px] font-bold px-2 py-0.5 flex items-center gap-1 shadow-lg">
            <div className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
            LIVE
          </Badge>
          <Badge className="bg-black/30 text-white border-white/10 backdrop-blur-md text-[10px] px-2 py-0.5 flex items-center gap-1 shadow-md">
            {stream.visibility === 'public' ? (
              <Globe className="h-2.5 w-2.5 text-blue-400" />
            ) : (
              <Lock className="h-2.5 w-2.5 text-amber-400" />
            )}
            {stream.visibility === 'public' ? 'Public' : 'Privé'}
          </Badge>
          {isHost && stream.entry_price && stream.entry_price > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onShowRegistrants}
              className="h-5 rounded-full bg-blue-600/80 hover:bg-blue-600 text-white border-0 text-[10px] px-2 py-0 flex items-center gap-1 shadow-md"
            >
              <BarChart2 className="h-2.5 w-2.5" />
              Ventes
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col items-end gap-2 pointer-events-auto">
        <div className="flex flex-col items-end gap-1.5">
          <div className="flex items-center gap-1 rounded-full bg-black/30 px-2 py-1 backdrop-blur-md border border-white/10 shadow-lg group hover:bg-black/40 transition-all">
            <img src={iconSC} alt="SC" className="h-3.5 w-3.5 object-contain" />
            <span className="text-[11px] font-bold text-white">
              {formatScAmount(liveGiftTotals.soumboulah_cash)}
            </span>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-black/30 px-2 py-1 backdrop-blur-md border border-white/10 shadow-lg group hover:bg-black/40 transition-all">
            <img src={iconSB} alt="SB" className="h-3.5 w-3.5 object-contain" />
            <span className="text-[11px] font-bold text-zinc-300">
              {formatScAmount(liveGiftTotals.soumboulah_bonus)}
            </span>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-black/30 px-2 py-1 backdrop-blur-md border border-white/10 shadow-lg group hover:bg-black/40 transition-all">
            <img src={iconH} alt="H" className="h-3.5 w-3.5 object-contain" />
            <span className="text-[11px] font-bold text-zinc-300">
              {formatScAmount(liveGiftTotals.habbah)}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
