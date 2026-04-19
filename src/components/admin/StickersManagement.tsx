/**
 * Admin — Gestion complète des stickers
 * - Onglet "En attente" : file de modération (approuver / rejeter)
 * - Onglet "Tous les packs" : vue globale avec remise en brouillon
 */
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Loader2,
  Sparkles,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Eye,
  AlertCircle,
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useReviewStickerPack } from '@/stickers/hooks/useStickerMutations';
import { useStickerModerationQueue } from '@/stickers/hooks/useStickerPacks';

const db = supabase as any;

/* ── Status badge helper ── */
const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: 'Brouillon', color: 'bg-slate-100 text-slate-700' },
  pending_review: { label: 'En attente', color: 'bg-amber-100 text-amber-700' },
  approved: { label: 'Approuvé', color: 'bg-emerald-100 text-emerald-700' },
  rejected: { label: 'Rejeté', color: 'bg-rose-100 text-rose-700' },
};

const StatusBadge = ({ status }: { status: string }) => {
  const s = STATUS_LABELS[status] ?? { label: status, color: 'bg-slate-100 text-slate-600' };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${s.color}`}>
      {s.label}
    </span>
  );
};

/* ── All-packs query (admin only — RLS allows it) ── */
const useAllStickerPacks = () =>
  useQuery({
    queryKey: ['admin-all-sticker-packs'],
    queryFn: async () => {
      const { data, error } = await db
        .from('sticker_packs')
        .select(`*, profiles:creator_id (first_name, last_name, username, avatar_url), stickers (id)`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

/* ── Reset pack to draft mutation (admin only) ── */
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
      toast.success('Pack remis en brouillon — le créateur peut à nouveau l\'éditer.');
    },
    onError: (e: any) => toast.error(e?.message || 'Erreur lors de la remise en brouillon'),
  });
};

/* ════════════════════════════════════════════════════
   SUB-COMPONENT: Moderation queue (pending_review)
════════════════════════════════════════════════════ */
const ModerationQueue: React.FC = () => {
  const { data: queue, isLoading } = useStickerModerationQueue();
  const review = useReviewStickerPack();
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!queue?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground text-center">
        <Sparkles className="w-10 h-10 mb-3 opacity-40" />
        <p className="font-medium">Aucun pack en attente de modération.</p>
        <p className="text-sm mt-1">Les nouvelles soumissions apparaîtront ici.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {(queue as any[]).map((pack) => (
        <div key={pack.id} className="bg-card border rounded-2xl p-5 shadow-sm">
          {/* Pack header */}
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center overflow-hidden shrink-0 border">
              {pack.icon_url ? (
                <img src={pack.icon_url} alt={pack.name} className="w-full h-full object-cover" />
              ) : (
                <Sparkles className="w-7 h-7 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-base">{pack.name}</h3>
                <StatusBadge status={pack.status} />
              </div>
              {pack.description && (
                <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">{pack.description}</p>
              )}
              <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                <span>
                  Créateur :{' '}
                  <span className="font-medium text-slate-700">
                    {pack.profiles?.first_name || pack.profiles?.username || 'Inconnu'}
                  </span>
                </span>
                <span>{pack.stickers?.length ?? 0} sticker(s)</span>
                <span>{pack.price_sc > 0 ? `${pack.price_sc} SC` : 'Gratuit'}</span>
                {pack.submitted_at && (
                  <span>
                    Soumis le{' '}
                    {new Date(pack.submitted_at).toLocaleDateString('fr-FR', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Sticker preview */}
          {pack.stickers?.length > 0 && (
            <div className="grid grid-cols-6 gap-2 mt-4">
              {pack.stickers.slice(0, 6).map((s: any) => (
                <div key={s.id} className="aspect-square rounded-lg bg-muted overflow-hidden border">
                  <img src={s.file_url} alt="" className="w-full h-full object-contain" />
                </div>
              ))}
              {pack.stickers.length > 6 && (
                <div className="aspect-square rounded-lg bg-slate-100 border flex items-center justify-center text-xs text-slate-500 font-medium">
                  +{pack.stickers.length - 6}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          {rejectingId === pack.id ? (
            <div className="mt-4 space-y-2">
              <Textarea
                placeholder="Raison du rejet (visible par le créateur)…"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
              />
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={!reason.trim() || review.isPending}
                  onClick={() =>
                    review.mutate(
                      { packId: pack.id, decision: 'reject', reason },
                      {
                        onSuccess: () => {
                          setRejectingId(null);
                          setReason('');
                        },
                      },
                    )
                  }
                >
                  {review.isPending && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                  Confirmer le rejet
                </Button>
                <Button variant="outline" size="sm" onClick={() => { setRejectingId(null); setReason(''); }}>
                  Annuler
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2 mt-4">
              <Button
                size="sm"
                disabled={review.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => review.mutate({ packId: pack.id, decision: 'approve' })}
              >
                {review.isPending ? (
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                )}
                Approuver
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={review.isPending}
                onClick={() => setRejectingId(pack.id)}
              >
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
   SUB-COMPONENT: All packs table
════════════════════════════════════════════════════ */
const AllPacksTable: React.FC = () => {
  const { data: packs, isLoading } = useAllStickerPacks();
  const resetToDraft = useResetPackToDraft();
  const review = useReviewStickerPack();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!packs?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground text-center">
        <Sparkles className="w-10 h-10 mb-3 opacity-40" />
        <p className="font-medium">Aucun pack de stickers pour l'instant.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 border-b">
          <tr>
            <th className="text-left px-4 py-3 font-semibold text-slate-600">Pack</th>
            <th className="text-left px-4 py-3 font-semibold text-slate-600">Créateur</th>
            <th className="text-center px-4 py-3 font-semibold text-slate-600">Stickers</th>
            <th className="text-center px-4 py-3 font-semibold text-slate-600">Prix</th>
            <th className="text-center px-4 py-3 font-semibold text-slate-600">Statut</th>
            <th className="text-right px-4 py-3 font-semibold text-slate-600">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {(packs as any[]).map((pack) => (
            <tr key={pack.id} className="hover:bg-slate-50 transition-colors">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-muted overflow-hidden border flex items-center justify-center shrink-0">
                    {pack.icon_url ? (
                      <img src={pack.icon_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Sparkles className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">{pack.name}</p>
                    {pack.description && (
                      <p className="text-xs text-slate-500 line-clamp-1">{pack.description}</p>
                    )}
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 text-slate-600">
                {pack.profiles?.first_name || pack.profiles?.username || '—'}
              </td>
              <td className="px-4 py-3 text-center text-slate-600">{pack.stickers?.length ?? 0}</td>
              <td className="px-4 py-3 text-center text-slate-600">
                {pack.price_sc > 0 ? `${pack.price_sc} SC` : 'Gratuit'}
              </td>
              <td className="px-4 py-3 text-center">
                <StatusBadge status={pack.status ?? 'draft'} />
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-2">
                  {/* Approve if pending */}
                  {pack.status === 'pending_review' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={review.isPending}
                      className="text-emerald-700 hover:bg-emerald-50"
                      onClick={() => review.mutate({ packId: pack.id, decision: 'approve' })}
                      title="Approuver"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </Button>
                  )}
                  {/* Reset to draft if not already draft */}
                  {pack.status !== 'draft' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={resetToDraft.isPending}
                      className="text-amber-700 hover:bg-amber-50"
                      onClick={() => resetToDraft.mutate(pack.id)}
                      title="Remettre en brouillon (permet au créateur d'éditer)"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/* ════════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════════ */
const StickersManagement: React.FC = () => {
  const { data: queue } = useStickerModerationQueue();
  const pendingCount = queue?.length ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Gestion des Stickers</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Modérer les soumissions de packs et gérer tous les packs existants.
        </p>
      </div>

      <Tabs defaultValue="moderation">
        <TabsList className="mb-4">
          <TabsTrigger value="moderation" className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            En attente
            {pendingCount > 0 && (
              <span className="ml-1 inline-flex items-center justify-center w-5 h-5 text-[11px] font-bold rounded-full bg-amber-500 text-white">
                {pendingCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="all" className="flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Tous les packs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="moderation">
          <ModerationQueue />
        </TabsContent>

        <TabsContent value="all">
          <div className="mb-3 rounded-xl bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>
              <strong>Remettre en brouillon</strong> (icône <RotateCcw className="w-3 h-3 inline" />) permet au créateur de modifier son pack et d'y ajouter des stickers.
            </span>
          </div>
          <AllPacksTable />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StickersManagement;
