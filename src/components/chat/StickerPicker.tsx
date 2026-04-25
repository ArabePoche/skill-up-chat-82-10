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
import { PackagePlus, ShoppingBag, Search, Star, Heart } from 'lucide-react';
import StickerShopModal from '@/stickers/components/StickerShopModal';
import { useUserUnlockedPacks } from '@/hooks/useStickerSystem';
import { useSignedStickerUrls } from '@/stickers/hooks/useSignedStickerUrls';
import { useFavorites } from '@/hooks/useFavorites';

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
  const [searchQuery, setSearchQuery] = useState('');

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


  const stickerPacks = useMemo<StickerPack[]>(() => {
    return (unlockedPacks as any[])
      .map((entry: any, index: number) => {
        const pack = entry?.sticker_packs;
        if (!pack?.id) return null;

        let stickers: Sticker[] = (pack.stickers || [])
          .filter((s: any) => s?.id && (s?.file_url || s?.file_path)
            && (!s.status || s.status === 'approved'))
          .map((s: any) => ({
            id: s.id,
            url: (s.file_path && signedUrlMap[s.file_path]) || s.file_url || '',
            path: s.file_path ?? null,
          }))
          .filter((s: Sticker) => !!s.url);

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

  // Utiliser le nouveau système de favoris
  const { getFavoriteStickers, isFavorited, toggleFavorite } = useFavorites();
  const favoriteStickers = getFavoriteStickers();

  // Filtrer les stickers selon la recherche
  const filteredStickerPacks = useMemo(() => {
    if (!searchQuery.trim()) return stickerPacks;
    
    return stickerPacks.map(pack => {
      const filteredStickers = pack.stickers.filter(sticker => 
        pack.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sticker.id.toLowerCase().includes(searchQuery.toLowerCase())
      );
      return { ...pack, stickers: filteredStickers };
    }).filter(pack => pack.stickers.length > 0);
  }, [stickerPacks, searchQuery, favoriteStickers]);
  
  // Pack des favoris basé sur le nouveau système
  // Inclut TOUS les favoris (packs débloqués + stickers reçus en conversation)
  const favoritesPack = useMemo(() => {
    if (favoriteStickers.length === 0) return null;

    // Index des stickers présents dans les packs débloqués (pour récupérer l'URL signée fraîche)
    const stickersInPacks = new Map<string, Sticker>();
    stickerPacks.forEach(pack => {
      pack.stickers.forEach(sticker => {
        stickersInPacks.set(sticker.id, sticker);
      });
    });

    // Construire la liste des favoris : prioriser le sticker présent dans un pack
    // (URL signée fraîche), sinon retomber sur item_data.url stocké au moment du favori
    const allFavorites: Sticker[] = favoriteStickers
      .map(fav => {
        const fromPack = stickersInPacks.get(fav.item_id);
        if (fromPack) return fromPack;

        const url = (fav.item_data as any)?.url;
        if (!url) return null;

        return {
          id: fav.item_id,
          url,
          path: (fav.item_data as any)?.packId ?? null,
        } satisfies Sticker;
      })
      .filter((s): s is Sticker => s !== null);

    if (allFavorites.length === 0) return null;

    return {
      id: 'favorites',
      name: 'Favoris',
      iconUrl: null,
      color: 'from-rose-400 to-pink-500',
      stickers: allFavorites,
    } satisfies StickerPack;
  }, [stickerPacks, favoriteStickers]);

  const displayPacks = favoritesPack 
    ? [favoritesPack, ...filteredStickerPacks]
    : filteredStickerPacks;

  /* Init du pack actif */
  useEffect(() => {
    if (!displayPacks.length) { setActivePack(null); return; }
    if (!activePack || !displayPacks.some((p) => p.id === activePack)) {
      setActivePack(displayPacks[0].id);
    }
  }, [displayPacks]);  // eslint-disable-line react-hooks/exhaustive-deps

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
    if (!scrollAreaRef.current || !displayPacks.length) return;

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
  }, [displayPacks]);

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
        w-[90vw] max-w-[380px] sm:w-[380px] z-50 flex flex-col
        bg-white rounded-3xl shadow-2xl border border-gray-200
        overflow-hidden animate-in fade-in zoom-in-95 duration-200
        ${className ?? 'absolute bottom-full left-0 mb-3'}
      `}
    >
      {/* ── 1. Barre d'outils et recherche ── */}
      <div className="border-b border-gray-100 bg-white">
        {/* Barre de recherche et filtres */}
        <div className="px-3 py-2 border-b border-gray-100/60">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher un sticker..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-white/80 border border-gray-200/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-400/50 focus:border-violet-400/60 transition-all duration-200 placeholder-slate-400"
            />
          </div>
        </div>

        {/* Barre d'icônes des packs */}
        <div
          ref={iconBarRef}
          className="flex items-center gap-1 px-2 py-2 overflow-x-auto scrollbar-hide"
        >
          {displayPacks.map((pack) => (
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
            className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl text-pink-600 hover:bg-pink-50 transition-all duration-200 border border-pink-100 hover:scale-105"
          >
            <ShoppingBag size={18} />
          </button>

          {/* Créer un sticker individuel */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
              // Ouvre le studio en mode personnel pour créer un sticker individuel
              navigate('/stickers/studio?personal=1&single=1');
            }}
            title="Créer un sticker individuel (visible uniquement par vous)"
            className="flex-shrink-0 flex items-center gap-2 w-auto h-10 px-3 justify-center rounded-xl text-violet-700 hover:bg-violet-50 transition-all duration-200 border border-violet-100 font-semibold hover:scale-105"
          >
            <PackagePlus size={18} />
            <span className="hidden sm:inline">Créer</span>
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
        className="flex-1 overflow-y-auto overscroll-contain bg-white"
        style={{ maxHeight: 340, height: 340 }}
      >
        {!displayPacks.length ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 px-4 py-8">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-3">
              {searchQuery ? (
                <Search size={24} className="text-slate-400" />
              ) : (
                <span className="text-2xl">🎨</span>
              )}
            </div>
            <p className="text-sm font-medium">
              {searchQuery ? 'Aucun sticker trouvé' : 'Aucun pack débloqué'}
            </p>
            <p className="text-xs mt-1 text-slate-400">
              {searchQuery ? 'Essayez une autre recherche' : 'Débloquez un pack pour commencer.'}
            </p>
          </div>
        ) : (
          displayPacks.map((pack) => (
            <section
              key={pack.id}
              data-pack-id={pack.id}
              ref={(el) => {
                if (el) sectionRefs.current.set(pack.id, el);
                else sectionRefs.current.delete(pack.id);
              }}
            >
              {/* En-tête de section */}
              <div className={`sticky top-0 z-10 flex items-center gap-3 px-4 py-2.5 bg-white border border-gray-100 shadow-sm`}>
                <div className={`w-3 h-3 rounded-full bg-gradient-to-br ${pack.color} shrink-0 shadow-sm`} />
                <span className="text-[12px] font-bold uppercase tracking-wider text-slate-600 truncate">
                  {pack.name}
                </span>
                {pack.id === 'favorites' && (
                  <Star size={12} className="text-rose-500 fill-current" />
                )}
                <span className="ml-auto text-[10px] text-slate-400 shrink-0 font-medium bg-slate-100 px-2 py-0.5 rounded-full">
                  {pack.stickers.length}
                </span>
              </div>

              {/* Grille de stickers */}
              <div className="grid grid-cols-4 gap-2 px-3 py-3">
                {pack.stickers.map((sticker) => {
                  const isFav = isFavorited('sticker', sticker.id);
                  return (
                    <motion.button
                      key={sticker.id}
                      type="button"
                      whileHover={{ scale: 1.12 }}
                      whileTap={{ scale: 0.92 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onStickerSelect(sticker.url);
                        onToggle();
                      }}
                      className="flex h-[62px] w-full items-center justify-center rounded-2xl hover:bg-gradient-to-br hover:from-slate-50 hover:to-slate-100 transition-all duration-200 p-1.5 border border-gray-100/40 hover:border-gray-200/60 hover:shadow-lg hover:shadow-slate-100/30 group relative"
                      title="Envoyer ce sticker"
                    >
                      <img
                        src={sticker.url}
                        alt="Sticker"
                        className="w-full h-full object-contain"
                        loading="lazy"
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite('sticker', sticker.id, {
                            url: sticker.url,
                            packId: sticker.path,
                          });
                        }}
                        className={`absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 ${
                          isFav 
                            ? 'bg-rose-500 text-white hover:bg-rose-600' 
                            : 'bg-white/80 text-slate-600 hover:bg-white hover:text-rose-500 border border-slate-200'
                        }`}
                        title={isFav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                      >
                        <Heart size={12} className={isFav ? 'fill-current' : ''} />
                      </button>
                    </motion.button>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </div>

      {/* ── 3. Barre de couleur du pack actif ── */}
      <div
        className={`h-1.5 w-full bg-gradient-to-r transition-all duration-300 shadow-sm ${
          displayPacks.find((p) => p.id === activePack)?.color ?? 'from-slate-200 to-slate-300'
        }`}
      />
    </div>
  );
};

export default StickerPicker;
