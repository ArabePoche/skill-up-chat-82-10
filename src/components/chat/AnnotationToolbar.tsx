
import React from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Pencil, 
  MousePointer, 
  Circle, 
  Square, 
  StickyNote,
  Type,
  Undo,
  Trash2,
  Save,
  Download,
  FileText
} from 'lucide-react';

interface AnnotationToolbarProps {
  activeTool: string;
  activeColor: string;
  brushSize: number;
  fontSize: number;
  onToolChange: (tool: any) => void;
  onColorChange: (color: string) => void;
  onBrushSizeChange: (size: number) => void;
  onFontSizeChange: (size: number) => void;
  onUndo: () => void;
  onClear: () => void;
  onSave: () => void;
  onDownloadImage: () => void;
  onDownloadPDF: () => void;
  isSaving: boolean;
}

const colors = [
  '#ff0000', '#00ff00', '#0000ff', '#ffff00', 
  '#ff00ff', '#00ffff', '#000000', '#ffffff'
];

const AnnotationToolbar: React.FC<AnnotationToolbarProps> = ({
  activeTool,
  activeColor,
  brushSize,
  fontSize,
  onToolChange,
  onColorChange,
  onBrushSizeChange,
  onFontSizeChange,
  onUndo,
  onClear,
  onSave,
  onDownloadImage,
  onDownloadPDF,
  isSaving
}) => {
  return (
    <div className="flex items-center gap-2 p-4 bg-white border-b overflow-x-auto">
      {/* Tools */}
      <div className="flex items-center gap-1">
        <Button
          variant={activeTool === 'select' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onToolChange('select')}
          title="Sélectionner"
        >
          <MousePointer size={16} />
        </Button>
        
        <Button
          variant={activeTool === 'draw' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onToolChange('draw')}
          title="Crayon"
        >
          <Pencil size={16} />
        </Button>
        
        <Button
          variant={activeTool === 'highlight' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onToolChange('highlight')}
          title="Surligneur"
          className="bg-yellow-200 hover:bg-yellow-300 text-yellow-800"
        >
          ✏️
        </Button>
        
        <Button
          variant={activeTool === 'text' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onToolChange('text')}
          title="Texte"
        >
          <Type size={16} />
        </Button>
        
        <Button
          variant={activeTool === 'circle' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onToolChange('circle')}
          title="Cercle"
        >
          <Circle size={16} />
        </Button>
        
        <Button
          variant={activeTool === 'rectangle' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onToolChange('rectangle')}
          title="Rectangle"
        >
          <Square size={16} />
        </Button>
        
        <Button
          variant={activeTool === 'note' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onToolChange('note')}
          title="Ajouter une note"
        >
          <StickyNote size={16} />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Colors */}
      <div className="flex items-center gap-1">
        {colors.map(color => (
          <button
            key={color}
            className={`w-6 h-6 rounded-full border-2 ${
              activeColor === color ? 'border-gray-800' : 'border-gray-300'
            }`}
            style={{ backgroundColor: color }}
            onClick={() => onColorChange(color)}
            title={`Couleur ${color}`}
          />
        ))}
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Brush Size */}
      <div className="flex items-center gap-2">
        <span className="text-sm">Taille:</span>
        <input
          type="range"
          min="1"
          max="20"
          value={brushSize}
          onChange={(e) => onBrushSizeChange(parseInt(e.target.value))}
          className="w-20"
        />
        <span className="text-sm w-6">{brushSize}</span>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Font Size for Text Tool */}
      <div className="flex items-center gap-2">
        <span className="text-sm">Police:</span>
        <input
          type="range"
          min="12"
          max="72"
          value={fontSize}
          onChange={(e) => onFontSizeChange(parseInt(e.target.value))}
          className="w-20"
        />
        <span className="text-sm w-8">{fontSize}px</span>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Actions */}
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={onUndo}
          title="Annuler"
        >
          <Undo size={16} />
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={onClear}
          title="Tout effacer"
        >
          <Trash2 size={16} />
        </Button>
        
        <Button
          variant="default"
          size="sm"
          onClick={onSave}
          disabled={isSaving}
          title="Sauvegarder"
        >
          <Save size={16} />
          {isSaving && <span className="ml-1">...</span>}
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={onDownloadImage}
          title="Télécharger image"
        >
          <Download size={16} />
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={onDownloadPDF}
          title="Télécharger PDF"
        >
          <FileText size={16} />
        </Button>
      </div>
    </div>
  );
};

export default AnnotationToolbar;
