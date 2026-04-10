import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { purchaseLiveTicket } from '@/live/lib/purchaseLiveTicket';
import { toast } from 'sonner';
import type { LiveStreamRecord } from '../utils/types';

interface UseLivePaymentProps {
  stream: LiveStreamRecord | null;
  user: any;
  isHost: boolean;
}

export const useLivePayment = ({ stream, user, isHost }: UseLivePaymentProps) => {
  const [hasPaidEntry, setHasPaidEntry] = useState<boolean | null>(null);
  const [isPayingEntry, setIsPayingEntry] = useState(false);
  const [scToFcfaRate, setScToFcfaRate] = useState<number>(0);

  useEffect(() => {
    if (!stream) return;

    if (isHost || !stream.entry_price || stream.entry_price <= 0) {
      setHasPaidEntry(true);
      return;
    }

    if (!user?.id) {
      setHasPaidEntry(false);
      return;
    }

    let isMounted = true;

    const checkPaymentAndRate = async () => {
      const { data: rateData } = await supabase
        .from('currency_conversion_settings')
        .select('sc_to_fcfa_rate')
        .single();

      if (isMounted && rateData) {
        setScToFcfaRate(rateData.sc_to_fcfa_rate ?? 0);
      }

      const { data: payment } = await supabase
        .from('live_payments')
        .select('id, status')
        .eq('buyer_id', user.id)
        .eq('live_id', stream.id)
        .in('status', ['pending', 'released'])
        .maybeSingle();

      if (isMounted) {
        setHasPaidEntry(payment != null);
      }
    };

    void checkPaymentAndRate();

    return () => {
      isMounted = false;
    };
  }, [isHost, stream, user?.id]);

  const handlePayLiveEntry = useCallback(async () => {
    if (!stream || !user?.id || !stream.entry_price || stream.entry_price <= 0) return;

    setIsPayingEntry(true);

    try {
      await purchaseLiveTicket(stream.id);
      toast.success('Paiement effectué ! Bienvenue dans le live.');
      setHasPaidEntry(true);
    } catch (err: any) {
      console.error('Erreur paiement live via RPC:', err);
      toast.error(err?.message || 'Erreur lors du paiement.');
    } finally {
      setIsPayingEntry(false);
    }
  }, [stream, user?.id]);

  return {
    hasPaidEntry,
    isPayingEntry,
    scToFcfaRate,
    handlePayLiveEntry,
  };
};
