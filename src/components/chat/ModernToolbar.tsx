
import React from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { 
  Type, 
  StickyNote, 
  Pencil, 
  MousePointer, 
  Circle, 
  Square, 
  RotateCw,
  Crop,
  Undo,
  Redo,
  Trash2,
  Save,
  Download,
  FileText,
  Palette
} from 'lucide-react';
import ColorPicker from './ColorPicker';

interface ModernToolbarProps {
  activeTool: string;
  activeColor: string;
  brushSize: number;
  fontSize: number;
  onToolChange: (tool: any) => void;
  onColorChange: (color: string) => void;
  onBrushSizeChange: (size: number) => void;
  onFontSizeChange: (size: number) => void;
  onUndo: () => void;
  onRedo?: () => void;
  onClear: () => void;
  onSave: () => void;
  onDownloadImage: () => void;
  onDownloadPDF: () => void;
  isSaving: boolean;
}

const ModernToolbar: React.FC<ModernToolbarProps> = ({
  activeTool,
  activeColor,
  brushSize,
  fontSize,
  onToolChange,
  onColorChange,
  onBrushSizeChange,
  onFontSizeChange,
  onUndo,
  onRedo,
  onClear,
  onSave,
  onDownloadImage,
  onDownloadPDF,
  isSaving
}) => {
  return (
    <div className="bg-white border-b p-2 overflow-x-auto">
      <div className="flex items-center gap-1 min-w-max">
        
        {/* Texte Menu */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="flex items-center gap-1">
              🅰️
              <span className="hidden sm:inline text-xs">Texte</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-2">
            <div className="flex flex-col gap-1">
              <Button
                variant={activeTool === 'text' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onToolChange('text')}
                className="justify-start"
              >
                <Type size={14} className="mr-2" />
                Ajouter texte
              </Button>
              <Button
                variant={activeTool === 'note' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onToolChange('note')}
                className="justify-start"
              >
                <StickyNote size={14} className="mr-2" />
                Ajouter note
              </Button>
              <Separator className="my-1" />
              <div className="flex items-center gap-2 px-2">
                <span className="text-xs">Taille:</span>
                <input
                  type="range"
                  min="12"
                  max="72"
                  value={fontSize}
                  onChange={(e) => onFontSizeChange(parseInt(e.target.value))}
                  className="flex-1"
                />
                <span className="text-xs w-8">{fontSize}px</span>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Dessin Menu */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="flex items-center gap-1">
              ✍️
              <span className="hidden sm:inline text-xs">Dessin</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2">
            <div className="flex flex-col gap-1">
              <Button
                variant={activeTool === 'select' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onToolChange('select')}
                className="justify-start"
              >
                <MousePointer size={14} className="mr-2" />
                Sélectionner
              </Button>
              <Button
                variant={activeTool === 'draw' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onToolChange('draw')}
                className="justify-start"
              >
                <Pencil size={14} className="mr-2" />
                Crayon
              </Button>
              <Button
                variant={activeTool === 'highlight' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onToolChange('highlight')}
                className="justify-start bg-yellow-100 hover:bg-yellow-200"
              >
                ✏️
                <span className="ml-2">Surligneur</span>
              </Button>
              <Separator className="my-1" />
              <div className="flex items-center gap-2 px-2">
                <span className="text-xs">Épaisseur:</span>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={brushSize}
                  onChange={(e) => onBrushSizeChange(parseInt(e.target.value))}
                  className="flex-1"
                />
                <span className="text-xs w-6">{brushSize}</span>
              </div>
              <div className="px-2 pt-1">
                <ColorPicker activeColor={activeColor} onColorChange={onColorChange} />
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Formes Menu */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="flex items-center gap-1">
              📐
              <span className="hidden sm:inline text-xs">Formes</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-2">
            <div className="flex flex-col gap-1">
              <Button
                variant={activeTool === 'circle' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onToolChange('circle')}
                className="justify-start"
              >
                <Circle size={14} className="mr-2" />
                Cercle
              </Button>
              <Button
                variant={activeTool === 'rectangle' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onToolChange('rectangle')}
                className="justify-start"
              >
                <Square size={14} className="mr-2" />
                Rectangle
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        <Separator orientation="vertical" className="h-6" />

        {/* Actions Menu */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="flex items-center gap-1">
              🛠️
              <span className="hidden sm:inline text-xs">Actions</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-2">
            <div className="flex flex-col gap-1">
              <Button variant="ghost" size="sm" onClick={onUndo} className="justify-start">
                <Undo size={14} className="mr-2" />
                Annuler
              </Button>
              {onRedo && (
                <Button variant="ghost" size="sm" onClick={onRedo} className="justify-start">
                  <Redo size={14} className="mr-2" />
                  Refaire
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={onClear} className="justify-start text-red-600 hover:text-red-700">
                <Trash2 size={14} className="mr-2" />
                Effacer tout
              </Button>
              <Separator className="my-1" />
              <Button 
                variant="default" 
                size="sm" 
                onClick={onSave} 
                disabled={isSaving}
                className="justify-start"
              >
                <Save size={14} className="mr-2" />
                Enregistrer
                {isSaving && <span className="ml-1">...</span>}
              </Button>
              <Button variant="ghost" size="sm" onClick={onDownloadImage} className="justify-start">
                <Download size={14} className="mr-2" />
                Télécharger IMG
              </Button>
              <Button variant="ghost" size="sm" onClick={onDownloadPDF} className="justify-start">
                <FileText size={14} className="mr-2" />
                Télécharger PDF
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};

export default ModernToolbar;
