import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { LiveMessage, GiftOverlayState, LiveGiftTotals } from '../utils/types';

const EMPTY_LIVE_GIFT_TOTALS: LiveGiftTotals = {
  soumboulah_cash: 0,
  soumboulah_bonus: 0,
  habbah: 0,
};

const isTrackedLiveGiftCurrency = (currency?: string | null): currency is keyof LiveGiftTotals => {
  return currency === 'soumboulah_cash' || currency === 'soumboulah_bonus' || currency === 'habbah';
};

interface UseLiveChatProps {
  stableStreamId?: string;
  stableHostId?: string;
  stableUserId: string;
  stableDisplayName: string;
  stableAvatarUrl: string | null;
  isHost: boolean;
  presenceChannelRef: React.MutableRefObject<any>;
}

export const useLiveChat = ({
  stableStreamId,
  stableHostId,
  stableUserId,
  stableDisplayName,
  stableAvatarUrl,
  isHost,
  presenceChannelRef,
}: UseLiveChatProps) => {
  const [messages, setMessages] = useState<LiveMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [activeGiftOverlay, setActiveGiftOverlay] = useState<GiftOverlayState | null>(null);
  const [liveGiftTotals, setLiveGiftTotals] = useState<LiveGiftTotals>(EMPTY_LIVE_GIFT_TOTALS);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleSendMessage = useCallback(() => {
    if (!messageInput.trim() || !presenceChannelRef.current) return;

    const newMessage: LiveMessage = {
      id: crypto.randomUUID(),
      userId: stableUserId,
      userName: stableDisplayName,
      userAvatar: stableAvatarUrl,
      type: 'comment',
      content: messageInput.trim(),
      createdAt: new Date().toISOString(),
    };

    presenceChannelRef.current.send({
      type: 'broadcast',
      event: 'live_action',
      payload: newMessage,
    });

    setMessageInput('');
  }, [messageInput, presenceChannelRef, stableUserId, stableDisplayName, stableAvatarUrl]);

  const handleGiftSuccess = useCallback((amount: number, currency: string, giftLabel: string, isAnonymous: boolean) => {
    if (!presenceChannelRef.current) return;

    const senderName = isAnonymous ? 'Un utilisateur anonyme' : stableDisplayName;

    const newMessage: LiveMessage = {
      id: crypto.randomUUID(),
      userId: stableUserId,
      userName: senderName,
      userAvatar: isAnonymous ? null : stableAvatarUrl,
      type: 'gift',
      content: `a envoyé ${giftLabel}`,
      currency,
      amount,
      createdAt: new Date().toISOString(),
    };

    presenceChannelRef.current.send({
      type: 'broadcast',
      event: 'live_action',
      payload: newMessage,
    });
  }, [presenceChannelRef, stableDisplayName, stableAvatarUrl, stableUserId]);

  useEffect(() => {
    if (!stableStreamId || !stableHostId) {
      setLiveGiftTotals(EMPTY_LIVE_GIFT_TOTALS);
      return;
    }

    let isMounted = true;

    const loadLiveGiftTotals = async () => {
      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('currency, amount, transaction_type, reference_id')
        .eq('user_id', stableHostId)
        .eq('reference_id', stableStreamId)
        .in('transaction_type', ['gift', 'gift_received', 'commission']);

      if (error || !isMounted) return;

      const nextTotals = (data || []).reduce<LiveGiftTotals>((totals, transaction: any) => {
        const currency = transaction.currency as keyof LiveGiftTotals;
        if (isTrackedLiveGiftCurrency(currency)) {
          totals[currency] += Math.abs(Number(transaction.amount || 0));
        }
        return totals;
      }, { ...EMPTY_LIVE_GIFT_TOTALS });

      setLiveGiftTotals(nextTotals);
    };

    void loadLiveGiftTotals();

    const transactionChannel = supabase
      .channel(`live-gift-transactions-${stableStreamId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'wallet_transactions',
        filter: `user_id=eq.${stableHostId}`,
      }, (payload) => {
        const transaction = payload.new as any;
        if (transaction.reference_id === stableStreamId && isTrackedLiveGiftCurrency(transaction.currency)) {
          const delta = Math.abs(Number(transaction.amount || 0));
          setLiveGiftTotals(current => ({
            ...current,
            [transaction.currency]: current[transaction.currency as keyof LiveGiftTotals] + delta,
          }));
        }
      })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(transactionChannel);
    };
  }, [stableStreamId, stableHostId]);

  return {
    messages,
    setMessages,
    messageInput,
    setMessageInput,
    handleSendMessage,
    handleGiftSuccess,
    activeGiftOverlay,
    setActiveGiftOverlay,
    liveGiftTotals,
    messagesEndRef,
  };
};
