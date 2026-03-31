import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUserWallet } from '@/hooks/useUserWallet';
import { transferHabbah } from '@/services/habbahService';
import { toast } from 'sonner';
import { Gift, Coins, Loader2, Star, Zap } from 'lucide-react';
import ConfettiAnimation from '@/components/ConfettiAnimation';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { formatNumber } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { sendPushNotification } from '@/utils/notificationHelpers';

interface VideoGiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipientId: string;
  recipientName: string;
  videoId: string;
  videoTitle?: string;
}

const PREMIUM_GIFTS = [
  { id: 'rose', name: 'Rose', cost: 1, icon: '🌹', currency: 'soumboulah_cash' },
  { id: 'heart', name: 'Cœur', cost: 5, icon: '❤️', currency: 'soumboulah_cash' },
  { id: 'coffee', name: 'Café', cost: 10, icon: '☕', currency: 'soumboulah_cash' },
  { id: 'mic', name: 'Micro', cost: 50, icon: '🎤', currency: 'soumboulah_cash' },
  { id: 'lion', name: 'Lion', cost: 100, icon: '🦁', currency: 'soumboulah_cash' },
  { id: 'rocket', name: 'Fusée', cost: 500, icon: '🚀', currency: 'soumboulah_cash' },
];

const HABBAH_AMOUNTS = [1, 10, 50, 100, 500, 1000];
const BONUS_AMOUNTS = [1, 5, 10, 20, 50, 100];

const getSenderDisplayName = async (userId: string) => {
  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, last_name, username')
    .eq('id', userId)
    .single();

  if (profile?.first_name && profile?.last_name) {
    return `${profile.first_name} ${profile.last_name}`;
  }

  return profile?.username || 'Un utilisateur';
};

const notifyVideoGiftRecipient = async ({
  recipientId,
  senderId,
  senderName,
  videoId,
  videoTitle,
  giftLabel,
}: {
  recipientId: string;
  senderId: string;
  senderName: string;
  videoId: string;
  videoTitle?: string;
  giftLabel: string;
}) => {
  await sendPushNotification({
    userIds: [recipientId],
    title: 'Cadeau vidéo reçu !',
    message: `${senderName} vous a envoyé ${giftLabel}${videoTitle ? ` sur "${videoTitle}"` : ''}.`,
    type: 'gift_received',
    clickAction: `/video/${videoId}`,
    data: { videoId, senderId, giftLabel },
    playLocalSound: false,
  });
};

export const VideoGiftModal: React.FC<VideoGiftModalProps> = ({
  isOpen,
  onClose,
  recipientId,
  recipientName,
  videoId,
  videoTitle
}) => {
  const { wallet, isLoading: isWalletLoading } = useUserWallet();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'premium' | 'habbah'>('premium');
  const [isSending, setIsSending] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const handleSendPremiumGift = async (item: typeof PREMIUM_GIFTS[0]) => {
    if (!wallet) return;
    if (wallet.soumboulah_cash < item.cost) {
      toast.error('Solde Soumboulah Cash insuffisant');
      return;
    }

    setIsSending(true);
    try {
      // Simulation appel RPC (à remplacer par le vrai endpoint si nécessaire)
      const { error } = await supabase.rpc('transfer_soumboulah_cash', {
        p_recipient_id: recipientId,
        p_amount: item.cost,
        p_reason: videoTitle || `Gift: ${item.name} for video ${videoId}`,
        p_reference_id: videoId
      });

      if (error) {
         console.error('RPC Error details:', error);
         // Only simulate if the function is genuinely missing (backend not updated yet)
         if (error.code === 'PGRST202') {
             console.warn('RPC transfer_soumboulah_cash not found, simulating success');
             
             // Optimistic update
             if (user?.id) {
                queryClient.setQueryData(['user-wallet', user.id], (old: any) => {
                    if (!old) return old;
                    return {
                        ...old,
                        soumboulah_cash: (old.soumboulah_cash || 0) - item.cost
                    };
                });
             }

             // Simulation for UI testing
             setShowConfetti(true);
             toast.success(`${item.name} envoyé à ${recipientName} ! (Simulation)`);
             setTimeout(() => {
                onClose();
                setShowConfetti(false);
             }, 2000);
             return;
         }
         // For other errors (like 400), throw them so we see the problem
         throw error; 
      }

      if (user?.id && recipientId !== user.id) {
        try {
          const senderName = await getSenderDisplayName(user.id);
          await notifyVideoGiftRecipient({
            recipientId,
            senderId: user.id,
            senderName,
            videoId,
            videoTitle,
            giftLabel: item.name,
          });
        } catch (notificationError) {
          console.error('Erreur push cadeau vidéo premium:', notificationError);
        }
      }

      setShowConfetti(true);
      toast.success(`${item.name} envoyé à ${recipientName} !`);
      setTimeout(() => {
        onClose();
        setShowConfetti(false);
      }, 2000);
    } catch (error: any) {
      console.error('Erreur envoi cadeau:', error);
      toast.error("Erreur lors de l'envoi du cadeau");
    } finally {
      setIsSending(false);
    }
  };

  const handleSendHabbahOrBonus = async (amount: number, type: 'habbah' | 'bonus') => {
    const balance = type === 'habbah' ? wallet?.habbah : wallet?.soumboulah_bonus;
    if ((balance || 0) < amount) {
      toast.error(`Solde ${type === 'habbah' ? 'Habbah' : 'Bonus'} insuffisant`);
      return;
    }

    setIsSending(true);
    try {
      if (type === 'habbah') {
        const result = await transferHabbah(
          recipientId,
          amount,
          videoTitle || `Cadeau pour la vidéo ${videoId}`,
          videoId
        );
        if (result.success) {
          if (user?.id && recipientId !== user.id) {
            try {
              const senderName = await getSenderDisplayName(user.id);
              await notifyVideoGiftRecipient({
                recipientId,
                senderId: user.id,
                senderName,
                videoId,
                videoTitle,
                giftLabel: `${amount} Habbah`,
              });
            } catch (notificationError) {
              console.error('Erreur push cadeau vidéo Habbah:', notificationError);
            }
          }
          setShowConfetti(true);
          toast.success(`${amount} Habbah envoyés !`);
          setTimeout(() => {
            onClose();
            setShowConfetti(false);
          }, 2000);
        } else {
          toast.error(result.message);
        }
      } else {
        const { error } = await supabase.rpc('transfer_soumboulah_bonus', {
            p_recipient_id: recipientId,
            p_amount: amount,
            p_reason: videoTitle || `video_gift: ${videoId}`,
            p_reference_id: videoId
        });
        
        if (error) {
           console.error('RPC Error details (bonus):', error);
           // Simulate only if function is missing (404/PGRST202)
           if (error.code === 'PGRST202') {
              console.warn('RPC transfer_soumboulah_bonus not found, simulating');
              
              if (user?.id) {
                queryClient.setQueryData(['user-wallet', user.id], (old: any) => {
                    if (!old) return old;
                    return {
                        ...old,
                        soumboulah_bonus: (old.soumboulah_bonus || 0) - amount
                    };
                });
              }

              setShowConfetti(true);
              toast.success(`${amount} SB envoyés ! (Simulation)`);
              setTimeout(() => {
                 onClose();
                 setShowConfetti(false);
              }, 2000);
              return;
           }
           // Throw other errors (like 400 Bad Request)
           throw error;
        }

        if (user?.id && recipientId !== user.id) {
          try {
            const senderName = await getSenderDisplayName(user.id);
            await notifyVideoGiftRecipient({
              recipientId,
              senderId: user.id,
              senderName,
              videoId,
              videoTitle,
              giftLabel: `${amount} SB`,
            });
          } catch (notificationError) {
            console.error('Erreur push cadeau vidéo bonus:', notificationError);
          }
        }

        setShowConfetti(true);
        toast.success(`${amount} SB envoyés !`);
        setTimeout(() => {
            onClose();
            setShowConfetti(false);
        }, 2000);
      }
    } catch (error: any) {
      console.error('Erreur envoi:', error);
      toast.error("Erreur lors de l'envoi");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      <ConfettiAnimation 
        isActive={showConfetti} 
        onComplete={() => setShowConfetti(false)} 
      />
      
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-md bg-zinc-900 border-zinc-800 text-white p-0 overflow-hidden">
          <div className="p-6 pb-2">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <Gift className="text-pink-500" />
                Offrir un cadeau
              </DialogTitle>
              <DialogDescription className="text-zinc-400">
                Soutenez {recipientName} en envoyant des cadeaux !
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="px-6 pb-4">
             {/* Solde actuel */}
            <div className="flex gap-4 text-xs font-medium justify-around bg-zinc-800/50 p-2 rounded-lg mb-4">
                <div className="flex flex-col items-center">
                    <span className="text-zinc-400 mb-0.5">Soumboulah</span>
                    <span className="text-emerald-400 text-base flex items-center gap-1">
                        {isWalletLoading ? <Loader2 className="h-3 w-3 animate-spin"/> : `${formatNumber(wallet?.soumboulah_cash || 0)} S.`}
                    </span>
                </div>
                <div className="w-px bg-white/10" />
                <div className="flex flex-col items-center">
                    <span className="text-zinc-400 mb-0.5">Habbah</span>
                    <span className="text-amber-400 text-base flex items-center gap-1">
                        {isWalletLoading ? <Loader2 className="h-3 w-3 animate-spin"/> : `${formatNumber(wallet?.habbah || 0)} H.`}
                    </span>
                </div>
                <div className="w-px bg-white/10" />
                <div className="flex flex-col items-center">
                    <span className="text-zinc-400 mb-0.5">Bonus</span>
                    <span className="text-blue-400 text-base flex items-center gap-1">
                        {isWalletLoading ? <Loader2 className="h-3 w-3 animate-spin"/> : `${formatNumber(wallet?.soumboulah_bonus || 0)} SB`}
                    </span>
                </div>
            </div>

            <Tabs defaultValue="premium" className="w-full" onValueChange={(v) => setActiveTab(v as any)}>
              <TabsList className="grid w-full grid-cols-2 bg-zinc-800 mb-4 h-auto p-1">
                <TabsTrigger 
                    value="premium"
                    className="data-[state=active]:bg-zinc-700 data-[state=active]:text-pink-400 py-2"
                >
                    Cadeaux Premium
                </TabsTrigger>
                <TabsTrigger 
                    value="habbah"
                    className="data-[state=active]:bg-zinc-700 data-[state=active]:text-amber-400 py-2"
                >
                    Habbah & Bonus
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="premium" className="min-h-[300px] mt-0">
                <div className="grid grid-cols-3 gap-3">
                    {PREMIUM_GIFTS.map((gift) => (
                        <button
                        key={gift.id}
                        disabled={isSending || (wallet?.soumboulah_cash || 0) < gift.cost}
                        onClick={() => handleSendPremiumGift(gift)}
                        className={`flex flex-col items-center p-3 rounded-xl border border-white/5 bg-zinc-800/30 transition-all ${
                            (wallet?.soumboulah_cash || 0) >= gift.cost 
                            ? 'hover:bg-zinc-700 hover:border-pink-500/50 active:scale-95' 
                            : 'opacity-40 cursor-not-allowed grayscale'
                        }`}
                        >
                            <div className="text-3xl mb-2">{gift.icon}</div>
                            <div className="text-sm font-medium">{gift.name}</div>
                            <div className="text-xs text-pink-400 flex items-center gap-1 mt-1 font-bold">
                                {gift.cost} S.
                            </div>
                        </button>
                    ))}
                    {wallet?.soumboulah_cash === 0 && (
                        <div className="col-span-3 mt-4 text-center">
                            <p className="text-sm text-zinc-500 mb-2">Vous n'avez pas de Soumboulah Cash.</p>
                        </div>
                    )}
                </div>
              </TabsContent>
              
              <TabsContent value="habbah" className="min-h-[300px] space-y-6 mt-0">
                {/* Habbah Section */}
                <div>
                  <h4 className="text-sm font-medium text-amber-400 mb-3 flex items-center gap-2">
                    <Star size={16} /> Envoyer des Habbah
                  </h4>
                  <div className="grid grid-cols-3 gap-2">
                    {HABBAH_AMOUNTS.map(amount => (
                      <Button
                        key={`h-${amount}`}
                        size="sm"
                        variant="outline" 
                        className={`bg-zinc-800/50 border-amber-500/30 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300 hover:border-amber-500 ${
                            (wallet?.habbah || 0) < amount ? 'opacity-50 pointer-events-none' : ''
                        }`}
                        onClick={() => handleSendHabbahOrBonus(amount, 'habbah')}
                        disabled={isSending}
                      >
                        {amount} H.
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Bonus Section */}
                <div>
                  <h4 className="text-sm font-medium text-blue-400 mb-3 flex items-center gap-2">
                    <Zap size={16} /> Envoyer Soumboulah Bonus
                  </h4>
                  <div className="grid grid-cols-3 gap-2">
                    {BONUS_AMOUNTS.map(amount => (
                      <Button
                        key={`b-${amount}`}
                        size="sm"
                        variant="outline"
                        className={`bg-zinc-800/50 border-blue-500/30 text-blue-400 hover:bg-blue-500/10 hover:text-blue-300 hover:border-blue-500 ${
                            (wallet?.soumboulah_bonus || 0) < amount ? 'opacity-50 pointer-events-none' : ''
                        }`}
                        onClick={() => handleSendHabbahOrBonus(amount, 'bonus')}
                        disabled={isSending}
                      >
                         {amount} SB
                      </Button>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
