import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Coins,
  Copy,
  Loader2,
  Lock,
  Share2,
  Ticket,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import iconSC from '@/assets/coin-soumboulah-cash.png';

interface LiveInfo {
  id: string;
  host_id: string;
  title: string;
  description: string | null;
  status: 'scheduled' | 'active' | 'ended';
  entry_price: number;
  scheduled_at: string | null;
  max_attendees: number | null;
  host: {
    id: string;
    first_name?: string | null;
    last_name?: string | null;
    username?: string | null;
    avatar_url?: string | null;
  } | null;
}

const getDisplayName = (profile: LiveInfo['host']) => {
  if (!profile) return 'Utilisateur';
  if (profile.first_name && profile.last_name) return `${profile.first_name} ${profile.last_name}`;
  return profile.username || 'Utilisateur';
};

const formatScAmount = (sc: number) =>
  sc.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

const LiveTicketPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [live, setLive] = useState<LiveInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [scToFcfaRate, setScToFcfaRate] = useState<number>(0);
  const [ticketStatus, setTicketStatus] = useState<'none' | 'purchased' | 'refunded'>('none');
  const [soldCount, setSoldCount] = useState<number>(0);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [now, setNow] = useState(() => new Date());

  // Update countdown every second
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Load live info
  useEffect(() => {
    if (!id) { setIsLoading(false); return; }

    const load = async () => {
      setIsLoading(true);

      const { data: liveData } = await supabase
        .from('user_live_streams')
        .select('id, host_id, title, description, status, entry_price, scheduled_at, max_attendees')
        .eq('id', id)
        .maybeSingle();

      if (!liveData) { setIsLoading(false); return; }

      const { data: hostProfile } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, username, avatar_url')
        .eq('id', liveData.host_id)
        .maybeSingle();

      setLive({
        ...liveData,
        status: liveData.status as LiveInfo['status'],
        host: hostProfile || null,
      });

      // Fetch sold ticket count
      const { count } = await supabase
        .from('live_payments')
        .select('id', { count: 'exact', head: true })
        .eq('live_id', id)
        .in('status', ['pending', 'released']);
      setSoldCount(count ?? 0);

      setIsLoading(false);
    };

    void load();
  }, [id]);

  // Load conversion rate and user's ticket status
  useEffect(() => {
    const loadUserData = async () => {
      const { data: rateData } = await supabase
        .from('currency_conversion_settings')
        .select('sc_to_fcfa_rate')
        .single();
      setScToFcfaRate(rateData?.sc_to_fcfa_rate ?? 0);

      if (!user?.id || !id) return;

      const { data: payment } = await supabase
        .from('live_payments')
        .select('status')
        .eq('buyer_id', user.id)
        .eq('live_id', id)
        .maybeSingle();

      if (payment) {
        setTicketStatus(payment.status === 'refunded' ? 'refunded' : 'purchased');
      }
    };

    void loadUserData();
  }, [id, user?.id]);

  // Display-only SC amount estimate. The authoritative calculation is performed server-side
  // by the purchase-live-ticket Edge Function using the same formula. If the rounding
  // logic changes server-side, update this formula to stay in sync.
  const scAmount = live && scToFcfaRate > 0
    ? Math.round((live.entry_price / scToFcfaRate) * 100) / 100
    : null;

  const remainingSpots = live?.max_attendees != null
    ? Math.max(0, live.max_attendees - soldCount)
    : null;

  const isSoldOut = remainingSpots !== null && remainingSpots <= 0;

  // Countdown for scheduled live
  const getCountdown = () => {
    if (!live?.scheduled_at) return null;
    const diff = new Date(live.scheduled_at).getTime() - now.getTime();
    if (diff <= 0) return null;

    const hours = Math.floor(diff / 3_600_000);
    const minutes = Math.floor((diff % 3_600_000) / 60_000);
    const seconds = Math.floor((diff % 60_000) / 1000);

    if (hours > 23) {
      const days = Math.floor(hours / 24);
      return `${days}j ${hours % 24}h ${minutes}m`;
    }
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const countdown = getCountdown();

  const handlePurchase = async () => {
    if (!live || !user?.id) {
      navigate('/auth');
      return;
    }
    if (isSoldOut) {
      toast.error('Plus de places disponibles.');
      return;
    }

    setIsPurchasing(true);
    try {
      const { data, error } = await supabase.functions.invoke('purchase-live-ticket', {
        body: { live_id: live.id },
      });

      if (error) throw error;

      const result = data as { success: boolean; message: string; sc_amount?: number };
      if (!result.success) {
        toast.error(result.message || 'Paiement refusé.');
        return;
      }

      toast.success('Ticket acheté ! Vous aurez accès au live dès son démarrage.');
      setTicketStatus('purchased');
      setSoldCount((c) => c + 1);
    } catch (err: any) {
      console.error('purchase-live-ticket error:', err);
      toast.error(err?.message || 'Erreur lors de l\'achat du ticket.');
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleCopyLink = async () => {
    const url = `${window.location.origin}/live/${id}/ticket`;
    await navigator.clipboard.writeText(url).catch(() => {});
    toast.success('Lien du ticket copié !');
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (!live) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-950 p-4 text-white">
        <Ticket className="h-16 w-16 text-zinc-600" />
        <p className="text-zinc-400">Ce live n'existe pas ou n'est plus disponible.</p>
        <Button variant="ghost" onClick={() => navigate(-1)} className="text-zinc-400">
          Retour
        </Button>
      </div>
    );
  }

  const scheduledDate = live.scheduled_at ? new Date(live.scheduled_at) : null;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-white/10 bg-zinc-950/90 px-4 py-3 backdrop-blur">
        <button onClick={() => navigate(-1)} className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 hover:bg-white/10">
          <ArrowLeft size={18} />
        </button>
        <span className="flex-1 text-sm font-semibold">Ticket Live</span>
        <button onClick={handleCopyLink} className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 hover:bg-white/10">
          <Share2 size={16} />
        </button>
      </div>

      <div className="mx-auto max-w-lg px-4 pb-10 pt-6 space-y-6">
        {/* Status badge */}
        <div className="flex items-center gap-2">
          {live.status === 'active' && (
            <Badge className="bg-red-600 text-white border-0 animate-pulse">🔴 EN DIRECT</Badge>
          )}
          {live.status === 'scheduled' && (
            <Badge className="bg-sky-600 text-white border-0">📅 PROGRAMMÉ</Badge>
          )}
          {live.status === 'ended' && (
            <Badge variant="secondary" className="bg-zinc-700 text-zinc-300 border-0">Terminé</Badge>
          )}
        </div>

        {/* Title */}
        <div>
          <h1 className="text-2xl font-bold leading-tight">{live.title}</h1>
          {live.description && (
            <p className="mt-2 text-sm text-zinc-400 leading-relaxed">{live.description}</p>
          )}
        </div>

        {/* Host */}
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={live.host?.avatar_url ?? undefined} />
            <AvatarFallback className="bg-zinc-700 text-white text-sm">
              {getDisplayName(live.host).charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-semibold">{getDisplayName(live.host)}</p>
            <p className="text-xs text-zinc-500">Hôte</p>
          </div>
        </div>

        {/* Live details card */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
          {/* Date & time */}
          {scheduledDate && (
            <div className="flex items-center gap-3 text-sm">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/20 text-sky-400">
                <Calendar size={16} />
              </div>
              <div>
                <p className="font-medium">
                  {scheduledDate.toLocaleDateString('fr-FR', {
                    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                  })}
                </p>
                <p className="text-xs text-zinc-400">
                  {scheduledDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          )}

          {/* Countdown */}
          {countdown && (
            <div className="flex items-center gap-3 text-sm">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">
                <Clock size={16} />
              </div>
              <div>
                <p className="text-xs text-zinc-400">Commence dans</p>
                <p className="font-mono text-lg font-bold text-amber-300">{countdown}</p>
              </div>
            </div>
          )}

          {/* Price */}
          <div className="flex items-center gap-3 text-sm">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
              <Coins size={16} />
            </div>
            <div>
              <p className="text-xs text-zinc-400">Prix d'entrée</p>
              <div className="flex items-center gap-2">
                <img src={iconSC} alt="SC" className="h-4 w-4" />
                <span className="font-semibold">
                  {scAmount != null ? `${formatScAmount(scAmount)} SC` : '…'}
                </span>
                <span className="text-xs text-zinc-500">
                  ({live.entry_price.toLocaleString('fr-FR')} FCFA)
                </span>
              </div>
            </div>
          </div>

          {/* Seats */}
          {live.max_attendees != null && (
            <div className="flex items-center gap-3 text-sm">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/20 text-purple-400">
                <Users size={16} />
              </div>
              <div>
                <p className="text-xs text-zinc-400">Places</p>
                <p className="font-semibold">
                  {isSoldOut ? (
                    <span className="text-red-400">Complet</span>
                  ) : (
                    <span>
                      <span className="text-emerald-400">{remainingSpots}</span>
                      <span className="text-zinc-400"> / {live.max_attendees} restantes</span>
                    </span>
                  )}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* CTA */}
        {live.status === 'ended' ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
            <p className="text-zinc-400 text-sm">Ce live est terminé.</p>
          </div>
        ) : ticketStatus === 'purchased' ? (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center space-y-2">
            <Ticket className="mx-auto h-8 w-8 text-emerald-400" />
            <p className="font-semibold text-emerald-300">Ticket confirmé !</p>
            {live.status === 'active' ? (
              <Button
                className="mt-2 w-full bg-red-600 hover:bg-red-700 text-white"
                onClick={() => navigate(`/live/${live.id}`)}
              >
                🔴 Rejoindre le live maintenant
              </Button>
            ) : (
              <p className="text-xs text-zinc-400">
                Vous recevrez un accès dès le démarrage du live.
              </p>
            )}
          </div>
        ) : ticketStatus === 'refunded' ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-center">
            <p className="text-sm text-red-400">Votre ticket a été remboursé.</p>
          </div>
        ) : !user ? (
          <div className="space-y-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 flex items-center gap-3">
              <Lock size={16} className="text-zinc-400 shrink-0" />
              <p className="text-sm text-zinc-400">Connectez-vous pour acheter votre ticket.</p>
            </div>
            <Button
              className="w-full bg-white text-zinc-900 hover:bg-zinc-200 font-semibold"
              onClick={() => navigate('/auth')}
            >
              Se connecter
            </Button>
          </div>
        ) : isSoldOut ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-center">
            <p className="text-sm text-red-400">Ce live affiche complet. Aucune place disponible.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {live.status === 'active' && (
              <p className="text-xs text-zinc-400 text-center">
                ⚡ Le live est déjà en cours — achetez votre ticket pour rejoindre maintenant.
              </p>
            )}
            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-6 text-base"
              onClick={handlePurchase}
              disabled={isPurchasing}
            >
              {isPurchasing ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Traitement…</>
              ) : (
                <>
                  <Ticket className="mr-2 h-4 w-4" />
                  Acheter mon ticket
                  {scAmount != null && ` — ${formatScAmount(scAmount)} SC`}
                </>
              )}
            </Button>
            <p className="text-center text-xs text-zinc-500">
              Paiement sécurisé · Escrow 24h · Remboursement possible en cas de réclamation
            </p>
          </div>
        )}

        {/* Copy link */}
        <button
          onClick={handleCopyLink}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-zinc-400 hover:bg-white/10 transition"
        >
          <Copy size={14} />
          Copier le lien du ticket
        </button>
      </div>
    </div>
  );
};

export default LiveTicketPage;
