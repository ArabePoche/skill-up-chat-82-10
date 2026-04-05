import React, { useState, useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useUserWallet } from '@/hooks/useUserWallet';
import { transferHabbah } from '@/services/habbahService';
import { toast } from 'sonner';
import { Gift, Search, Loader2, ArrowLeft, EyeOff, RotateCcw } from 'lucide-react';
import ConfettiAnimation from '@/components/ConfettiAnimation';
import { useAuth } from '@/hooks/useAuth';
import { formatNumber } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { sendPushNotification } from '@/utils/notificationHelpers';

interface WalletGiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSelectedUser?: UserProfile;
  onGiftSent?: (amount: number, currency: CurrencyType, giftLabel: string, isAnonymous: boolean) => void;
}

interface UserProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

type CurrencyType = 'soumboulah_cash' | 'habbah' | 'soumboulah_bonus';

const CURRENCY_OPTIONS: { value: CurrencyType; label: string; unit: string; color: string }[] = [
  { value: 'soumboulah_cash', label: 'Soumboulah Cash', unit: 'S.', color: 'text-emerald-400' },
  { value: 'habbah', label: 'Habbah', unit: 'H.', color: 'text-amber-400' },
  { value: 'soumboulah_bonus', label: 'Soumboulah Bonus', unit: 'SB', color: 'text-blue-400' },
];

const WalletGiftModal: React.FC<WalletGiftModalProps> = ({ isOpen, onClose, initialSelectedUser, onGiftSent }) => {
  const { wallet, isLoading: isWalletLoading } = useUserWallet();
  const { user } = useAuth();

  const [step, setStep] = useState<'search' | 'send'>(initialSelectedUser ? 'send' : 'search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [friendIds, setFriendIds] = useState<string[]>([]);
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(initialSelectedUser || null);
  const [isSending, setIsSending] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  // Send step state
  const [currency, setCurrency] = useState<CurrencyType>('soumboulah_cash');
  const [amount, setAmount] = useState('');
  const [motif, setMotif] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [requestCancellation, setRequestCancellation] = useState(false);

  const getDisplayName = (profile: UserProfile) => {
    if (profile.first_name && profile.last_name) {
      return `${profile.first_name} ${profile.last_name}`;
    }
    return profile.username || 'Utilisateur';
  };

  // Load friend IDs when modal opens
  const loadFriendIds = useCallback(async () => {
    if (!user?.id) return;
    setIsLoadingFriends(true);
    try {
      const { data, error } = await supabase
        .from('friend_requests')
        .select('sender_id, receiver_id')
        .eq('status', 'accepted')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);
      if (error) throw error;
      const ids = (data || []).map((req) =>
        req.sender_id === user.id ? req.receiver_id : req.sender_id
      );
      setFriendIds(ids);
    } catch {
      toast.error('Erreur lors du chargement des amis');
    } finally {
      setIsLoadingFriends(false);
    }
  }, [user?.id]);

  // Prevent resetting form while open unless explicitly needed
  useEffect(() => {
    if (isOpen) {
      if (initialSelectedUser) {
        setSelectedUser(initialSelectedUser);
        setStep('send');
      } else {
        setSelectedUser(null);
        setStep('search');
        setSearchQuery('');
        setSearchResults([]);
      }
      setAmount('');
      setMotif('');
      setIsAnonymous(false);
      setRequestCancellation(false);
      setShowConfetti(false);
      if (user?.id) {
        loadFriendIds();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleSearch = useCallback(
    async (query: string) => {
      setSearchQuery(query);
      if (query.length < 2) {
        setSearchResults([]);
        return;
      }
      if (friendIds.length === 0) {
        setSearchResults([]);
        return;
      }
      setIsSearching(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, username, avatar_url')
          .in('id', friendIds)
          .or(
            `first_name.ilike.%${query}%,last_name.ilike.%${query}%,username.ilike.%${query}%`
          )
          .limit(10);
        if (error) throw error;
        setSearchResults(data || []);
      } catch {
        toast.error('Erreur lors de la recherche');
      } finally {
        setIsSearching(false);
      }
    },
    [friendIds]
  );

  const getBalance = (curr: CurrencyType): number => {
    if (!wallet) return 0;
    if (curr === 'soumboulah_cash') return wallet.soumboulah_cash || 0;
    if (curr === 'habbah') return wallet.habbah || 0;
    return wallet.soumboulah_bonus || 0;
  };

  const notifyRecipient = async (recipientId: string, giftLabel: string, senderOverrideName?: string) => {
    if (!user?.id || recipientId === user.id) return;
    try {
      let senderName = senderOverrideName;
      if (!senderName) {
        const { data: senderProfile } = await supabase
          .from('profiles')
          .select('first_name, last_name, username')
          .eq('id', user.id)
          .single();
        senderName =
          senderProfile?.first_name && senderProfile?.last_name
            ? `${senderProfile.first_name} ${senderProfile.last_name}`
            : senderProfile?.username || 'Un utilisateur';
      }
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

  const submitCancellationRequest = async (recipientId: string, recipientName: string, giftLabel: string) => {
    if (!user?.id) return;
    let senderLabel = 'Un utilisateur anonyme';
    if (!isAnonymous) {
      const { data: senderProfile } = await supabase
        .from('profiles')
        .select('first_name, last_name, username')
        .eq('id', user.id)
        .single();
      senderLabel =
        senderProfile?.first_name && senderProfile?.last_name
          ? `${senderProfile.first_name} ${senderProfile.last_name}`
          : senderProfile?.username || 'Un utilisateur';
    }

    const baseNotification = {
      sender_id: user.id,
      title: "Demande d'annulation de cadeau",
      message: `Demande d'annulation du cadeau "${giftLabel}" envoyé à ${recipientName} par ${senderLabel}.`,
      type: 'gift_cancellation_request',
      is_read: false,
    };

    // Notify all admins
    const adminNotification = { ...baseNotification, is_for_all_admins: true };

    // Notify the receiver
    const receiverNotification = { ...baseNotification, user_id: recipientId };

    const { error } = await supabase.from('notifications').insert([adminNotification, receiverNotification]);
    if (error) throw error;
  };

  const handleSend = async () => {
    if (!selectedUser || !user?.id) return;
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      toast.error('Veuillez saisir un montant valide');
      return;
    }
    const balance = getBalance(currency);
    if (balance < parsedAmount) {
      const currOption = CURRENCY_OPTIONS.find((c) => c.value === currency);
      toast.error(`Solde ${currOption?.label} insuffisant`);
      return;
    }

    setIsSending(true);
    const reason = motif.trim() || 'Cadeau depuis le portefeuille';
    const currOption = CURRENCY_OPTIONS.find((c) => c.value === currency)!;
    const giftLabel = `${parsedAmount} ${currOption.unit}`;

    try {
      if (currency === 'soumboulah_cash') {
        const { data, error } = await supabase.rpc('transfer_soumboulah_cash', {
          p_recipient_id: selectedUser.id,
          p_amount: parsedAmount,
          p_reason: reason,
          p_reference_id: null,
        });
        if (error) throw error;
        const result = data as any;
        if (result && !result.success) throw new Error(result.message);
      } else if (currency === 'habbah') {
        const result = await transferHabbah(selectedUser.id, parsedAmount, reason);
        if (!result.success) throw new Error(result.message);
      } else {
        const { data, error } = await supabase.rpc('transfer_soumboulah_bonus', {
          p_recipient_id: selectedUser.id,
          p_amount: parsedAmount,
          p_reason: reason,
          p_reference_id: null,
        });
        if (error) throw error;
        const result2 = data as any;
        if (result2 && !result2.success) throw new Error(result2.message);
      }

      const senderDisplayName = isAnonymous ? 'Un utilisateur anonyme' : undefined;
      await notifyRecipient(selectedUser.id, giftLabel, senderDisplayName);

      if (requestCancellation) {
        try {
          await submitCancellationRequest(selectedUser.id, getDisplayName(selectedUser), giftLabel);
          toast.success(
            `${giftLabel} envoyé${isAnonymous ? ' anonymement' : ''} à ${getDisplayName(selectedUser)} ! Demande d'annulation enregistrée.`
          );
        } catch (e) {
          console.error("Erreur création demande d'annulation:", e);
          toast.success(
            `${giftLabel} envoyé${isAnonymous ? ' anonymement' : ''} à ${getDisplayName(selectedUser)} !`
          );
          toast.error("La demande d'annulation n'a pas pu être enregistrée.");
        }
      } else {
        toast.success(
          `${giftLabel} envoyé${isAnonymous ? ' anonymement' : ''} à ${getDisplayName(selectedUser)} !`
        );
      }
      
      if (onGiftSent) {
        onGiftSent(parsedAmount, currency, giftLabel, isAnonymous);
      }

      setShowConfetti(true);
      setTimeout(() => {
        handleClose();
        setShowConfetti(false);
      }, 2000);
    } catch (error) {
      console.error("Erreur envoi cadeau:", error);
      toast.error("Erreur lors de l'envoi du cadeau");
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    setStep(initialSelectedUser ? 'send' : 'search');
    if (!initialSelectedUser) {
      setSearchQuery('');
      setSearchResults([]);
      setSelectedUser(null);
    }
    setCurrency('soumboulah_cash');
    setAmount('');
    setMotif('');
    setIsAnonymous(false);
    setRequestCancellation(false);
    onClose();
  };

  const selectedCurrencyOption = CURRENCY_OPTIONS.find((c) => c.value === currency)!;

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
                {step === 'send' && !initialSelectedUser && (
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
                  ? 'Recherchez parmi vos amis pour leur envoyer un cadeau.'
                  : 'Choisissez la monnaie, le montant et les options du cadeau.'}
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
                  placeholder="Rechercher un ami par nom ou pseudo..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  disabled={isLoadingFriends}
                />
              </div>

              {isLoadingFriends && (
                <div className="flex justify-center py-4">
                  <Loader2 className="animate-spin text-zinc-400" size={24} />
                </div>
              )}

              {!isLoadingFriends && friendIds.length === 0 && (
                <p className="text-center text-zinc-500 text-sm py-4">
                  Vous n'avez pas encore d'amis. Ajoutez des amis pour leur offrir des cadeaux.
                </p>
              )}

              {isSearching && (
                <div className="flex justify-center py-4">
                  <Loader2 className="animate-spin text-zinc-400" size={24} />
                </div>
              )}

              {!isSearching &&
                searchResults.length === 0 &&
                searchQuery.length >= 2 && (
                  <p className="text-center text-zinc-500 text-sm py-4">
                    Aucun ami trouvé pour cette recherche
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
            <div className="px-6 pb-6 space-y-4 overflow-y-auto max-h-[70vh]">
              {/* Soldes */}
              <div className="flex gap-2 text-xs font-medium justify-around bg-zinc-800/50 p-2 rounded-lg">
                {CURRENCY_OPTIONS.map((opt, idx) => (
                  <React.Fragment key={opt.value}>
                    {idx > 0 && <div className="w-px bg-white/10" />}
                    <div className="flex flex-col items-center">
                      <span className="text-zinc-400 mb-0.5">{opt.label.split(' ')[0]}</span>
                      <span className={`${opt.color} text-sm flex items-center gap-1`}>
                        {isWalletLoading ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          `${formatNumber(getBalance(opt.value))} ${opt.unit}`
                        )}
                      </span>
                    </div>
                  </React.Fragment>
                ))}
              </div>

              {/* Currency selector */}
              <div>
                <Label className="text-zinc-300 text-sm mb-2 block">Monnaie</Label>
                <div className="grid grid-cols-3 gap-2">
                  {CURRENCY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => { setCurrency(opt.value); setAmount(''); }}
                      className={`p-2 rounded-lg border text-xs font-medium transition-all ${
                        currency === opt.value
                          ? `border-orange-500 bg-orange-500/10 ${opt.color}`
                          : 'border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:border-zinc-500'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount input */}
              <div>
                <Label className="text-zinc-300 text-sm mb-1 block">
                  Montant <span className={`font-bold ${selectedCurrencyOption.color}`}>({selectedCurrencyOption.unit})</span>
                </Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={amount}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, '');
                    setAmount(val);
                  }}
                  placeholder="Ex: 10"
                  className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                />
                <p className="text-xs text-zinc-500 mt-1">
                  Disponible : {formatNumber(getBalance(currency))} {selectedCurrencyOption.unit}
                </p>
              </div>

              {/* Motif (optional) */}
              <div>
                <Label className="text-zinc-300 text-sm mb-1 block">
                  Motif <span className="text-zinc-500">(optionnel)</span>
                </Label>
                <Textarea
                  value={motif}
                  onChange={(e) => setMotif(e.target.value)}
                  placeholder="Ex: Bon anniversaire !"
                  className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 resize-none"
                  rows={2}
                  maxLength={200}
                />
              </div>

              {/* Anonymous option */}
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 accent-orange-400"
                />
                <span className="flex items-center gap-2 text-sm text-zinc-300">
                  <EyeOff size={15} className="text-zinc-400" />
                  Envoyer anonymement
                </span>
              </label>

              {/* Cancellation request option */}
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={requestCancellation}
                  onChange={(e) => setRequestCancellation(e.target.checked)}
                  className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 accent-orange-400"
                />
                <span className="flex items-center gap-2 text-sm text-zinc-300">
                  <RotateCcw size={15} className="text-zinc-400" />
                  Réclamer une annulation en cas d'erreur
                </span>
              </label>
              {requestCancellation && (
                <p className="text-xs text-zinc-500 -mt-2 ml-7">
                  Une demande d'annulation sera soumise automatiquement. Un administrateur la traitera.
                </p>
              )}

              {/* Send button */}
              <Button
                onClick={handleSend}
                disabled={isSending || !amount || parseFloat(amount) <= 0}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold disabled:opacity-50"
              >
                {isSending ? (
                  <Loader2 className="animate-spin mr-2" size={16} />
                ) : (
                  <Gift size={16} className="mr-2" />
                )}
                {isSending ? 'Envoi en cours…' : 'Envoyer le cadeau'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default WalletGiftModal;
