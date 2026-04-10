import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Crown, ThumbsUp, ThumbsDown, AlertCircle } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import WalletGiftModal from '@/wallet/WalletGiftModal';
import BuyWithScDialog from '@/marketplace/components/BuyWithScDialog';
import type { LiveStreamRecord, LiveRegistrant } from '../utils/types';

interface LiveModalsProps {
  stream: LiveStreamRecord | null;
  isHost: boolean;
  viewersList: any[];
  showViewersModal: boolean;
  setShowViewersModal: (val: boolean) => void;
  showRegistrantsPanel: boolean;
  setShowRegistrantsPanel: (val: boolean) => void;
  registrants: LiveRegistrant[];
  registrantsLoading: boolean;
  showGiftModal: boolean;
  setShowGiftModal: (val: boolean) => void;
  onGiftSuccess: (amount: number, currency: string, giftLabel: string, isAnonymous: boolean) => void;
  isBuyProductDialogOpen: boolean;
  setIsBuyProductDialogOpen: (val: boolean) => void;
  showSatisfactionSurvey: boolean;
  setShowSatisfactionSurvey: (val: boolean) => void;
  satisfactionStep: 'rating' | 'reason';
  setSatisfactionStep: (val: 'rating' | 'reason') => void;
  satisfactionReason: string;
  setSatisfactionReason: (val: string) => void;
  isSubmittingSatisfaction: boolean;
  onSatisfactionSubmit: (rating: boolean, refund: boolean) => void;
}

export const LiveModals: React.FC<LiveModalsProps> = ({
  stream,
  isHost,
  viewersList,
  showViewersModal,
  setShowViewersModal,
  showRegistrantsPanel,
  setShowRegistrantsPanel,
  registrants,
  registrantsLoading,
  showGiftModal,
  setShowGiftModal,
  onGiftSuccess,
  isBuyProductDialogOpen,
  setIsBuyProductDialogOpen,
  showSatisfactionSurvey,
  setShowSatisfactionSurvey,
  satisfactionStep,
  setSatisfactionStep,
  satisfactionReason,
  setSatisfactionReason,
  isSubmittingSatisfaction,
  onSatisfactionSubmit,
}) => {
  return (
    <>
      {/* Modal des spectateurs */}
      <Dialog open={showViewersModal} onOpenChange={setShowViewersModal}>
        <DialogContent className="max-w-md bg-zinc-900 border-zinc-800 text-white sm:rounded-3xl">
          <DialogHeader>
            <DialogTitle>Spectateurs en direct ({viewersList.length})</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Liste des personnes actuellement présentes sur ce live.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-zinc-700">
            {viewersList.length === 0 ? (
              <div className="py-8 text-center text-zinc-500">
                <p>Aucun spectateurs pour le moment</p>
              </div>
            ) : (
              viewersList.map((viewer, idx) => {
                const name = viewer.user_name || viewer.userName || 'Spectateur';
                const role = viewer.role || 'viewer';
                const avatar = viewer.avatar_url || viewer.userAvatar;

                return (
                  <div key={viewer.user_id || idx} className="flex items-center gap-3 p-2 rounded-2xl bg-zinc-800/50 border border-white/5">
                    <Avatar className="h-10 w-10 border border-white/10">
                      <AvatarImage src={avatar || ''} />
                      <AvatarFallback className="bg-zinc-700 text-xs">
                        {name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="font-medium text-sm flex items-center gap-1.5">
                        {name}
                        {(role === 'host' || viewer.user_id === stream?.host_id) && (
                          <span className="inline-flex items-center gap-0.5 bg-amber-500/80 text-white text-[9px] font-bold px-1.5 py-[1px] rounded-full">
                            <Crown className="h-2.5 w-2.5" /> Créateur
                          </span>
                        )}
                        {role === 'participant' && viewer.user_id !== stream?.host_id && (
                          <span className="inline-flex items-center gap-0.5 bg-blue-500/80 text-white text-[9px] font-bold px-1.5 py-[1px] rounded-full">
                            Intervenant
                          </span>
                        )}
                      </span>
                      <span className="text-xs text-zinc-500 capitalize">
                        {(role === 'host' || viewer.user_id === stream?.host_id) ? 'Créateur' : role === 'participant' ? 'Intervenant' : 'Spectateur'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Panel des ventes (Host uniquement) */}
      <Dialog open={showRegistrantsPanel} onOpenChange={setShowRegistrantsPanel}>
        <DialogContent className="max-w-xl bg-zinc-950 border-zinc-800 text-white sm:rounded-3xl">
          <DialogHeader>
            <DialogTitle>Tickets vendus</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Liste des spectateurs ayant payé pour rejoindre ce live.
            </DialogDescription>
          </DialogHeader>
          {registrantsLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-zinc-600" /></div>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto space-y-2 pr-2">
              {registrants.map((r, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-2xl bg-zinc-900/50 border border-white/5">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={r.profiles?.avatar_url || ''} />
                      <AvatarFallback>{(r.profiles?.username || 'U').substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{r.profiles?.username || 'Utilisateur'}</span>
                      <span className="text-[10px] text-zinc-500">{new Date().toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-green-400">+{r.creator_amount} SC</div>
                    <div className="text-[10px] text-zinc-500">Net créateur</div>
                  </div>
                </div>
              ))}
              {registrants.length === 0 && (
                <div className="py-12 text-center text-zinc-500">Aucune vente pour le moment</div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Cadeau */}
      <WalletGiftModal
        isOpen={showGiftModal}
        onClose={() => setShowGiftModal(false)}
        recipientId={stream?.host_id || ''}
        recipientName={stream?.host?.username || 'le créateur'}
        referenceId={stream?.id}
        referenceType="live"
        onSuccess={onGiftSuccess}
      />

      {/* Modal Boutique */}
      <BuyWithScDialog
        open={isBuyProductDialogOpen}
        onOpenChange={setIsBuyProductDialogOpen}
      />

      {/* Modal Satisfaction */}
      <Dialog open={showSatisfactionSurvey} onOpenChange={setShowSatisfactionSurvey}>
        <DialogContent className="max-w-sm bg-zinc-900 border-zinc-800 text-white sm:rounded-3xl p-6">
          {satisfactionStep === 'rating' ? (
            <>
              <div className="flex justify-center mb-4">
                <div className="h-16 w-16 rounded-full bg-zinc-800 flex items-center justify-center">
                  <AlertCircle className="h-8 w-8 text-amber-400" />
                </div>
              </div>
              <DialogHeader className="text-center space-y-2">
                <DialogTitle className="text-xl">Êtes-vous satisfait ?</DialogTitle>
                <DialogDescription className="text-zinc-400">
                  Votre avis nous aide à améliorer la qualité des lives sur la plateforme.
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-3 mt-6">
                <Button
                  variant="outline"
                  className="flex flex-col gap-2 h-auto py-4 border-zinc-700 bg-zinc-800/50 hover:bg-green-500/10 hover:border-green-500/50 group transition-all"
                  onClick={() => onSatisfactionSubmit(true, false)}
                >
                  <ThumbsUp className="h-6 w-6 text-zinc-400 group-hover:text-green-400 transition-colors" />
                  <span className="text-sm font-medium">Oui, c'était top</span>
                </Button>
                <Button
                  variant="outline"
                  className="flex flex-col gap-2 h-auto py-4 border-zinc-700 bg-zinc-800/50 hover:bg-red-500/10 hover:border-red-500/50 group transition-all"
                  onClick={() => setSatisfactionStep('reason')}
                >
                  <ThumbsDown className="h-6 w-6 text-zinc-400 group-hover:text-red-400 transition-colors" />
                  <span className="text-sm font-medium">Non, je suis déçu</span>
                </Button>
              </div>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Pourquoi n'êtes-vous pas satisfait ?</DialogTitle>
                <DialogDescription className="text-zinc-400">
                  Expliquez-nous brièvement le problème rencontré.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <Textarea
                  placeholder="Décrivez votre problème (optionnel)..."
                  value={satisfactionReason}
                  onChange={(e) => setSatisfactionReason(e.target.value)}
                  className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 resize-none"
                  rows={4}
                />
                <div className="flex flex-col gap-2">
                  <Button
                    className="w-full bg-red-600 hover:bg-red-700 text-white"
                    onClick={() => onSatisfactionSubmit(false, true)}
                    disabled={isSubmittingSatisfaction}
                  >
                    {isSubmittingSatisfaction ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Envoi…</>
                    ) : (
                      'Demander un remboursement'
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full text-zinc-400 hover:text-white"
                    onClick={() => onSatisfactionSubmit(false, false)}
                    disabled={isSubmittingSatisfaction}
                  >
                    Envoyer sans remboursement
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
