// Panneau dedie a la creation et a l'edition des textes dans l'etape de finalisation.
import { useRef } from 'react';
import { Bold, Italic, Palette, Underline } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { TextOverlayList } from '../../types';

const FONT_OPTIONS = ['Segoe UI', 'Poppins', 'Georgia', 'Courier New'];

interface FinalizeTextPanelProps {
  textDraft: string;
  textColorDraft: string;
  textFontFamilyDraft: string;
  textBoldDraft: boolean;
  textItalicDraft: boolean;
  textUnderlineDraft: boolean;
  textOverlays: TextOverlayList;
  hasSelectedText: boolean;
  onUpdateSelectedText: (value: string) => void;
  onUpdateSelectedTextColor: (value: string) => void;
  onUpdateSelectedTextFontFamily: (value: string) => void;
  onToggleBold: () => void;
  onToggleItalic: () => void;
  onToggleUnderline: () => void;
  onResetOverlayTransform: () => void;
  onRemoveSelectedOverlay: () => void;
}

export const FinalizeTextPanel = ({
  textDraft,
  textColorDraft,
  textFontFamilyDraft,
  textBoldDraft,
  textItalicDraft,
  textUnderlineDraft,
  textOverlays,
  hasSelectedText,
  onUpdateSelectedText,
  onUpdateSelectedTextColor,
  onUpdateSelectedTextFontFamily,
  onToggleBold,
  onToggleItalic,
  onToggleUnderline,
  onResetOverlayTransform,
  onRemoveSelectedOverlay,
}: FinalizeTextPanelProps) => {
  const trimmedDraft = textDraft.trim();
  const colorInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-base font-semibold text-white">Ajouter un texte</div>
        <div className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[11px] font-medium text-zinc-300">
          {trimmedDraft.length}/120
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <input
          ref={colorInputRef}
          type="color"
          value={textColorDraft}
          onChange={(event) => onUpdateSelectedTextColor(event.target.value)}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
        />
        <button
          type="button"
          onClick={() => colorInputRef.current?.click()}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-zinc-300 transition hover:border-orange-300"
          aria-label="Ouvrir le selecteur de couleur"
          title="Couleur"
        >
          <Palette size={18} style={{ color: textColorDraft }} />
        </button>

        <button
          type="button"
          onClick={onToggleBold}
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border transition ${textBoldDraft ? 'border-orange-400 bg-orange-500/12 text-white' : 'border-white/10 bg-white/[0.04] text-zinc-300 hover:border-orange-300'}`}
          aria-label="Mettre en gras"
        >
          <Bold size={18} />
        </button>
        <button
          type="button"
          onClick={onToggleItalic}
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border transition ${textItalicDraft ? 'border-orange-400 bg-orange-500/12 text-white' : 'border-white/10 bg-white/[0.04] text-zinc-300 hover:border-orange-300'}`}
          aria-label="Mettre en italique"
        >
          <Italic size={18} />
        </button>
        <button
          type="button"
          onClick={onToggleUnderline}
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border transition ${textUnderlineDraft ? 'border-orange-400 bg-orange-500/12 text-white' : 'border-white/10 bg-white/[0.04] text-zinc-300 hover:border-orange-300'}`}
          aria-label="Souligner"
        >
          <Underline size={18} />
        </button>
      </div>

      <Textarea
        value={textDraft}
        maxLength={120}
        onChange={(event) => onUpdateSelectedText(event.target.value)}
        placeholder={'Nouveau texte'}
        rows={4}
        className="min-h-[140px] rounded-2xl border-white/10 bg-black/30 text-base leading-6 text-white placeholder:text-zinc-500"
        style={{
          color: textColorDraft,
          fontFamily: `"${textFontFamilyDraft}", sans-serif`,
          fontWeight: textBoldDraft ? 'bold' : 'normal',
          fontStyle: textItalicDraft ? 'italic' : 'normal',
          textDecoration: textUnderlineDraft ? 'underline' : 'none',
        }}
      />

      <div className="space-y-2 border-t border-white/10 pt-3">
        <div className="text-[11px] font-medium uppercase tracking-[0.22em] text-zinc-500">Polices</div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {FONT_OPTIONS.map((fontFamily) => {
            const isActive = textFontFamilyDraft === fontFamily;

            return (
              <button
                key={fontFamily}
                type="button"
                onClick={() => onUpdateSelectedTextFontFamily(fontFamily)}
                className={`min-w-[132px] shrink-0 rounded-2xl border px-4 py-3 text-left text-sm transition ${isActive ? 'border-orange-400 bg-orange-500/10 text-white' : 'border-white/10 bg-white/[0.04] text-zinc-200 hover:border-orange-300'}`}
                style={{ fontFamily }}
              >
                {fontFamily}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" className="border-white/10 text-zinc-200 hover:bg-white/10 hover:text-white" onClick={onResetOverlayTransform}>
          Recentrer
        </Button>
        {hasSelectedText && (
          <Button type="button" variant="ghost" className="text-zinc-300 hover:bg-white/10 hover:text-white" onClick={onRemoveSelectedOverlay}>
            Retirer le texte
          </Button>
        )}
      </div>
    </div>
  );
};