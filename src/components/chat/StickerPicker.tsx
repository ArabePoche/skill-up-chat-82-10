/**
 * StickerPicker — Sélecteur de stickers style WhatsApp
 *
 * Structure :
 *  1. Barre d'icônes de packs (sticky, scroll horizontal)
 *  2. Liste verticale unifiée des stickers groupés par pack
 *  3. IntersectionObserver : scroll ↔ pack actif synchronisés
 */
import React, {
  useRef, useEffect, useMemo, useState, useCallback,
} from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { PackagePlus, ShoppingBag } from 'lucide-react';
import StickerShopModal from '@/stickers/components/StickerShopModal';
import { useUserUnlockedPacks } from '@/hooks/useStickerSystem';
import { useSignedStickerUrls } from '@/stickers/hooks/useSignedStickerUrls';

/* ── Types ── */
interface StickerPickerProps {
  onStickerSelect: (url: string) => void;
  isOpen: boolean;
  onToggle: () => void;
  className?: string;
}

interface Sticker {
  id: string;
  url: string;
  path: string | null;
}

interface StickerPack {
  id: string;
  name: string;
  iconUrl: string | null;
  color: string;
  stickers: Sticker[];
}

/* ── Palette de couleurs pour les séparateurs ── */
const GRADIENT_PALETTE = [
  'from-amber-400 to-orange-500',
  'from-sky-400 to-indigo-500',
  'from-fuchsia-400 to-pink-500',
  'from-emerald-400 to-teal-500',
  'from-violet-400 to-purple-500',
  'from-rose-400 to-red-500',
];

/* ── Icône d'un pack dans la barre supérieure ── */
const PackIcon: React.FC<{ pack: StickerPack; active: boolean; onClick: () => void }> = ({
  pack, active, onClick,
}) => (
  <button
    type="button"
    onClick={onClick}
    title={pack.name}
    className={`
      flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200
      ${active
        ? 'bg-violet-100 ring-2 ring-violet-400/50 scale-110 shadow-sm'
        : 'hover:bg-slate-100 hover:scale-105 opacity-70 hover:opacity-100'
      }
    `}
  >
    {pack.iconUrl ? (
      <img
        src={pack.iconUrl}
        alt={pack.name}
        className="w-7 h-7 object-contain rounded-lg"
        loading="lazy"
      />
    ) : (
      <span className="text-xl">🎨</span>
    )}
  </button>
);

/* ══════════════════════════════════════════════ */

const StickerPicker: React.FC<StickerPickerProps> = ({
  onStickerSelect, isOpen, onToggle, className,
}) => {
  const navigate   = useNavigate();
  const { data: unlockedPacks = [] } = useUserUnlockedPacks();
  const [shopOpen, setShopOpen]      = useState(false);
  const [activePack, setActivePack]  = useState<string | null>(null);

  /* refs */
  const pickerRef     = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const sectionRefs   = useRef<Map<string, HTMLDivElement>>(new Map());
  const iconBarRef    = useRef<HTMLDivElement>(null);
  const observerRef   = useRef<IntersectionObserver | null>(null);
  /* empêche l'observer de changer le pack actif pendant un scroll programmatique */
  const skipObserver  = useRef(false);

  /* ── Signed URLs ── */
  const allFilePaths = useMemo(() => {
    const paths: string[] = [];
    (unlockedPacks as any[]).forEach((entry) => {
      const pack = entry?.sticker_packs;
      (pack?.stickers || []).forEach((s: any) => {
        if (s?.file_path) paths.push(s.file_path);
      });
      if (pack?.icon_url && pack.icon_url.startsWith('sticker-packs/'))
        paths.push(pack.icon_url);
    });
    return paths;
  }, [unlockedPacks]);

  const { data: signedUrlMap = {} } = useSignedStickerUrls(allFilePaths);

  /* ── Construit la liste de packs ── */
  const stickerPacks = useMemo<StickerPack[]>(() => {
    return (unlockedPacks as any[])
      .map((entry: any, index: number) => {
        const pack = entry?.sticker_packs;
        if (!pack?.id) return null;

        const stickers: Sticker[] = (pack.stickers || [])
          .filter((s: any) => s?.id && (s?.file_url || s?.file_path)
            && (!s.status || s.status === 'approved'))
          .map((s: any) => ({
            id: s.id,
            url: (s.file_path && signedUrlMap[s.file_path]) || s.file_url || '',
            path: s.file_path ?? null,
          }))
          .filter((s: Sticker) => !!s.url);

        /* icône du pack : URL signée si besoin, sinon URL directe */
        const rawIcon: string | null = pack.icon_url ?? null;
        const iconUrl = rawIcon
          ? (signedUrlMap[rawIcon] ?? rawIcon)
          : null;

        return {
          id: pack.id,
          name: pack.name || 'Pack',
          iconUrl,
          color: GRADIENT_PALETTE[index % GRADIENT_PALETTE.length],
          stickers,
        } satisfies StickerPack;
      })
      .filter((p): p is StickerPack => Boolean(p) && p.stickers.length > 0);
  }, [unlockedPacks, signedUrlMap]);

  /* Init du pack actif */
  useEffect(() => {
    if (!stickerPacks.length) { setActivePack(null); return; }
    if (!activePack || !stickerPacks.some((p) => p.id === activePack)) {
      setActivePack(stickerPacks[0].id);
    }
  }, [stickerPacks]);  // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Ferme sur clic extérieur / Échap ── */
  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) onToggle();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onToggle(); };
    if (isOpen) {
      document.addEventListener('mousedown', onMouseDown);
      document.addEventListener('keydown', onKey);
    }
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [isOpen, onToggle]);

  /* ── IntersectionObserver : met en surbrillance le pack visible ── */
  useEffect(() => {
    observerRef.current?.disconnect();
    if (!scrollAreaRef.current || !stickerPacks.length) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (skipObserver.current) return;
        /* Parmi les sections visibles, prendre celle dont le ratio est le plus élevé */
        let best: { id: string; ratio: number } | null = null;
        entries.forEach((entry) => {
          const id = entry.target.getAttribute('data-pack-id');
          if (!id) return;
          if (entry.isIntersecting && (!best || entry.intersectionRatio > best.ratio)) {
            best = { id, ratio: entry.intersectionRatio };
          }
        });
        if (best) setActivePack((best as any).id);
      },
      {
        root: scrollAreaRef.current,
        threshold: [0, 0.1, 0.25, 0.5, 0.75, 1],
      },
    );

    sectionRefs.current.forEach((el) => observerRef.current!.observe(el));
    return () => observerRef.current?.disconnect();
  }, [stickerPacks]);

  /* ── Clic sur une icône → scroll vers la section ── */
  const scrollToSection = useCallback((packId: string) => {
    const el = sectionRefs.current.get(packId);
    if (!el || !scrollAreaRef.current) return;

    setActivePack(packId);
    skipObserver.current = true;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });

    /* réactive l'observer après la fin de l'animation (~600 ms) */
    setTimeout(() => { skipObserver.current = false; }, 700);

    /* scroll la barre d'icônes pour centrer l'icône active */
    const bar = iconBarRef.current;
    if (bar) {
      const btn = bar.querySelector<HTMLButtonElement>(`[data-pack-btn="${packId}"]`);
      if (btn) btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, []);

  /* ── Scroll barre d'icônes quand activePack change via observer ── */
  useEffect(() => {
    if (!activePack || !iconBarRef.current) return;
    const bar = iconBarRef.current;
    const btn = bar.querySelector<HTMLButtonElement>(`[data-pack-btn="${activePack}"]`);
    if (btn) btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [activePack]);

  if (!isOpen) return null;

  return (
    <div
      ref={pickerRef}
      role="dialog"
      aria-label="Sélecteur de stickers"
      className={`
        w-[85vw] max-w-[340px] sm:w-[360px] z-50 flex flex-col
        bg-white/96 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-100
        overflow-hidden animate-in fade-in zoom-in-95 duration-200
        ${className ?? 'absolute bottom-full left-0 mb-3'}
      `}
    >
      {/* ── 1. Barre d'icônes des packs (sticky) ── */}
      <div className="border-b border-gray-100 bg-white/95 backdrop-blur-sm">
        <div
          ref={iconBarRef}
          className="flex items-center gap-1 px-2 py-2 overflow-x-auto scrollbar-hide"
        >
          {stickerPacks.map((pack) => (
            <div key={pack.id} data-pack-btn={pack.id}>
              <PackIcon
                pack={pack}
                active={activePack === pack.id}
                onClick={() => scrollToSection(pack.id)}
              />
            </div>
          ))}

          {/* séparateur */}
          <div className="w-px h-6 bg-slate-200 mx-1 shrink-0" />

          {/* Boutique */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setShopOpen(true); }}
            title="Boutique stickers"
            className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl text-pink-600 hover:bg-pink-50 transition-all duration-200 border border-pink-100"
          >
            <ShoppingBag size={18} />
          </button>

          {/* Studio */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
              // Ouvre le studio en mode personnel via un paramètre d'URL
              navigate('/stickers/studio?personal=1');
            }}
            title="Créer un sticker personnel (visible uniquement par vous)"
            className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl text-violet-700 hover:bg-violet-50 transition-all duration-200 border border-violet-100"
          >
            <PackagePlus size={18} />
          </button>

          <StickerShopModal
            open={shopOpen}
            onClose={() => setShopOpen(false)}
            onPackAdded={() => window.location.reload()}
          />
        </div>
      </div>

      {/* ── 2. Zone scrollable unifiée ── */}
      <div
        ref={scrollAreaRef}
        className="flex-1 overflow-y-auto overscroll-contain"
        style={{ maxHeight: 320, height: 320 }}
      >
        {!stickerPacks.length ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 px-4 py-8">
            <span className="text-3xl mb-2">🎨</span>
            <p className="text-sm font-medium">Aucun pack débloqué</p>
            <p className="text-xs mt-1 text-slate-400">Débloquez un pack pour commencer.</p>
          </div>
        ) : (
          stickerPacks.map((pack) => (
            <section
              key={pack.id}
              data-pack-id={pack.id}
              ref={(el) => {
                if (el) sectionRefs.current.set(pack.id, el);
                else sectionRefs.current.delete(pack.id);
              }}
            >
              {/* En-tête de section */}
              <div className={`sticky top-0 z-10 flex items-center gap-2 px-3 py-1.5 bg-white/95 backdrop-blur-sm border-b border-gray-50`}>
                <div className={`w-2.5 h-2.5 rounded-full bg-gradient-to-br ${pack.color} shrink-0`} />
                <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500 truncate">
                  {pack.name}
                </span>
                <span className="ml-auto text-[10px] text-slate-400 shrink-0">
                  {pack.stickers.length}
                </span>
              </div>

              {/* Grille de stickers */}
              <div className="grid grid-cols-4 gap-1.5 px-2.5 py-2.5">
                {pack.stickers.map((sticker) => (
                  <motion.button
                    key={sticker.id}
                    type="button"
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.88 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onStickerSelect(sticker.url);
                      onToggle();
                    }}
                    className="flex h-[58px] w-full items-center justify-center rounded-xl hover:bg-slate-100 transition-colors duration-100 p-1"
                    title="Envoyer ce sticker"
                  >
                    <img
                      src={sticker.url}
                      alt="Sticker"
                      className="w-full h-full object-contain"
                      loading="lazy"
                    />
                  </motion.button>
                ))}
              </div>
            </section>
          ))
        )}
      </div>

      {/* ── 3. Barre de couleur du pack actif ── */}
      <div
        className={`h-1 w-full bg-gradient-to-r transition-all duration-300 ${
          stickerPacks.find((p) => p.id === activePack)?.color ?? 'from-slate-200 to-slate-300'
        }`}
      />
    </div>
  );
};

export default StickerPicker;
