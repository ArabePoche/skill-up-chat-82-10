// Onglet profil : lives programmés (créateur) et tickets achetés (spectateur).
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, Coins, Radio, Ticket, TrendingUp, Users } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface LiveStreamRow {
  id: string;
  title: string;
  status: string;
  entry_price: number | null;
  scheduled_at: string | null;
  max_attendees: number | null;
  created_at: string;
}

interface LiveTabProps {
  userId?: string;
}

interface LivePaymentSummary {
  reservationCount: number;
  grossAmount: number;
  netAmount: number;
}

const formatDate = (value: string | null) => {
  if (!value) return null;
  const d = new Date(value);
  return {
    day: d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }),
    time: d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
  };
};

const statusLabel = (s: string) => {
  switch (s) {
    case 'scheduled': return { text: 'Programmé', cls: 'bg-sky-600 text-white' };
    case 'active': return { text: 'En direct', cls: 'bg-red-600 text-white animate-pulse' };
    case 'ended': return { text: 'Terminé', cls: 'bg-muted text-muted-foreground' };
    default: return { text: s, cls: 'bg-muted text-muted-foreground' };
  }
};

const LivesTab: React.FC<LiveTabProps> = ({ userId }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isOwnProfile = userId === user?.id;

  // Lives créés par cet utilisateur (programmés + actifs)
  const { data: myLives = [], isLoading: loadingLives } = useQuery({
    queryKey: ['profile-lives', userId],
    queryFn: async () => {
      const { data } = await supabase
        .from('user_live_streams')
        .select('id, title, status, entry_price, scheduled_at, max_attendees, created_at')
        .eq('host_id', userId!)
        .in('status', ['scheduled', 'active'])
        .order('scheduled_at', { ascending: true, nullsFirst: false });
      return (data ?? []) as LiveStreamRow[];
    },
    enabled: !!userId,
  });

  const myLiveIds = myLives.map((live) => live.id);
  const { data: livePaymentSummaryMap = new Map<string, LivePaymentSummary>() } = useQuery({
    queryKey: ['profile-live-payment-summary', myLiveIds, isOwnProfile],
    queryFn: async () => {
      const { data } = await supabase
        .from('live_payments')
        .select('live_id, amount, creator_amount, status')
        .in('live_id', myLiveIds)
        .in('status', ['pending', 'released', 'disputed']);

      const summaryMap = new Map<string, LivePaymentSummary>();

      for (const payment of data ?? []) {
        if (!payment.live_id) {
          continue;
        }

        const current = summaryMap.get(payment.live_id) ?? {
          reservationCount: 0,
          grossAmount: 0,
          netAmount: 0,
        };

        summaryMap.set(payment.live_id, {
          reservationCount: current.reservationCount + 1,
          grossAmount: current.grossAmount + Number(payment.amount || 0),
          netAmount: current.netAmount + Number(payment.creator_amount || 0),
        });
      }

      return summaryMap;
    },
    enabled: isOwnProfile && myLiveIds.length > 0,
  });

  // Tickets achetés (escrow) — seulement pour son propre profil
  const { data: myTickets = [], isLoading: loadingTickets } = useQuery({
    queryKey: ['profile-live-tickets', userId],
    queryFn: async () => {
      const { data } = await supabase
        .from('live_escrow_payments' as any)
        .select('id, live_stream_id, sc_amount, status, created_at')
        .eq('viewer_id', userId!)
        .order('created_at', { ascending: false })
        .limit(20);
      return (data ?? []) as any[];
    },
    enabled: isOwnProfile && !!userId,
  });

  // Fetch live titles for tickets
  const ticketLiveIds = myTickets.map((t: any) => t.live_stream_id).filter(Boolean);
  const { data: ticketLives = [] } = useQuery({
    queryKey: ['ticket-live-info', ticketLiveIds],
    queryFn: async () => {
      const { data } = await supabase
        .from('user_live_streams')
        .select('id, title, status, scheduled_at')
        .in('id', ticketLiveIds);
      return (data ?? []) as any[];
    },
    enabled: ticketLiveIds.length > 0,
  });
  const ticketLiveMap = new Map(ticketLives.map((l: any) => [l.id, l]));

  const isLoading = loadingLives || (isOwnProfile && loadingTickets);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const hasContent = myLives.length > 0 || myTickets.length > 0;

  if (!hasContent) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <Radio className="h-10 w-10 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">
          {isOwnProfile ? 'Aucun live programmé ni ticket acheté.' : 'Aucun live programmé.'}
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 py-3 space-y-6">
      {/* Mes lives (programmés / actifs) */}
      {myLives.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            {isOwnProfile ? 'Mes lives' : 'Lives programmés'}
          </h3>
          <div className="space-y-2">
            {myLives.map((live) => {
              const st = statusLabel(live.status);
              const dt = formatDate(live.scheduled_at);
              const isPaid = !!live.entry_price && live.entry_price > 0;
              const paymentSummary = livePaymentSummaryMap.get(live.id);
              const reservationCount = paymentSummary?.reservationCount ?? 0;
              const grossAmount = paymentSummary?.grossAmount ?? 0;
              const netAmount = paymentSummary?.netAmount ?? 0;
              const fillRate = live.max_attendees && live.max_attendees > 0
                ? Math.min(100, Math.round((reservationCount / live.max_attendees) * 100))
                : null;
              const showOwnerReservationDetails = isOwnProfile && live.status === 'scheduled' && isPaid;

              return (
                <div
                  key={live.id}
                  className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => navigate(
                    live.status === 'active' || (isOwnProfile && live.status === 'scheduled')
                      ? `/live/${live.id}?host=1`
                      : `/live/${live.id}`
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{live.title}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      {dt && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> {dt.day} · {dt.time}
                        </span>
                      )}
                      {isPaid && (
                        <span className="flex items-center gap-1">
                          <Ticket className="h-3 w-3" /> {live.entry_price?.toLocaleString('fr-FR')} SC
                        </span>
                      )}
                    </div>
                    {showOwnerReservationDetails && (
                      <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                        <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/10 px-2 py-1 font-medium text-sky-700 dark:text-sky-300">
                          <Users className="h-3 w-3" />
                          {reservationCount} reservation{reservationCount !== 1 ? 's' : ''}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 font-medium text-emerald-700 dark:text-emerald-300">
                          <Coins className="h-3 w-3" />
                          Brut {grossAmount.toLocaleString('fr-FR')} SC
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 px-2 py-1 font-medium text-indigo-700 dark:text-indigo-300">
                          <TrendingUp className="h-3 w-3" />
                          Net {netAmount.toLocaleString('fr-FR')} SC
                        </span>
                        {fillRate !== null && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-1 font-medium text-amber-700 dark:text-amber-300">
                            <Clock className="h-3 w-3" />
                            Remplissage {fillRate}%
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <Badge className={`border-0 text-[10px] ${st.cls}`}>{st.text}</Badge>
                  {isOwnProfile && live.status === 'scheduled' && (
                    <Button
                      size="sm"
                      variant="default"
                      className="h-8 rounded-full text-xs px-3"
                      onClick={(e) => { e.stopPropagation(); navigate(`/live/${live.id}?host=1`); }}
                    >
                      Lancer
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Tickets achetés */}
      {isOwnProfile && myTickets.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Mes tickets</h3>
          <div className="space-y-2">
            {myTickets.map((ticket: any) => {
              const liveInfo = ticketLiveMap.get(ticket.live_stream_id);
              const dt = formatDate(liveInfo?.scheduled_at ?? null);

              return (
                <div
                  key={ticket.id}
                  className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/live/${ticket.live_stream_id}/ticket`)}
                >
                  <Ticket className="h-5 w-5 text-amber-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{liveInfo?.title || 'Live'}</p>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                      <span>{ticket.sc_amount?.toLocaleString('fr-FR')} SC</span>
                      {dt && <span>· {dt.day}</span>}
                      <span className="capitalize">· {ticket.status}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};

export default LivesTab;
