import React, { useState, useRef, useCallback, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import VerificationRequiredDialog from '@/verification/components/VerificationRequiredDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  ImagePlus, PackagePlus, ArrowLeft, Trash2, Save, UploadCloud,
  CheckCircle2, Loader2, Send, Clock3, AlertCircle, Sparkles, Coins,
  Lock, Globe,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  useCreatorStickerPacks,
  useSaveStickerPack,
  useStickersForPack,
  useUploadStickerImage,
  useUploadStickerPackIcon,
  useSubmitPackForReview,
  StickerPackData,
} from '@/hooks/useStickerSystem';
import { useSignedStickerUrls } from '@/stickers/hooks/useSignedStickerUrls';
import { toast } from 'sonner';
import StickerEditorModal from '@/stickers/components/StickerEditorModal';

/* ─── Suppression de fond via @imgly/background-removal ─── */
async function removeBg(file: File): Promise<File> {
  const { removeBackground } = await import('@imgly/background-removal');
  const blob = await removeBackground(file, {
    publicPath: 'https://staticimgly.com/@imgly/background-removal-data/1.7.0/dist/',
    model: 'small',
    output: { format: 'image/png', quality: 0.9 },
    debug: false,
    proxyToWorker: false,
    fetchArgs: { cache: 'force-cache' },
  } as any);
  return new File([blob], file.name.replace(/\.[^.]+$/, '.png'), { type: 'image/png' });
}

/* ─── Marqueur de pack personnel stocké localement ─── */
const PERSONAL_KEY = (userId: string) => `personal_packs_${userId}`;

const getPersonalIds = (userId: string): Set<string> => {
  try {
    const raw = localStorage.getItem(PERSONAL_KEY(userId));
    return new Set(raw ? JSON.parse(raw) : []);
  } catch { return new Set(); }
};

const addPersonalId = (userId: string, packId: string) => {
  try {
    const set = getPersonalIds(userId);
    set.add(packId);
    localStorage.setItem(PERSONAL_KEY(userId), JSON.stringify([...set]));
  } catch { /* ignore */ }
};

/* ─────────────────────────────────────────── */

const StickerStudio = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [activePackId, setActivePackId] = useState<string | null>(null);

  const { data: packs, isLoading: loadingPacks } = useCreatorStickerPacks();
  const { data: activeStickers, isLoading: loadingStickers } = useStickersForPack(activePackId);

  const activeStickerPaths = useMemo(
    () => (activeStickers || []).map((s: any) => s.file_path).filter(Boolean) as string[],
    [activeStickers],
  );
  const { data: stickerSignedMap = {} } = useSignedStickerUrls(activeStickerPaths);

  const savePack       = useSaveStickerPack();
  const uploadSticker  = useUploadStickerImage();
  const uploadPackIcon = useUploadStickerPackIcon();
  const submitForReview = useSubmitPackForReview();

  const [editForm, setEditForm] = useState<Partial<StickerPackData>>({});
  const [isPersonalMode, setIsPersonalMode] = useState(false);
  const [showVerifDialog, setShowVerifDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const iconInputRef = useRef<HTMLInputElement>(null);
  const [iconDropActive, setIconDropActive] = useState(false);

  /* ── éditeur de sticker ── */
  const [fileQueue,       setFileQueue]       = useState<File[]>([]);
  const [editingFile,     setEditingFile]     = useState<File | null>(null);
  const [uploadProgress,  setUploadProgress]  = useState<{ done: number; total: number } | null>(null);

  /* Détermine si le pack actif est personnel */
  const isActivePersName = useMemo(() => {
    if (!user || !activePackId || activePackId === 'new') return isPersonalMode;
    return getPersonalIds(user.id).has(activePackId) || isPersonalMode;
  }, [user, activePackId, isPersonalMode]);

  const processPackIconFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith('image/')) return;
      uploadPackIcon.mutate(
        { file, packId: activePackId },
        {
          onSuccess: ({ publicUrl }) => {
            setEditForm((prev) => {
              const next = { ...prev, icon_url: publicUrl };
              if (activePackId && activePackId !== 'new') {
                queueMicrotask(() => savePack.mutate({ ...next, id: activePackId }));
              }
              return next;
            });
          },
        },
      );
    },
    [activePackId, savePack, uploadPackIcon],
  );

  const handleCreateNewPack = () => {
    setActivePackId('new');
    setIsPersonalMode(false);
    setEditForm({ name: 'Mon Pack', description: '', price_sc: 0, price_sb: 0 });
  };

  const handleSelectPack = (pack: StickerPackData) => {
    setActivePackId(pack.id);
    setEditForm(pack);
    if (user) setIsPersonalMode(getPersonalIds(user.id).has(pack.id));
  };

  const handleSaveForm = () => {
    if (!editForm.name) return;
    savePack.mutate(editForm, {
      onSuccess: (data) => {
        if (activePackId === 'new') {
          setActivePackId(data.id);
          setEditForm(data);
          /* si mode personnel, enregistre l'id */
          if (isPersonalMode && user) {
            addPersonalId(user.id, data.id);
            toast.success('Pack personnel créé — visible immédiatement dans le chat !');
          }
        }
      },
    });
  };

  /* Ouvre l'éditeur pour chaque fichier sélectionné */
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !activePackId || activePackId === 'new') return;
    const files = Array.from(e.target.files);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (files.length === 0) return;
    setFileQueue(files.slice(1));
    setEditingFile(files[0]);
    setUploadProgress({ done: 0, total: files.length });
  };

  /* Quand l'utilisateur confirme un sticker dans l'éditeur */
  const handleEditorConfirm = useCallback((processedFile: File) => {
    if (!activePackId || activePackId === 'new') return;
    const total = uploadProgress?.total ?? 1;
    const done  = (uploadProgress?.done ?? 0) + 1;

    uploadSticker.mutate(
      { file: processedFile, packId: activePackId },
      {
        onSuccess: () => {
          setUploadProgress({ done, total });
          if (fileQueue.length > 0) {
            setEditingFile(fileQueue[0]);
            setFileQueue((q) => q.slice(1));
          } else {
            setEditingFile(null);
            setUploadProgress(null);
            toast.success(`${total} sticker${total > 1 ? 's' : ''} ajouté${total > 1 ? 's' : ''} !`);
          }
        },
        onError: (err: any) => {
          toast.error(`Échec upload: ${err?.message ?? 'erreur'}`);
          if (fileQueue.length > 0) {
            setEditingFile(fileQueue[0]);
            setFileQueue((q) => q.slice(1));
          } else {
            setEditingFile(null);
            setUploadProgress(null);
          }
        },
      },
    );
  }, [activePackId, fileQueue, uploadProgress, uploadSticker]);

  const handleEditorCancel = useCallback(() => {
    if (fileQueue.length > 0) {
      setEditingFile(fileQueue[0]);
      setFileQueue((q) => q.slice(1));
    } else {
      setEditingFile(null);
      setUploadProgress(null);
    }
  }, [fileQueue]);

  const isUploading = uploadSticker.isPending || editingFile !== null;

  /* ── Garde ── */
  if (loading || loadingPacks) {
    return (
      <div className="p-8 text-center flex h-screen items-center justify-center">
        Chargement du studio...
      </div>
    );
  }

  /* ── Rendu ── */
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-24">
      <header className="bg-white border-b px-4 py-3 sticky top-0 z-10 flex items-center gap-3 shadow-sm">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="shrink-0">
          <ArrowLeft className="h-5 w-5 text-slate-600" />
        </Button>
        <div>
          <h1 className="font-bold sm:text-lg text-slate-800 leading-tight">Studio de Stickers</h1>
          <p className="text-xs text-slate-500">Créez vos propres stickers</p>
        </div>
      </header>

      <main className="flex-1 p-4 max-w-6xl mx-auto w-full flex flex-col md:flex-row gap-6 mt-4">

        {/* ── Colonne gauche : Mes Packs ── */}
        <div className="w-full md:w-1/3 flex flex-col gap-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-2xl border shadow-sm">
            <div>
              <h2 className="font-semibold text-slate-800">Mes Créations</h2>
              <p className="text-xs text-slate-500">{packs?.length || 0} pack(s)</p>
            </div>
            <Button
              size="sm"
              className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl shadow-sm"
              onClick={handleCreateNewPack}
            >
              <PackagePlus className="h-4 w-4 mr-1.5" /> Nouveau
            </Button>
          </div>

          <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto pr-1">
            {packs?.length === 0 && activePackId !== 'new' && (
              <div className="bg-white/50 border border-slate-200 border-dashed rounded-2xl p-8 text-center text-slate-500">
                <PackagePlus className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                <p className="text-sm">Aucun pack existant</p>
              </div>
            )}

            {activePackId === 'new' && (
              <div className="bg-violet-50 border border-violet-200 rounded-xl p-3 flex items-center gap-3 ring-2 ring-violet-500/20">
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shrink-0 border border-violet-100">
                  <PackagePlus className="h-5 w-5 text-violet-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-violet-900 truncate">Création en cours…</p>
                </div>
              </div>
            )}

            {packs?.map((pack) => {
              const isPersonal = user ? getPersonalIds(user.id).has(pack.id) : false;
              return (
                <button
                  key={pack.id}
                  onClick={() => handleSelectPack(pack)}
                  className={`text-left rounded-xl p-3 flex items-center gap-3 transition-all ${
                    activePackId === pack.id
                      ? 'bg-violet-50 border-violet-200 ring-2 ring-violet-500/20 shadow-sm border'
                      : 'bg-white border-slate-100 shadow-sm border hover:border-violet-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="w-12 h-12 bg-slate-100 rounded-xl shrink-0 flex items-center justify-center overflow-hidden border">
                    {pack.icon_url
                      ? <img src={pack.icon_url} alt="Icon" className="w-full h-full object-cover" />
                      : <PackagePlus className="h-5 w-5 text-slate-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-slate-800 truncate">{pack.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {isPersonal ? (
                        <>
                          <Lock className="h-2.5 w-2.5 text-violet-500" />
                          <p className="text-[11px] text-violet-600 font-medium">Personnel</p>
                        </>
                      ) : (
                        <>
                          <span className={`w-2 h-2 rounded-full ${
                            pack.status === 'approved' ? 'bg-emerald-500' :
                            pack.status === 'pending_review' ? 'bg-amber-400' :
                            pack.status === 'rejected' ? 'bg-rose-500' : 'bg-slate-300'
                          }`} />
                          <p className="text-[11px] text-slate-500 capitalize">
                            {pack.status === 'approved' ? 'Approuvé' :
                             pack.status === 'pending_review' ? 'En révision' :
                             pack.status === 'rejected' ? 'Rejeté' : 'Brouillon'}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Colonne droite : Détail du pack ── */}
        <div className="w-full md:w-2/3 flex flex-col gap-4">
          {!activePackId ? (
            <div className="bg-slate-100/50 rounded-3xl border-2 border-dashed border-slate-200 h-[60vh] flex items-center justify-center text-slate-400 p-8 text-center flex-col gap-3">
              <ImagePlus className="h-14 w-14 text-slate-300" />
              <p className="text-sm font-medium">Sélectionnez ou créez un pack pour commencer.</p>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full min-h-[60vh]">

              {/* ── Paramètres du pack ── */}
              <div className="p-6 border-b bg-slate-50/50 space-y-4">

                {/* Toggle Personnel / Public — uniquement à la création */}
                {activePackId === 'new' && (
                  <div className="flex gap-2 p-1 bg-slate-100 rounded-xl w-full">
                    <button
                      type="button"
                      onClick={() => setIsPersonalMode(true)}
                      className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-all ${
                        isPersonalMode
                          ? 'bg-white shadow-sm text-violet-700 ring-1 ring-violet-200'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      <Lock className="h-3.5 w-3.5" />
                      Personnel
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsPersonalMode(false)}
                      className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-all ${
                        !isPersonalMode
                          ? 'bg-white shadow-sm text-violet-700 ring-1 ring-violet-200'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      <Globe className="h-3.5 w-3.5" />
                      Public
                    </button>
                  </div>
                )}

                {/* Explication du mode */}
                {activePackId === 'new' && isPersonalMode && (
                  <div className="flex items-start gap-2.5 rounded-xl bg-violet-50 border border-violet-200 px-4 py-3 text-sm text-violet-800">
                    <Lock className="h-4 w-4 mt-0.5 shrink-0 text-violet-500" />
                    <span>Pack <strong>personnel</strong> — visible uniquement par vous dans votre chat, sans validation admin.</span>
                  </div>
                )}
                {activePackId === 'new' && !isPersonalMode && (
                  <div className="flex items-start gap-2.5 rounded-xl bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-800">
                    <Globe className="h-4 w-4 mt-0.5 shrink-0 text-blue-500" />
                    <span>Pack <strong>public</strong> — soumis à validation admin avant d'être vendu dans la boutique.</span>
                  </div>
                )}

                {/* Nom */}
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Nom du pack</Label>
                  <Input
                    value={editForm.name || ''}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="text-base font-bold bg-white"
                    placeholder="Nom de votre pack…"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Description</Label>
                  <Textarea
                    value={(editForm as any).description || ''}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    className="bg-white resize-none text-sm"
                    placeholder="Décrivez votre pack de stickers…"
                    rows={2}
                  />
                </div>

                {/* Prix — uniquement pour les packs publics */}
                {!isActivePersName && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide flex items-center gap-1">
                        <Coins className="h-3 w-3 text-violet-500" /> Prix (SC)
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        value={(editForm as any).price_sc ?? 0}
                        onChange={(e) =>
                          setEditForm({ ...editForm, price_sc: Math.max(0, parseInt(e.target.value) || 0) } as any)
                        }
                        className="bg-white"
                        placeholder="0 = Gratuit"
                      />
                      <p className="text-[10px] text-slate-400">Soumboulah Cash — 0 = Gratuit</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide flex items-center gap-1">
                        <Coins className="h-3 w-3 text-amber-500" /> Prix (SB)
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        value={(editForm as any).price_sb ?? 0}
                        onChange={(e) =>
                          setEditForm({ ...editForm, price_sb: Math.max(0, parseInt(e.target.value) || 0) } as any)
                        }
                        className="bg-white"
                        placeholder="0"
                      />
                      <p className="text-[10px] text-slate-400">Soumboulah Bonus optionnel</p>
                    </div>
                  </div>
                )}

                {/* Icône + Bouton Enregistrer */}
                <div className="flex flex-col sm:flex-row gap-3 items-stretch">
                  <div
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        iconInputRef.current?.click();
                      }
                    }}
                    onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIconDropActive(true); }}
                    onDragOver={(e)  => { e.preventDefault(); e.stopPropagation(); setIconDropActive(true); }}
                    onDragLeave={(e) => {
                      e.preventDefault(); e.stopPropagation();
                      if (!e.currentTarget.contains(e.relatedTarget as Node)) setIconDropActive(false);
                    }}
                    onDrop={(e) => {
                      e.preventDefault(); e.stopPropagation(); setIconDropActive(false);
                      const f = e.dataTransfer.files?.[0];
                      if (f) processPackIconFile(f);
                    }}
                    onClick={() => !uploadPackIcon.isPending && iconInputRef.current?.click()}
                    className={`relative flex min-h-[90px] flex-1 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed bg-white px-4 py-3 text-center transition-colors ${
                      iconDropActive
                        ? 'border-violet-500 bg-violet-50/80'
                        : 'border-slate-200 hover:border-violet-300 hover:bg-slate-50/80'
                    } ${uploadPackIcon.isPending ? 'pointer-events-none opacity-70' : ''}`}
                  >
                    <input
                      ref={iconInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                      className="sr-only"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) processPackIconFile(f);
                        e.target.value = '';
                      }}
                    />
                    {uploadPackIcon.isPending ? (
                      <Loader2 className="h-7 w-7 animate-spin text-violet-600" />
                    ) : editForm.icon_url ? (
                      <img
                        src={editForm.icon_url}
                        alt=""
                        className="max-h-16 w-auto max-w-[100px] rounded-lg object-contain shadow-sm"
                      />
                    ) : (
                      <ImagePlus className="h-7 w-7 text-slate-300" />
                    )}
                    <p className="text-xs font-medium text-slate-500">
                      {editForm.icon_url ? "Remplacer l'icône" : "Icône du pack"}
                    </p>
                  </div>

                  <Button
                    onClick={handleSaveForm}
                    disabled={savePack.isPending || uploadPackIcon.isPending}
                    className="shrink-0 bg-slate-800 hover:bg-slate-900 rounded-xl px-6 self-stretch sm:self-auto"
                  >
                    {savePack.isPending
                      ? <PackagePlus className="h-4 w-4 mr-2 animate-pulse" />
                      : <Save className="h-4 w-4 mr-2" />}
                    {activePackId === 'new' ? 'Créer le pack' : 'Enregistrer'}
                  </Button>
                </div>

                {/* ── Statut + soumission / badge personnel ── */}
                {activePackId !== 'new' && (
                  <div className="flex items-center justify-between gap-3 pt-3 border-t flex-wrap">
                    <div className="flex items-center gap-2 text-xs">
                      {isActivePersName ? (
                        <span className="flex items-center gap-1 bg-violet-100 text-violet-700 px-2.5 py-1 rounded-full font-medium">
                          <Lock className="h-3 w-3" /> Pack personnel — disponible dans votre chat
                        </span>
                      ) : (editForm as any).status === 'approved' ? (
                        <span className="flex items-center gap-1 bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full font-medium">
                          <CheckCircle2 className="h-3 w-3" /> Approuvé — public
                        </span>
                      ) : (editForm as any).status === 'pending_review' ? (
                        <span className="flex items-center gap-1 bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full font-medium">
                          <Clock3 className="h-3 w-3" /> En attente de validation
                        </span>
                      ) : (editForm as any).status === 'rejected' ? (
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1 bg-rose-100 text-rose-700 px-2.5 py-1 rounded-full font-medium">
                            <AlertCircle className="h-3 w-3" /> Rejeté
                          </span>
                          {(editForm as any).rejection_reason && (
                            <span className="text-rose-700 text-[11px]">
                              {(editForm as any).rejection_reason}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="flex items-center gap-1 bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full font-medium">
                          Brouillon
                        </span>
                      )}
                    </div>

                    {/* Bouton soumettre — uniquement pour packs publics en draft/rejected */}
                    {!isActivePersName &&
                      ['draft', 'rejected', undefined].includes((editForm as any).status) && (
                        <>
                          {profile?.is_verified ? (
                            <Button
                              size="sm"
                              disabled={submitForReview.isPending || !activeStickers?.length}
                              onClick={() => activePackId && submitForReview.mutate(activePackId)}
                              className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl"
                            >
                              {submitForReview.isPending
                                ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                                : <Send className="h-4 w-4 mr-1.5" />}
                              Soumettre à validation
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-xl gap-1.5"
                              onClick={() => setShowVerifDialog(true)}
                            >
                              <Send className="h-4 w-4" />
                              Publier (vérification requise)
                            </Button>
                          )}
                        </>
                      )}
                  </div>
                )}
              </div>

              {/* ── Zone stickers ── */}
              {activePackId !== 'new' ? (
                <div className="p-6 flex-1 bg-white">
                  {/* Bandeaux d'état */}
                  {isActivePersName && (
                    <div className="mb-4 flex items-start gap-2.5 rounded-xl bg-violet-50 border border-violet-200 px-4 py-3 text-sm text-violet-800">
                      <Lock className="h-4 w-4 mt-0.5 shrink-0 text-violet-500" />
                      <span>
                        Pack <strong>personnel</strong> — vos stickers sont <strong>immédiatement disponibles</strong>{' '}
                        dans votre chat dès l'ajout.
                      </span>
                    </div>
                  )}
                  {!isActivePersName && (editForm as any).status === 'pending_review' && (
                    <div className="mb-4 flex items-start gap-2.5 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
                      <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                      <span>Pack en <strong>attente de validation</strong>.</span>
                    </div>
                  )}
                  {!isActivePersName && (editForm as any).status === 'approved' && (
                    <div className="mb-4 flex items-start gap-2.5 rounded-xl bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-800">
                      <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-blue-600" />
                      <span>Pack public. Les nouveaux stickers seront <strong>validés individuellement</strong>.</span>
                    </div>
                  )}

                  {/* Bandeau info éditeur */}
                  <div className="mb-4 flex items-start gap-2.5 rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-sm text-slate-700">
                    <Sparkles className="h-4 w-4 mt-0.5 shrink-0 text-violet-500" />
                    <span>Un <strong>éditeur</strong> s'ouvre pour chaque image — supprimez le fond, dessinez ou ajoutez du texte.</span>
                  </div>

                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-slate-800">
                      Contenu du pack ({activeStickers?.length || 0})
                    </h3>
                    <div className="relative">
                      <Input
                        type="file"
                        ref={fileInputRef}
                        multiple
                        accept="image/png,image/jpeg,image/gif,image/webp"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        onChange={handleFileUpload}
                        disabled={isUploading}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 pointer-events-none"
                        disabled={isUploading}
                      >
                        {uploadSticker.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 text-violet-600 animate-spin" />
                            {uploadProgress
                              ? `Upload ${uploadProgress.done + 1}/${uploadProgress.total}…`
                              : 'Upload en cours…'}
                          </>
                        ) : (
                          <>
                            <UploadCloud className="h-4 w-4 text-violet-600" />
                            Ajouter des stickers
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {loadingStickers ? (
                    <div className="py-12 text-center text-sm text-slate-500">Chargement des stickers…</div>
                  ) : activeStickers?.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 text-slate-400 bg-slate-50 border border-slate-100 rounded-xl border-dashed">
                      <ImagePlus className="h-10 w-10 mb-3 text-slate-300" />
                      <p className="text-sm">Aucun sticker pour l'instant.</p>
                      <p className="text-xs mt-1 text-center">PNG, JPG ou WebP.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                      {activeStickers?.map((sticker) => {
                        const stickerStatus = (sticker as any).status;
                        const isPersonalPack = isActivePersName;
                        return (
                          <div
                            key={sticker.id}
                            className={`aspect-square rounded-xl border p-2 relative group transition-colors shadow-sm ${
                              isPersonalPack
                                ? 'border-violet-100 bg-[image:repeating-conic-gradient(#e5e7eb_0%_25%,white_0%_50%)] bg-[length:16px_16px] hover:border-violet-200'
                                : stickerStatus === 'pending_review'
                                  ? 'border-amber-200 bg-amber-50/40'
                                  : stickerStatus === 'rejected'
                                    ? 'border-rose-200 bg-rose-50/40'
                                    : 'border-slate-100 bg-[image:repeating-conic-gradient(#e5e7eb_0%_25%,white_0%_50%)] bg-[length:16px_16px] hover:border-violet-200'
                            }`}
                          >
                            <img
                              src={
                                (sticker.file_path && stickerSignedMap[sticker.file_path]) ||
                                sticker.file_url
                              }
                              className="w-full h-full object-contain drop-shadow-sm"
                              alt="Sticker"
                              loading="lazy"
                            />
                            {/* Badges statut (uniquement packs publics) */}
                            {!isPersonalPack && stickerStatus === 'pending_review' && (
                              <span className="absolute bottom-1 left-1 bg-amber-500 text-white text-[8px] px-1.5 py-0.5 rounded font-bold uppercase leading-none">
                                Attente
                              </span>
                            )}
                            {!isPersonalPack && stickerStatus === 'rejected' && (
                              <span className="absolute bottom-1 left-1 bg-rose-500 text-white text-[8px] px-1.5 py-0.5 rounded font-bold uppercase leading-none">
                                Rejeté
                              </span>
                            )}
                            {sticker.is_animated && (
                              <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded uppercase font-bold tracking-widest backdrop-blur-sm">
                                GIF
                              </span>
                            )}
                            <button
                              className="absolute top-1 right-1 bg-red-100 text-red-600 p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-200 shadow-sm"
                              title="Supprimer"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
                  <p className="text-sm text-slate-500">Enregistrez le pack pour y ajouter des stickers.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* ── Éditeur de sticker ── */}
      {editingFile && (
        <StickerEditorModal
          file={editingFile}
          removeBg={removeBg}
          onConfirm={handleEditorConfirm}
          onCancel={handleEditorCancel}
        />
      )}

      {/* ── Dialogue vérification requise pour publier ── */}
      <VerificationRequiredDialog
        open={showVerifDialog}
        onOpenChange={setShowVerifDialog}
        featureName="Publication de pack public"
      />
    </div>
  );
};

export default StickerStudio;
