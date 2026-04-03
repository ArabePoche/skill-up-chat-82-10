import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useUserWallet } from '@/hooks/useUserWallet';
import { transferHabbah } from '@/services/habbahService';
import { toast } from 'sonner';
import { Gift, Star, Zap, Search, Loader2, ArrowLeft } from 'lucide-react';
import ConfettiAnimation from '@/components/ConfettiAnimation';
import { useAuth } from '@/hooks/useAuth';
import { formatNumber } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { sendPushNotification } from '@/utils/notificationHelpers';

interface WalletGiftModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface UserProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

const PREMIUM_GIFTS = [
  { id: 'rose', name: 'Rose', cost: 1, icon: '🌹' },
  { id: 'heart', name: 'Cœur', cost: 5, icon: '❤️' },
  { id: 'coffee', name: 'Café', cost: 10, icon: '☕' },
  { id: 'mic', name: 'Micro', cost: 50, icon: '🎤' },
  { id: 'lion', name: 'Lion', cost: 100, icon: '🦁' },
  { id: 'rocket', name: 'Fusée', cost: 500, icon: '🚀' },
];

const HABBAH_AMOUNTS = [1, 10, 50, 100, 500, 1000];
const BONUS_AMOUNTS = [1, 5, 10, 20, 50, 100];

const WalletGiftModal: React.FC<WalletGiftModalProps> = ({ isOpen, onClose }) => {
  const { wallet, isLoading: isWalletLoading } = useUserWallet();
  const { user } = useAuth();

  const [step, setStep] = useState<'search' | 'send'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const getDisplayName = (profile: UserProfile) => {
    if (profile.first_name && profile.last_name) {
      return `${profile.first_name} ${profile.last_name}`;
    }
    return profile.username || 'Utilisateur';
  };

  const handleSearch = useCallback(
    async (query: string) => {
      setSearchQuery(query);
      if (query.length < 2) {
        setSearchResults([]);
        return;
      }
      setIsSearching(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, username, avatar_url')
          .or(
            `first_name.ilike.%${query}%,last_name.ilike.%${query}%,username.ilike.%${query}%`
          )
          .neq('id', user?.id || '')
          .limit(10);
        if (error) throw error;
        setSearchResults(data || []);
      } catch {
        toast.error('Erreur lors de la recherche');
      } finally {
        setIsSearching(false);
      }
    },
    [user?.id]
  );

  const notifyRecipient = async (recipientId: string, giftLabel: string) => {
    if (!user?.id || recipientId === user.id) return;
    try {
      const { data: senderProfile } = await supabase
        .from('profiles')
        .select('first_name, last_name, username')
        .eq('id', user.id)
        .single();
      const senderName =
        senderProfile?.first_name && senderProfile?.last_name
          ? `${senderProfile.first_name} ${senderProfile.last_name}`
          : senderProfile?.username || 'Un utilisateur';
      await sendPushNotification({
        userIds: [recipientId],
        title: 'Vous avez reçu un cadeau !',
        message: `${senderName} vous a envoyé ${giftLabel}.`,
        type: 'gift_received',
        clickAction: `/wallet`,
        data: { senderId: user.id, giftLabel },
        playLocalSound: false,
      });
    } catch (e) {
      console.error('Erreur notification cadeau portefeuille:', e);
    }
  };

  const handleSendPremiumGift = async (gift: (typeof PREMIUM_GIFTS)[0]) => {
    if (!wallet || !selectedUser) return;
    if (wallet.soumboulah_cash < gift.cost) {
      toast.error('Solde Soumboulah Cash insuffisant');
      return;
    }
    setIsSending(true);
    try {
      const { error } = await supabase.rpc('transfer_soumboulah_cash', {
        p_recipient_id: selectedUser.id,
        p_amount: gift.cost,
        p_reason: `Cadeau : ${gift.name}`,
        p_reference_id: null,
      });
      if (error) throw error;
      await notifyRecipient(selectedUser.id, `${gift.icon} ${gift.name}`);
      setShowConfetti(true);
      toast.success(
        `${gift.icon} ${gift.name} envoyé à ${getDisplayName(selectedUser)} !`
      );
      setTimeout(() => {
        handleClose();
        setShowConfetti(false);
      }, 2000);
    } catch (error: any) {
      console.error('Erreur envoi cadeau premium:', error);
      toast.error("Erreur lors de l'envoi du cadeau");
    } finally {
      setIsSending(false);
    }
  };

  const handleSendHabbah = async (amount: number) => {
    if (!selectedUser) return;
    if ((wallet?.habbah || 0) < amount) {
      toast.error('Solde Habbah insuffisant');
      return;
    }
    setIsSending(true);
    try {
      const result = await transferHabbah(
        selectedUser.id,
        amount,
        'Cadeau depuis le portefeuille'
      );
      if (result.success) {
        await notifyRecipient(selectedUser.id, `${amount} Habbah`);
        setShowConfetti(true);
        toast.success(
          `${amount} H. envoyés à ${getDisplayName(selectedUser)} !`
        );
        setTimeout(() => {
          handleClose();
          setShowConfetti(false);
        }, 2000);
      } else {
        toast.error(result.message);
      }
    } catch (error: any) {
      console.error('Erreur envoi Habbah:', error);
      toast.error("Erreur lors de l'envoi");
    } finally {
      setIsSending(false);
    }
  };

  const handleSendBonus = async (amount: number) => {
    if (!selectedUser) return;
    if ((wallet?.soumboulah_bonus || 0) < amount) {
      toast.error('Solde Bonus insuffisant');
      return;
    }
    setIsSending(true);
    try {
      const { error } = await supabase.rpc('transfer_soumboulah_bonus', {
        p_recipient_id: selectedUser.id,
        p_amount: amount,
        p_reason: 'Cadeau depuis le portefeuille',
        p_reference_id: null,
      });
      if (error) throw error;
      await notifyRecipient(selectedUser.id, `${amount} SB`);
      setShowConfetti(true);
      toast.success(
        `${amount} SB envoyés à ${getDisplayName(selectedUser)} !`
      );
      setTimeout(() => {
        handleClose();
        setShowConfetti(false);
      }, 2000);
    } catch (error: any) {
      console.error('Erreur envoi Bonus:', error);
      toast.error("Erreur lors de l'envoi");
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    setStep('search');
    setSearchQuery('');
    setSearchResults([]);
    setSelectedUser(null);
    onClose();
  };

  return (
    <>
      <ConfettiAnimation
        isActive={showConfetti}
        onComplete={() => setShowConfetti(false)}
      />
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="sm:max-w-md bg-zinc-900 border-zinc-800 text-white p-0 overflow-hidden">
          <div className="p-6 pb-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                {step === 'send' && (
                  <button
                    onClick={() => setStep('search')}
                    className="p-1 text-zinc-400 hover:text-white mr-1"
                  >
                    <ArrowLeft size={18} />
                  </button>
                )}
                <Gift className="text-orange-400" />
                {step === 'search'
                  ? 'Offrir un cadeau'
                  : `Cadeau pour ${selectedUser ? getDisplayName(selectedUser) : ''}`}
              </DialogTitle>
              <DialogDescription className="text-zinc-400">
                {step === 'search'
                  ? 'Recherchez un utilisateur pour lui envoyer un cadeau.'
                  : 'Choisissez le type de cadeau à envoyer.'}
              </DialogDescription>
            </DialogHeader>
          </div>

          {step === 'search' ? (
            <div className="px-6 pb-6 space-y-4">
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                />
                <Input
                  className="pl-9 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                  placeholder="Rechercher par nom ou pseudo..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                />
              </div>

              {isSearching && (
                <div className="flex justify-center py-4">
                  <Loader2 className="animate-spin text-zinc-400" size={24} />
                </div>
              )}

              {!isSearching &&
                searchResults.length === 0 &&
                searchQuery.length >= 2 && (
                  <p className="text-center text-zinc-500 text-sm py-4">
                    Aucun utilisateur trouvé
                  </p>
                )}

              {searchResults.length > 0 && (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {searchResults.map((profile) => (
                    <button
                      key={profile.id}
                      onClick={() => {
                        setSelectedUser(profile);
                        setStep('send');
                      }}
                      className="w-full flex items-center gap-3 p-3 rounded-xl bg-zinc-800/50 hover:bg-zinc-700 border border-white/5 transition-all text-left"
                    >
                      <Avatar className="w-10 h-10 border border-zinc-600 shrink-0">
                        <AvatarImage src={profile.avatar_url || undefined} />
                        <AvatarFallback className="bg-zinc-700 text-zinc-300">
                          {getDisplayName(profile).charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium text-white">
                          {getDisplayName(profile)}
                        </p>
                        {profile.username && (
                          <p className="text-xs text-zinc-400">
                            @{profile.username}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="px-6 pb-6 space-y-4">
              {/* Soldes */}
              <div className="flex gap-4 text-xs font-medium justify-around bg-zinc-800/50 p-2 rounded-lg">
                <div className="flex flex-col items-center">
                  <span className="text-zinc-400 mb-0.5">Soumboulah</span>
                  <span className="text-emerald-400 text-base flex items-center gap-1">
                    {isWalletLoading ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      `${formatNumber(wallet?.soumboulah_cash || 0)} S.`
                    )}
                  </span>
                </div>
                <div className="w-px bg-white/10" />
                <div className="flex flex-col items-center">
                  <span className="text-zinc-400 mb-0.5">Habbah</span>
                  <span className="text-amber-400 text-base flex items-center gap-1">
                    {isWalletLoading ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      `${formatNumber(wallet?.habbah || 0)} H.`
                    )}
                  </span>
                </div>
                <div className="w-px bg-white/10" />
                <div className="flex flex-col items-center">
                  <span className="text-zinc-400 mb-0.5">Bonus</span>
                  <span className="text-blue-400 text-base flex items-center gap-1">
                    {isWalletLoading ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      `${formatNumber(wallet?.soumboulah_bonus || 0)} SB`
                    )}
                  </span>
                </div>
              </div>

              <Tabs defaultValue="premium" className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-zinc-800 mb-4 h-auto p-1">
                  <TabsTrigger
                    value="premium"
                    className="data-[state=active]:bg-zinc-700 data-[state=active]:text-orange-400 py-2"
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

                <TabsContent value="premium" className="min-h-[240px] mt-0">
                  <div className="grid grid-cols-3 gap-3">
                    {PREMIUM_GIFTS.map((gift) => (
                      <button
                        key={gift.id}
                        disabled={
                          isSending ||
                          (wallet?.soumboulah_cash || 0) < gift.cost
                        }
                        onClick={() => handleSendPremiumGift(gift)}
                        className={`flex flex-col items-center p-3 rounded-xl border border-white/5 bg-zinc-800/30 transition-all ${
                          (wallet?.soumboulah_cash || 0) >= gift.cost
                            ? 'hover:bg-zinc-700 hover:border-orange-500/50 active:scale-95'
                            : 'opacity-40 cursor-not-allowed grayscale'
                        }`}
                      >
                        <div className="text-3xl mb-2">{gift.icon}</div>
                        <div className="text-sm font-medium">{gift.name}</div>
                        <div className="text-xs text-orange-400 font-bold mt-1">
                          {gift.cost} S.
                        </div>
                      </button>
                    ))}
                    {wallet?.soumboulah_cash === 0 && (
                      <div className="col-span-3 mt-4 text-center">
                        <p className="text-sm text-zinc-500">
                          Vous n'avez pas de Soumboulah Cash.
                        </p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent
                  value="habbah"
                  className="min-h-[240px] space-y-5 mt-0"
                >
                  <div>
                    <h4 className="text-sm font-medium text-amber-400 mb-3 flex items-center gap-2">
                      <Star size={16} /> Envoyer des Habbah
                    </h4>
                    <div className="grid grid-cols-3 gap-2">
                      {HABBAH_AMOUNTS.map((amount) => (
                        <Button
                          key={`h-${amount}`}
                          size="sm"
                          variant="outline"
                          disabled={
                            isSending || (wallet?.habbah || 0) < amount
                          }
                          className="bg-zinc-800/50 border-amber-500/30 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300 hover:border-amber-500 disabled:opacity-50"
                          onClick={() => handleSendHabbah(amount)}
                        >
                          {amount} H.
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-blue-400 mb-3 flex items-center gap-2">
                      <Zap size={16} /> Envoyer Soumboulah Bonus
                    </h4>
                    <div className="grid grid-cols-3 gap-2">
                      {BONUS_AMOUNTS.map((amount) => (
                        <Button
                          key={`b-${amount}`}
                          size="sm"
                          variant="outline"
                          disabled={
                            isSending ||
                            (wallet?.soumboulah_bonus || 0) < amount
                          }
                          className="bg-zinc-800/50 border-blue-500/30 text-blue-400 hover:bg-blue-500/10 hover:text-blue-300 hover:border-blue-500 disabled:opacity-50"
                          onClick={() => handleSendBonus(amount)}
                        >
                          {amount} SB
                        </Button>
                      ))}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default WalletGiftModal;
