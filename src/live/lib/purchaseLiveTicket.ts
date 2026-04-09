import { supabase } from '@/integrations/supabase/client';

export interface PurchaseLiveTicketResult {
  success: boolean;
  message: string;
  sc_amount?: number;
  release_at?: string;
}

export const purchaseLiveTicket = async (liveId: string) => {
  const { data, error } = await supabase.rpc('purchase_live_ticket_authenticated' as any, {
    p_live_id: liveId,
  });

  if (error) {
    throw error;
  }

  const result = (data ?? null) as PurchaseLiveTicketResult | null;

  if (!result?.success) {
    throw new Error(result?.message || 'Erreur lors de l\'achat du ticket.');
  }

  return result;
};