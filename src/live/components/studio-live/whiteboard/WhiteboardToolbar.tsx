import React from 'react';
import { Eraser, ImagePlus, Move, NotebookPen, Palette, Redo2, RotateCcw, Type, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { WhiteboardTool } from '@/live/lib/liveWhiteboard';

interface WhiteboardToolbarProps {
  fileInputRef: React.RefObject<HTMLInputElement>;
  canUndo: boolean;
  canRedo: boolean;
  tool: WhiteboardTool;
  color: string;
  onUndo: () => void;
  onRedo: () => void;
  onToolChange: (tool: WhiteboardTool) => void;
  onImportImage: () => void;
  onColorChange: (color: string) => void;
  onClear: () => void;
  onImageUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const WhiteboardToolbar: React.FC<WhiteboardToolbarProps> = ({
  fileInputRef,
  canUndo,
  canRedo,
  tool,
  color,
  onUndo,
  onRedo,
  onToolChange,
  onImportImage,
  onColorChange,
  onClear,
  onImageUpload,
}) => {
  return (
    <div className="flex items-center justify-between bg-zinc-950 p-3 border-b border-white/5">
      <div className="flex items-center gap-2 flex-wrap">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onImageUpload}
        />
        <Button variant="ghost" size="icon" onClick={onUndo} disabled={!canUndo} className="h-8 w-8 rounded-lg text-white disabled:opacity-40" title="Annuler">
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onRedo} disabled={!canRedo} className="h-8 w-8 rounded-lg text-white disabled:opacity-40" title="Rétablir">
          <Redo2 className="h-4 w-4" />
        </Button>
        <div className="h-4 w-[1px] bg-white/10 mx-1" />
        <Button variant="ghost" size="icon" onClick={() => onToolChange('pen')} className={cn('h-8 w-8 rounded-lg', tool === 'pen' && 'bg-sky-500/20 text-sky-400')} title="Stylo">
          <NotebookPen className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => onToolChange('type')} className={cn('h-8 w-8 rounded-lg', tool === 'type' && 'bg-indigo-500/20 text-indigo-400')} title="Texte">
          <Type className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => onToolChange('eraser')} className={cn('h-8 w-8 rounded-lg text-rose-400', tool === 'eraser' && 'bg-rose-500/20')} title="Gomme">
          <Eraser className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => onToolChange('move')} className={cn('h-8 w-8 rounded-lg', tool === 'move' && 'bg-amber-500/20 text-amber-300')} title="Déplacer une image">
          <Move className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={onImportImage} className="h-8 w-8 border-white/10 bg-white/5 text-white hover:bg-white/10" title="Importer une image">
          <ImagePlus className="h-3.5 w-3.5" />
        </Button>
        <div className="h-4 w-[1px] bg-white/10 mx-2" />
        <label className="group relative flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-white transition-colors hover:bg-white/10">
          <Palette className="h-4 w-4" />
          <span className="absolute bottom-0.5 left-1.5 right-1.5 h-[3px] rounded-full shadow-[0_0_8px_rgba(255,255,255,0.2)]" style={{ backgroundColor: color }} />
          <input
            type="color"
            value={color}
            onChange={(event) => onColorChange(event.target.value.toUpperCase())}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            aria-label="Choisir une couleur"
            title="Choisir une couleur"
          />
        </label>
      </div>
      <Button variant="outline" size="sm" onClick={onClear} className="h-8 border-rose-500/30 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300">
        <RotateCcw className="mr-2 h-3.5 w-3.5" />
      </Button>
    </div>
  );
};

export default WhiteboardToolbar;