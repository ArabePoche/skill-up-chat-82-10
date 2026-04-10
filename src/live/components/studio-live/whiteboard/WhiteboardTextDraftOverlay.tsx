import React from 'react';
import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { TextDraft } from '@/live/components/studio-live/whiteboard/types';

interface WhiteboardTextDraftOverlayProps {
  textDraft: TextDraft;
  onChange: (value: string) => void;
  onCommit: () => void;
  onCancel: () => void;
}

const WhiteboardTextDraftOverlay: React.FC<WhiteboardTextDraftOverlayProps> = ({ textDraft, onChange, onCommit, onCancel }) => {
  return (
    <div
      className="absolute z-50 rounded-xl border border-indigo-400/30 bg-zinc-950/90 p-2 shadow-2xl backdrop-blur-md"
      style={{
        left: `${Math.min(textDraft.screenX, 1540)}px`,
        top: `${Math.min(textDraft.screenY, 960)}px`,
      }}
    >
      <input
        autoFocus
        type="text"
        value={textDraft.value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            onCommit();
          }
          if (event.key === 'Escape') {
            event.preventDefault();
            onCancel();
          }
        }}
        className="w-56 bg-transparent text-base text-white placeholder:text-zinc-500 focus:outline-none"
        placeholder="Écrire puis valider"
      />
      <div className="mt-2 flex items-center justify-end gap-2">
        <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-zinc-300 hover:text-white" onClick={onCancel}>
          <X className="h-4 w-4" />
        </Button>
        <Button type="button" size="icon" className="h-8 w-8 bg-indigo-600 hover:bg-indigo-500" onClick={onCommit}>
          <Check className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default WhiteboardTextDraftOverlay;