import React from 'react';
import { BarChart2, Clock, Coins, Gift, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import iconSC from '@/assets/coin-soumboulah-cash.png';
import iconSB from '@/assets/coin-soumboulah-bonus.png';
import iconH from '@/assets/coin-habbah.png';
import type { LiveGiftTotals, LiveStreamRecord } from '@/live/lib/userLiveShared';

interface LiveCreatorReportDialogProps {
  open: boolean;
  stream: LiveStreamRecord;
  reportEndedAt: Date | null;
  reportViewerCount: number;
  reportPaidEntryCount: number;
  liveGiftTotals: LiveGiftTotals;
  onCloseToProfile: () => void;
}

const formatDuration = (startedAt: string, endedAt: Date | null) => {
  const start = new Date(startedAt);
  const end = endedAt ?? new Date();
  const diffSec = Math.max(0, Math.round((end.getTime() - start.getTime()) / 1000));
  const hours = Math.floor(diffSec / 3600);
  const minutes = Math.floor((diffSec % 3600) / 60);
  const seconds = diffSec % 60;

  if (hours > 0) return `${hours}h ${minutes}min ${seconds}s`;
  if (minutes > 0) return `${minutes}min ${seconds}s`;
  return `${seconds}s`;
};

const LiveCreatorReportDialog: React.FC<LiveCreatorReportDialogProps> = ({
  open,
  stream,
  reportEndedAt,
  reportViewerCount,
  reportPaidEntryCount,
  liveGiftTotals,
  onCloseToProfile,
}) => {
  const hasGiftTotals = liveGiftTotals.soumboulah_cash > 0 || liveGiftTotals.soumboulah_bonus > 0 || liveGiftTotals.habbah > 0;

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onCloseToProfile(); }}>
      <DialogContent className="sm:max-w-md bg-zinc-900 border-zinc-800 text-white z-[9999]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <BarChart2 className="h-5 w-5 text-indigo-400" />
            Rapport du live
          </DialogTitle>
          <DialogDescription className="text-zinc-400 text-sm">
            Résumé de votre session en direct
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="flex items-center justify-between rounded-xl bg-zinc-800/60 px-4 py-3">
            <div className="flex items-center gap-2 text-zinc-300 text-sm">
              <Clock className="h-4 w-4 text-zinc-400" />
              Durée
            </div>
            <span className="font-semibold text-white">
              {stream.started_at ? formatDuration(stream.started_at, reportEndedAt) : '—'}
            </span>
          </div>

          <div className="flex items-center justify-between rounded-xl bg-zinc-800/60 px-4 py-3">
            <div className="flex items-center gap-2 text-zinc-300 text-sm">
              <Users className="h-4 w-4 text-zinc-400" />
              Spectateurs (total)
            </div>
            <span className="font-semibold text-white">{reportViewerCount}</span>
          </div>

          {stream.entry_price && stream.entry_price > 0 && (
            <div className="flex items-center justify-between rounded-xl bg-zinc-800/60 px-4 py-3">
              <div className="flex items-center gap-2 text-zinc-300 text-sm">
                <Coins className="h-4 w-4 text-emerald-400" />
                Entrées payantes
              </div>
              <div className="text-right">
                <div className="font-semibold text-white">{reportPaidEntryCount} spectateur{reportPaidEntryCount !== 1 ? 's' : ''}</div>
                <div className="text-xs text-emerald-400">
                  {(reportPaidEntryCount * stream.entry_price).toLocaleString('fr-FR')} FCFA
                </div>
              </div>
            </div>
          )}

          {hasGiftTotals && (
            <div className="rounded-xl bg-zinc-800/60 px-4 py-3 space-y-2">
              <p className="text-zinc-300 text-sm flex items-center gap-2">
                <Gift className="h-4 w-4 text-pink-400" />
                Cadeaux reçus
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {liveGiftTotals.soumboulah_cash > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 px-2.5 py-1 text-xs font-semibold text-emerald-300">
                    <img src={iconSC} alt="SC" className="h-4 w-4 object-contain" />
                    {liveGiftTotals.soumboulah_cash.toLocaleString('fr-FR')} SC
                  </span>
                )}
                {liveGiftTotals.soumboulah_bonus > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/20 border border-blue-500/30 px-2.5 py-1 text-xs font-semibold text-blue-300">
                    <img src={iconSB} alt="SB" className="h-4 w-4 object-contain" />
                    {liveGiftTotals.soumboulah_bonus.toLocaleString('fr-FR')} SB
                  </span>
                )}
                {liveGiftTotals.habbah > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 border border-amber-500/30 px-2.5 py-1 text-xs font-semibold text-amber-300">
                    <img src={iconH} alt="H" className="h-4 w-4 object-contain" />
                    {liveGiftTotals.habbah.toLocaleString('fr-FR')} H
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
        <Button className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 text-white" onClick={onCloseToProfile}>
          Retour au profil
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default LiveCreatorReportDialog;