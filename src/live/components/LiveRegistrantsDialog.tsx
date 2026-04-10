import React from 'react';
import { Loader2, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { LiveRegistrant, LiveStreamRecord } from '@/live/lib/userLiveShared';

interface LiveRegistrantsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stream: LiveStreamRecord;
  registrants: LiveRegistrant[];
  registrantsLoading: boolean;
}

const LiveRegistrantsDialog: React.FC<LiveRegistrantsDialogProps> = ({
  open,
  onOpenChange,
  stream,
  registrants,
  registrantsLoading,
}) => {
  const netRevenue = registrants.reduce((sum, registrant) => sum + (registrant.creator_amount || 0), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-zinc-900 border-zinc-800 text-white z-[9999]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5 text-sky-400" />
            Inscrits et revenus
          </DialogTitle>
          <DialogDescription className="text-zinc-400 text-sm">
            Participants ayant acheté un ticket pour ce live
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2 max-h-96 overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-zinc-800/60 px-4 py-3 text-center">
              <p className="text-xs text-zinc-400">Inscrits</p>
              <p className="text-2xl font-bold text-white">{registrants.length}</p>
              {stream.max_attendees != null && (
                <p className="text-xs text-zinc-500">/ {stream.max_attendees} places</p>
              )}
            </div>
            <div className="rounded-xl bg-zinc-800/60 px-4 py-3 text-center">
              <p className="text-xs text-zinc-400">Revenus nets</p>
              <p className="text-2xl font-bold text-emerald-400">
                {netRevenue.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-zinc-500">SC</p>
            </div>
          </div>

          {registrantsLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
            </div>
          ) : registrants.length === 0 ? (
            <p className="py-4 text-center text-sm text-zinc-500">Aucun inscrit pour le moment.</p>
          ) : (
            registrants.map((registrant) => {
              const name = registrant.profiles
                ? (registrant.profiles.first_name && registrant.profiles.last_name
                    ? `${registrant.profiles.first_name} ${registrant.profiles.last_name}`
                    : registrant.profiles.username || 'Utilisateur')
                : 'Utilisateur';

              return (
                <div key={registrant.buyer_id} className="flex items-center gap-3 rounded-xl bg-zinc-800/40 px-3 py-2">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage src={registrant.profiles?.avatar_url ?? undefined} />
                    <AvatarFallback className="bg-zinc-700 text-xs">{name.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{name}</p>
                    <p className="text-xs text-zinc-500 capitalize">
                      {registrant.status === 'pending'
                        ? '⏳ Escrow'
                        : registrant.status === 'released'
                        ? '✅ Libéré'
                        : registrant.status === 'disputed'
                        ? '⚠️ Litige'
                        : registrant.status}
                    </p>
                  </div>
                  <p className="text-xs text-emerald-400 shrink-0">
                    +{(registrant.creator_amount || 0).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} SC
                  </p>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LiveRegistrantsDialog;