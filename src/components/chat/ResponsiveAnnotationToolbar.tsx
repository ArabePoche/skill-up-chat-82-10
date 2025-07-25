
import React from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
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
  FileText,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import ColorPicker from './ColorPicker';

interface ResponsiveAnnotationToolbarProps {
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

const ResponsiveAnnotationToolbar: React.FC<ResponsiveAnnotationToolbarProps> = ({
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
  const [drawingToolsOpen, setDrawingToolsOpen] = React.useState(true);
  const [textNotesOpen, setTextNotesOpen] = React.useState(false);
  const [shapesOpen, setShapesOpen] = React.useState(false);
  const [actionsOpen, setActionsOpen] = React.useState(false);

  return (
    <div className="bg-white border-b p-2 sm:p-4 space-y-3">
      {/* Mobile: Collapsible sections */}
      <div className="block lg:hidden space-y-2">
        {/* Drawing Tools */}
        <Collapsible open={drawingToolsOpen} onOpenChange={setDrawingToolsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between">
              <span className="flex items-center gap-2">
                ✍️ Outils de dessin
              </span>
              {drawingToolsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <Button
                variant={activeTool === 'select' ? 'default' : 'outline'}
                size="sm"
                onClick={() => onToolChange('select')}
              >
                <MousePointer size={16} />
                <span className="ml-1 text-xs">Sélect</span>
              </Button>
              
              <Button
                variant={activeTool === 'draw' ? 'default' : 'outline'}
                size="sm"
                onClick={() => onToolChange('draw')}
              >
                <Pencil size={16} />
                <span className="ml-1 text-xs">Crayon</span>
              </Button>
              
              <Button
                variant={activeTool === 'highlight' ? 'default' : 'outline'}
                size="sm"
                onClick={() => onToolChange('highlight')}
                className="bg-yellow-200 hover:bg-yellow-300 text-yellow-800"
              >
                ✏️
                <span className="ml-1 text-xs">Surlig</span>
              </Button>
            </div>
            
            <div className="flex items-center gap-2">
              <ColorPicker activeColor={activeColor} onColorChange={onColorChange} />
              <div className="flex items-center gap-1 text-xs">
                <span>Taille:</span>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={brushSize}
                  onChange={(e) => onBrushSizeChange(parseInt(e.target.value))}
                  className="w-16"
                />
                <span className="w-6">{brushSize}</span>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Text & Notes */}
        <Collapsible open={textNotesOpen} onOpenChange={setTextNotesOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between">
              <span className="flex items-center gap-2">
                🅰️ Texte & Notes
              </span>
              {textNotesOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <Button
                variant={activeTool === 'text' ? 'default' : 'outline'}
                size="sm"
                onClick={() => onToolChange('text')}
              >
                <Type size={16} />
                <span className="ml-1 text-xs">Texte</span>
              </Button>
              
              <Button
                variant={activeTool === 'note' ? 'default' : 'outline'}
                size="sm"
                onClick={() => onToolChange('note')}
              >
                <StickyNote size={16} />
                <span className="ml-1 text-xs">Note</span>
              </Button>
            </div>
            
            <div className="flex items-center gap-1 text-xs">
              <span>Police:</span>
              <input
                type="range"
                min="12"
                max="72"
                value={fontSize}
                onChange={(e) => onFontSizeChange(parseInt(e.target.value))}
                className="w-16"
              />
              <span className="w-8">{fontSize}px</span>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Shapes */}
        <Collapsible open={shapesOpen} onOpenChange={setShapesOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between">
              <span className="flex items-center gap-2">
                📐 Formes
              </span>
              {shapesOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={activeTool === 'circle' ? 'default' : 'outline'}
                size="sm"
                onClick={() => onToolChange('circle')}
              >
                <Circle size={16} />
                <span className="ml-1 text-xs">Cercle</span>
              </Button>
              
              <Button
                variant={activeTool === 'rectangle' ? 'default' : 'outline'}
                size="sm"
                onClick={() => onToolChange('rectangle')}
              >
                <Square size={16} />
                <span className="ml-1 text-xs">Rect</span>
              </Button>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Actions */}
        <Collapsible open={actionsOpen} onOpenChange={setActionsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between">
              <span className="flex items-center gap-2">
                🗑️ Actions
              </span>
              {actionsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={onUndo}>
                <Undo size={16} />
                <span className="ml-1 text-xs">Annuler</span>
              </Button>
              
              <Button variant="outline" size="sm" onClick={onClear}>
                <Trash2 size={16} />
                <span className="ml-1 text-xs">Effacer</span>
              </Button>
              
              <Button variant="default" size="sm" onClick={onSave} disabled={isSaving}>
                <Save size={16} />
                <span className="ml-1 text-xs">Sauver</span>
                {isSaving && <span className="ml-1">...</span>}
              </Button>
              
              <Button variant="outline" size="sm" onClick={onDownloadImage}>
                <Download size={16} />
                <span className="ml-1 text-xs">IMG</span>
              </Button>
              
              <Button variant="outline" size="sm" onClick={onDownloadPDF}>
                <FileText size={16} />
                <span className="ml-1 text-xs">PDF</span>
              </Button>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Desktop: Horizontal layout */}
      <div className="hidden lg:flex items-center gap-2 flex-wrap">
        {/* Drawing Tools */}
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

        <ColorPicker activeColor={activeColor} onColorChange={onColorChange} />

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

        {/* Font Size */}
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
          <Button variant="outline" size="sm" onClick={onUndo} title="Annuler">
            <Undo size={16} />
          </Button>
          
          <Button variant="outline" size="sm" onClick={onClear} title="Tout effacer">
            <Trash2 size={16} />
          </Button>
          
          <Button variant="default" size="sm" onClick={onSave} disabled={isSaving} title="Sauvegarder">
            <Save size={16} />
            {isSaving && <span className="ml-1">...</span>}
          </Button>
          
          <Button variant="outline" size="sm" onClick={onDownloadImage} title="Télécharger image">
            <Download size={16} />
          </Button>
          
          <Button variant="outline" size="sm" onClick={onDownloadPDF} title="Télécharger PDF">
            <FileText size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ResponsiveAnnotationToolbar;
