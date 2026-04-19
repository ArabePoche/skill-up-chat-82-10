/**
 * Page admin : file d'attente de modération des packs de stickers.
 * Permet d'approuver ou rejeter (avec raison) chaque pack en attente.
 */
import React, { useState } from 'react';
import { useStickerModerationQueue } from '@/stickers/hooks/useStickerPacks';
import { useReviewStickerPack } from '@/stickers/hooks/useStickerMutations';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, CheckCircle2, XCircle, Sparkles } from 'lucide-react';

const StickerModerationQueue: React.FC = () => {
  const { data: queue, isLoading } = useStickerModerationQueue();
  const review = useReviewStickerPack();
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!queue?.length) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Sparkles className="w-10 h-10 mx-auto mb-2 opacity-50" />
        <p>Aucun pack en attente de modération.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {(queue as any[]).map((pack) => (
        <div key={pack.id} className="bg-card border rounded-2xl p-4 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center overflow-hidden shrink-0">
              {pack.icon_url ? (
                <img src={pack.icon_url} alt={pack.name} className="w-full h-full object-cover" />
              ) : (
                <Sparkles className="w-6 h-6 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold">{pack.name}</h3>
              {pack.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">{pack.description}</p>
              )}
              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                <span>
                  Par{' '}
                  {pack.profiles?.first_name ||
                    pack.profiles?.username ||
                    'Inconnu'}
                </span>
                <span>{pack.stickers?.length ?? 0} sticker(s)</span>
                <span>{pack.price_sc > 0 ? `${pack.price_sc} SC` : 'Gratuit'}</span>
              </div>
            </div>
          </div>

          {/* Aperçu rapide des stickers */}
          {pack.stickers?.length > 0 && (
            <div className="grid grid-cols-6 gap-2 mt-4">
              {pack.stickers.slice(0, 6).map((s: any) => (
                <div
                  key={s.id}
                  className="aspect-square rounded-lg bg-muted overflow-hidden border"
                >
                  <img src={s.file_url} alt="" className="w-full h-full object-contain" />
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          {rejectingId === pack.id ? (
            <div className="mt-4 space-y-2">
              <Textarea
                placeholder="Raison du rejet (visible par le créateur)"
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
                  Confirmer le rejet
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setRejectingId(null);
                    setReason('');
                  }}
                >
                  Annuler
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2 mt-4">
              <Button
                size="sm"
                disabled={review.isPending}
                onClick={() =>
                  review.mutate({ packId: pack.id, decision: 'approve' })
                }
              >
                <CheckCircle2 className="w-4 h-4 mr-1.5" /> Approuver
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={review.isPending}
                onClick={() => setRejectingId(pack.id)}
              >
                <XCircle className="w-4 h-4 mr-1.5" /> Rejeter
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default StickerModerationQueue;
