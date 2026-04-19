/**
 * StickerPicker — Sélecteur de stickers style WhatsApp
 * Les "stickers" sont de grands emojis organisés par packs thématiques.
 * En cliquant sur un sticker, il est envoyé comme message immédiat.
 */
import React, { useRef, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { PackagePlus, ShoppingBag } from 'lucide-react';
import StickerShopModal from '@/stickers/components/StickerShopModal';
import { useUserUnlockedPacks } from '@/hooks/useStickerSystem';
import { useSignedStickerUrls } from '@/stickers/hooks/useSignedStickerUrls';

interface StickerPickerProps {
  onStickerSelect: (sticker: string) => void;
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
  icon: string;
  color: string;
  stickers: Sticker[];
}

const StickerPicker: React.FC<StickerPickerProps> = ({ onStickerSelect, isOpen, onToggle, className }) => {
  const navigate = useNavigate();
  const { data: unlockedPacks = [] } = useUserUnlockedPacks();
  const [shopOpen, setShopOpen] = useState(false);

  // Collect all file_paths from unlocked packs to generate fresh signed URLs
  const allFilePaths = useMemo(() => {
    const paths: string[] = [];
    (unlockedPacks as any[]).forEach((entry) => {
      const pack = entry?.sticker_packs;
      (pack?.stickers || []).forEach((s: any) => {
        if (s?.file_path) paths.push(s.file_path);
      });
    });
    return paths;
  }, [unlockedPacks]);

  const { data: signedUrlMap = {} } = useSignedStickerUrls(allFilePaths);

  const stickerPacks = useMemo<StickerPack[]>(() => {
    const gradientPalette = [
      'from-amber-400 to-orange-500',
      'from-sky-400 to-indigo-500',
      'from-fuchsia-400 to-pink-500',
      'from-emerald-400 to-teal-500',
      'from-violet-400 to-purple-500',
      'from-rose-400 to-red-500',
    ];

    return (unlockedPacks as any[])
      .map((entry: any, index: number) => {
        const pack = entry?.sticker_packs;
        if (!pack?.id) return null;

        const stickers: Sticker[] = (pack.stickers || [])
          .filter((s: any) => s?.id && (s?.file_url || s?.file_path))
          .map((s: any) => ({
            id: s.id,
            // Prefer fresh signed URL from file_path, fall back to stored file_url
            url: (s.file_path && signedUrlMap[s.file_path]) || s.file_url || '',
            path: s.file_path ?? null,
          }))
          .filter((s: Sticker) => !!s.url);

        return {
          id: pack.id,
          name: pack.name || 'Pack',
          icon: pack.icon_url ? '🖼️' : '🎨',
          color: gradientPalette[index % gradientPalette.length],
          stickers,
        } satisfies StickerPack;
      })
      .filter((pack): pack is StickerPack => Boolean(pack) && pack.stickers.length > 0);
  }, [unlockedPacks, signedUrlMap]);

  const [activePack, setActivePack] = useState<string | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const currentPack = useMemo(() => {
    if (!stickerPacks.length) return null;
    return stickerPacks.find((p) => p.id === activePack) || stickerPacks[0];
  }, [activePack, stickerPacks]);

  useEffect(() => {
    if (!stickerPacks.length) {
      setActivePack(null);
      return;
    }
    if (!activePack || !stickerPacks.some((p) => p.id === activePack)) {
      setActivePack(stickerPacks[0].id);
    }
  }, [activePack, stickerPacks]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        onToggle();
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onToggle();
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onToggle]);

  if (!isOpen) return null;

  return (
    <div
      ref={pickerRef}
      role="dialog"
      aria-label="Sélecteur de stickers"
      className={`w-[85vw] max-w-[340px] sm:w-[350px] z-50 flex flex-col bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${className ?? 'absolute bottom-full left-0 mb-3'}`}
    >
      {/* Header: nom du pack actif */}
      <div className="px-4 pt-3 pb-1.5 border-b border-gray-100">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">{currentPack?.icon ?? '🎭'}</span>
          <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
            {currentPack?.name || 'Stickers'}
          </span>
        </div>

        {/* Pack selector bar */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide pb-1">
          {stickerPacks.map((pack) => (
            <button
              key={pack.id}
              type="button"
              onClick={(e) => { e.stopPropagation(); setActivePack(pack.id); }}
              title={pack.name}
              className={`flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-xl text-xl transition-all duration-200 ${
                activePack === pack.id
                  ? 'bg-violet-100 scale-110 shadow-sm ring-2 ring-violet-400/40'
                  : 'hover:bg-slate-100 hover:scale-105'
              }`}
            >
              {pack.icon}
            </button>
          ))}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShopOpen(true);
            }}
            title="Boutique stickers"
            className="ml-1 flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-xl text-pink-600 hover:bg-pink-50 transition-all duration-200 border border-pink-100"
          >
            <ShoppingBag size={18} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
              navigate('/stickers/studio');
            }}
            title="Ouvrir le studio stickers"
            className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 transition-all duration-200"
          >
            <PackagePlus size={18} />
          </button>
          {/* Modale boutique stickers */}
          <StickerShopModal
            open={shopOpen}
            onClose={() => setShopOpen(false)}
            onPackAdded={() => {
              if (typeof window !== 'undefined' && window.location) {
                window.location.reload();
              }
            }}
          />
        </div>
      </div>

      {/* Sticker grid */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activePack || 'empty'}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.15 }}
          className="flex-1 max-h-[280px] h-[280px] overflow-y-auto px-3 py-3 custom-scrollbar scroll-smooth"
        >
          {!currentPack ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 px-4">
              <p className="text-sm font-medium">Aucun pack débloqué</p>
              <p className="text-xs mt-1">Débloquez un pack puis réessayez.</p>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2 justify-items-center">
              {currentPack.stickers.map((sticker) => (
                <motion.button
                  key={sticker.id}
                  type="button"
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onStickerSelect(sticker.url);
                    onToggle();
                  }}
                  className="flex h-[60px] w-full items-center justify-center rounded-2xl hover:bg-slate-100 transition-all duration-150 p-1"
                  title="Sticker"
                >
                  <img src={sticker.url} alt="Sticker" className="w-full h-full object-contain" loading="lazy" />
                </motion.button>
              ))}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Bottom brand bar */}
      <div className={`h-1.5 w-full bg-gradient-to-r ${currentPack?.color || 'from-slate-300 to-slate-400'}`} />
    </div>
  );
};

export default StickerPicker;
