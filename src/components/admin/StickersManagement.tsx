/**
 * Admin — Gestion complète des stickers
 * - Onglet "Nouveaux packs" : file de modération des packs initiaux
 * - Onglet "Nouveaux stickers" : stickers ajoutés à des packs déjà approuvés
 * - Onglet "Tous les packs" : vue globale avec actions admin
 */
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, CheckCircle2, XCircle, RotateCcw, Eye, AlertCircle, ImageIcon } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useReviewStickerPack, useReviewSticker } from '@/stickers/hooks/useStickerMutations';
import { useStickerModerationQueue, usePendingStickersModeration } from '@/stickers/hooks/useStickerPacks';
import { useSignedStickerUrls } from '@/stickers/hooks/useSignedStickerUrls';
import { useMemo } from 'react';

const db = supabase as any;

/* ── Status badge ── */
const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: 'Brouillon', color: 'bg-slate-100 text-slate-700' },
  pending_review: { label: 'En attente', color: 'bg-amber-100 text-amber-700' },
  approved: { label: 'Approuvé', color: 'bg-emerald-100 text-emerald-700' },
  rejected: { label: 'Rejeté', color: 'bg-rose-100 text-rose-700' },
};
const StatusBadge = ({ status }: { status: string }) => {
  const s = STATUS_LABELS[status] ?? { label: status, color: 'bg-slate-100 text-slate-600' };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${s.color}`}>
      {s.label}
    </span>
  );
};

/* ── All-packs query ── */
const useAllStickerPacks = () =>
  useQuery({
    queryKey: ['admin-all-sticker-packs'],
    queryFn: async () => {
      const { data, error } = await db
        .from('sticker_packs')
        .select(`*, profiles:creator_id (first_name, last_name, username), stickers (id, status)`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

/* ── Reset to draft ── */
const useResetPackToDraft = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (packId: string) => {
      const { error } = await db
        .from('sticker_packs')
        .update({ status: 'draft', rejection_reason: null })
        .eq('id', packId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-all-sticker-packs'] });
      queryClient.invalidateQueries({ queryKey: ['sticker-moderation-queue'] });
      toast.success('Pack remis en brouillon.');
    },
    onError: (e: any) => toast.error(e?.message || 'Erreur'),
  });
};

/* ════════════════════════════════════════════════════
   ONGLET 1 : NOUVEAUX PACKS en attente de validation
════════════════════════════════════════════════════ */
const PackModerationQueue: React.FC = () => {
  const { data: queue, isLoading } = useStickerModerationQueue();
  const review = useReviewStickerPack();
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  /* Signed URLs pour les stickers du pack */
  const allPaths = useMemo(() => {
    const paths: string[] = [];
    (queue as any[] ?? []).forEach((pack) => {
      (pack.stickers || []).forEach((s: any) => { if (s.file_path) paths.push(s.file_path); });
    });
    return paths;
  }, [queue]);
  const { data: signedMap = {} } = useSignedStickerUrls(allPaths);

  if (isLoading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  if (!queue?.length) {
    return (
      <div className="flex flex-col items-center py-16 text-muted-foreground text-center">
        <Sparkles className="w-10 h-10 mb-3 opacity-40" />
        <p className="font-medium">Aucun nouveau pack en attente.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {(queue as any[]).map((pack) => (
        <div key={pack.id} className="bg-card border rounded-2xl p-5 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center overflow-hidden shrink-0 border">
              {pack.icon_url ? <img src={pack.icon_url} alt={pack.name} className="w-full h-full object-cover" /> : <Sparkles className="w-7 h-7 text-muted-foreground" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-base">{pack.name}</h3>
                <StatusBadge status={pack.status} />
              </div>
              {pack.description && <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">{pack.description}</p>}
              <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                <span>Créateur : <span className="font-medium text-slate-700">{pack.profiles?.first_name || pack.profiles?.username || 'Inconnu'}</span></span>
                <span>{pack.stickers?.length ?? 0} sticker(s)</span>
                <span>{pack.price_sc > 0 ? `${pack.price_sc} SC` : 'Gratuit'}</span>
                {pack.submitted_at && <span>Soumis le {new Date(pack.submitted_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
              </div>
            </div>
          </div>

          {pack.stickers?.length > 0 && (
            <div className="grid grid-cols-6 gap-2 mt-4">
              {pack.stickers.slice(0, 6).map((s: any) => (
                <div key={s.id} className="aspect-square rounded-lg bg-muted overflow-hidden border">
                  <img src={(s.file_path && signedMap[s.file_path]) || s.file_url} alt="" className="w-full h-full object-contain" />
                </div>
              ))}
              {pack.stickers.length > 6 && (
                <div className="aspect-square rounded-lg bg-slate-100 border flex items-center justify-center text-xs text-slate-500 font-medium">+{pack.stickers.length - 6}</div>
              )}
            </div>
          )}

          {rejectingId === pack.id ? (
            <div className="mt-4 space-y-2">
              <Textarea placeholder="Raison du rejet (visible par le créateur)…" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
              <div className="flex gap-2">
                <Button variant="destructive" size="sm" disabled={!reason.trim() || review.isPending}
                  onClick={() => review.mutate({ packId: pack.id, decision: 'reject', reason }, { onSuccess: () => { setRejectingId(null); setReason(''); } })}>
                  {review.isPending && <Loader2 className="w-3 h-3 mr-1 animate-spin" />} Confirmer le rejet
                </Button>
                <Button variant="outline" size="sm" onClick={() => { setRejectingId(null); setReason(''); }}>Annuler</Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2 mt-4">
              <Button size="sm" disabled={review.isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => review.mutate({ packId: pack.id, decision: 'approve' })}>
                {review.isPending ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <CheckCircle2 className="w-3 h-3 mr-1" />} Approuver le pack
              </Button>
              <Button variant="outline" size="sm" disabled={review.isPending} onClick={() => setRejectingId(pack.id)}>
                <XCircle className="w-3 h-3 mr-1" /> Rejeter
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

/* ════════════════════════════════════════════════════
   ONGLET 2 : STICKERS INDIVIDUELS en attente
   (ajoutés à des packs déjà approuvés)
════════════════════════════════════════════════════ */
const StickerModerationQueue: React.FC = () => {
  const { data: pending, isLoading } = usePendingStickersModeration();
  const review = useReviewSticker();

  const allPaths = useMemo(() => {
    return (pending as any[] ?? []).map((s: any) => s.file_path).filter(Boolean);
  }, [pending]);
  const { data: signedMap = {} } = useSignedStickerUrls(allPaths);

  if (isLoading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  if (!pending?.length) {
    return (
      <div className="flex flex-col items-center py-16 text-muted-foreground text-center">
        <Sparkles className="w-10 h-10 mb-3 opacity-40" />
        <p className="font-medium">Aucun sticker en attente de validation individuelle.</p>
        <p className="text-sm mt-1">Les nouveaux stickers ajoutés aux packs approuvés apparaîtront ici.</p>
      </div>
    );
  }

  /* Group stickers by pack */
  const byPack: Record<string, { pack: any; stickers: any[] }> = {};
  (pending as any[]).forEach((s) => {
    const packId = s.sticker_packs?.id ?? 'unknown';
    if (!byPack[packId]) byPack[packId] = { pack: s.sticker_packs, stickers: [] };
    byPack[packId].stickers.push(s);
  });

  return (
    <div className="space-y-6">
      {Object.values(byPack).map(({ pack, stickers }) => (
        <div key={pack?.id ?? Math.random()} className="bg-card border rounded-2xl p-5 shadow-sm">
          {/* Pack header */}
          <div className="flex items-center gap-3 mb-4 pb-4 border-b">
            <div className="w-10 h-10 rounded-lg bg-muted overflow-hidden border flex items-center justify-center shrink-0">
              {pack?.icon_url ? <img src={pack.icon_url} alt="" className="w-full h-full object-cover" /> : <Sparkles className="w-5 h-5 text-muted-foreground" />}
            </div>
            <div>
              <p className="font-semibold text-slate-800">{pack?.name ?? 'Pack inconnu'}</p>
              <p className="text-xs text-muted-foreground">
                Par {pack?.profiles?.first_name || pack?.profiles?.username || 'Inconnu'} · {stickers.length} sticker(s) en attente
              </p>
            </div>
          </div>

          {/* Stickers grid */}
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {stickers.map((sticker) => (
              <div key={sticker.id} className="flex flex-col gap-1.5">
                <div className="aspect-square rounded-xl bg-muted border overflow-hidden">
                  {sticker.file_path || sticker.file_url ? (
                    <img
                      src={(sticker.file_path && signedMap[sticker.file_path]) || sticker.file_url}
                      alt=""
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    className="flex-1 h-7 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white px-1"
                    disabled={review.isPending}
                    onClick={() => review.mutate({ stickerId: sticker.id, decision: 'approve' })}
                    title="Approuver"
                  >
                    <CheckCircle2 className="w-3 h-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 h-7 text-[11px] border-rose-200 text-rose-600 hover:bg-rose-50 px-1"
                    disabled={review.isPending}
                    onClick={() => review.mutate({ stickerId: sticker.id, decision: 'reject' })}
                    title="Rejeter"
                  >
                    <XCircle className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

/* ════════════════════════════════════════════════════
   ONGLET 3 : TOUS LES PACKS
════════════════════════════════════════════════════ */
const AllPacksTable: React.FC = () => {
  const { data: packs, isLoading } = useAllStickerPacks();
  const resetToDraft = useResetPackToDraft();
  const review = useReviewStickerPack();

  if (isLoading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  if (!packs?.length) return (
    <div className="flex flex-col items-center py-16 text-muted-foreground text-center">
      <Sparkles className="w-10 h-10 mb-3 opacity-40" /><p className="font-medium">Aucun pack.</p>
    </div>
  );

  return (
    <>
      <div className="mb-3 rounded-xl bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-800 flex items-start gap-2">
        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
        <span><strong>Remettre en brouillon</strong> permet au créateur de modifier son pack et d'y ajouter des stickers — les nouveaux stickers passeront ensuite en validation individuelle.</span>
      </div>
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Pack</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Créateur</th>
              <th className="text-center px-4 py-3 font-semibold text-slate-600">Stickers</th>
              <th className="text-center px-4 py-3 font-semibold text-slate-600">En attente</th>
              <th className="text-center px-4 py-3 font-semibold text-slate-600">Prix</th>
              <th className="text-center px-4 py-3 font-semibold text-slate-600">Statut</th>
              <th className="text-right px-4 py-3 font-semibold text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {(packs as any[]).map((pack) => {
              const pendingCount = (pack.stickers ?? []).filter((s: any) => s.status === 'pending_review').length;
              return (
                <tr key={pack.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-muted overflow-hidden border flex items-center justify-center shrink-0">
                        {pack.icon_url ? <img src={pack.icon_url} alt="" className="w-full h-full object-cover" /> : <Sparkles className="w-4 h-4 text-muted-foreground" />}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800">{pack.name}</p>
                        {pack.description && <p className="text-xs text-slate-500 line-clamp-1">{pack.description}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{pack.profiles?.first_name || pack.profiles?.username || '—'}</td>
                  <td className="px-4 py-3 text-center text-slate-600">{(pack.stickers ?? []).length}</td>
                  <td className="px-4 py-3 text-center">
                    {pendingCount > 0 ? (
                      <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-bold rounded-full bg-amber-500 text-white">{pendingCount}</span>
                    ) : <span className="text-slate-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-center text-slate-600">{pack.price_sc > 0 ? `${pack.price_sc} SC` : 'Gratuit'}</td>
                  <td className="px-4 py-3 text-center"><StatusBadge status={pack.status ?? 'draft'} /></td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {pack.status === 'pending_review' && (
                        <Button size="sm" variant="ghost" disabled={review.isPending}
                          className="text-emerald-700 hover:bg-emerald-50"
                          onClick={() => review.mutate({ packId: pack.id, decision: 'approve' })} title="Approuver le pack">
                          <CheckCircle2 className="w-4 h-4" />
                        </Button>
                      )}
                      {pack.status !== 'draft' && (
                        <Button size="sm" variant="ghost" disabled={resetToDraft.isPending}
                          className="text-amber-700 hover:bg-amber-50"
                          onClick={() => resetToDraft.mutate(pack.id)} title="Remettre en brouillon">
                          <RotateCcw className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
};

/* ════════════════════════════════════════════════════
   COMPOSANT PRINCIPAL
════════════════════════════════════════════════════ */
const StickersManagement: React.FC = () => {
  const { data: packQueue } = useStickerModerationQueue();
  const { data: stickerQueue } = usePendingStickersModeration();
  const packPendingCount = packQueue?.length ?? 0;
  const stickerPendingCount = stickerQueue?.length ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Gestion des Stickers</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Valider les nouveaux packs, approuver les stickers ajoutés aux packs existants, gérer l'ensemble du catalogue.
        </p>
      </div>

      <Tabs defaultValue="packs">
        <TabsList className="mb-4">
          <TabsTrigger value="packs" className="flex items-center gap-2">
            Nouveaux packs
            {packPendingCount > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 text-[11px] font-bold rounded-full bg-amber-500 text-white">
                {packPendingCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="stickers" className="flex items-center gap-2">
            Nouveaux stickers
            {stickerPendingCount > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 text-[11px] font-bold rounded-full bg-amber-500 text-white">
                {stickerPendingCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="all" className="flex items-center gap-2">
            <Eye className="w-4 h-4" /> Tous les packs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="packs">
          <div className="mb-3 rounded-xl bg-slate-50 border px-4 py-3 text-sm text-slate-700">
            <strong>Nouveaux packs</strong> — soumis pour la première fois par un créateur. Approuver un pack approuve automatiquement tous ses stickers actuels.
          </div>
          <PackModerationQueue />
        </TabsContent>

        <TabsContent value="stickers">
          <div className="mb-3 rounded-xl bg-slate-50 border px-4 py-3 text-sm text-slate-700">
            <strong>Nouveaux stickers</strong> — ajoutés par des créateurs à leurs packs déjà approuvés. Chaque sticker est validé individuellement.
          </div>
          <StickerModerationQueue />
        </TabsContent>

        <TabsContent value="all">
          <AllPacksTable />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StickersManagement;
