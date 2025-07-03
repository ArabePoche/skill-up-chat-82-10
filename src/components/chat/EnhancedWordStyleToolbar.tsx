
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Pencil, 
  MousePointer, 
  Type, 
  Square, 
  Circle,
  StickyNote,
  Highlighter,
  Undo,
  Trash2,
  Save,
  Download,
  FileText,
  Settings,
  Crop,
  RotateCw,
  Palette
} from 'lucide-react';

interface EnhancedWordStyleToolbarProps {
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
  onCrop: () => void;
  isSaving: boolean;
}

type ContextualMenu = 'draw' | 'text' | 'shapes' | 'actions' | 'transform' | null;

const EnhancedWordStyleToolbar: React.FC<EnhancedWordStyleToolbarProps> = ({
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
  onCrop,
  isSaving
}) => {
  const [activeContextMenu, setActiveContextMenu] = useState<ContextualMenu>(null);

  const toggleContextMenu = (menu: ContextualMenu) => {
    setActiveContextMenu(activeContextMenu === menu ? null : menu);
  };

  const colors = [
    '#ff0000', '#00ff00', '#0000ff', '#ffff00', 
    '#ff00ff', '#00ffff', '#000000', '#ffffff',
    '#ff6b35', '#4ecdc4', '#45b7d1', '#f9ca24',
    '#6c5ce7', '#fd79a8', '#00b894', '#fdcb6e'
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white shadow-2xl border-t-2 border-gray-200">
      {/* Contextual Menu - Visually distinct from main toolbar */}
      {activeContextMenu && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-t border-blue-200 p-3 shadow-inner">
          <div className="max-w-full overflow-x-auto">
            <div className="flex items-center gap-3 min-w-max px-4">
              
              {/* Draw Context */}
              {activeContextMenu === 'draw' && (
                <>
                  <div className="flex items-center gap-2 bg-white rounded-lg p-2 shadow-sm">
                    <Button
                      variant={activeTool === 'select' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => onToolChange('select')}
                      title="Sélectionner"
                    >
                      <MousePointer size={16} />
                    </Button>
                    <Button
                      variant={activeTool === 'draw' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => onToolChange('draw')}
                      title="Crayon"
                    >
                      <Pencil size={16} />
                    </Button>
                    <Button
                      variant={activeTool === 'highlight' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => onToolChange('highlight')}
                      title="Surligneur"
                      className="bg-yellow-100 hover:bg-yellow-200"
                    >
                      <Highlighter size={16} />
                    </Button>
                  </div>
                  
                  <Separator orientation="vertical" className="h-8" />
                  
                  {/* Colors */}
                  <div className="flex items-center gap-2 bg-white rounded-lg p-2 shadow-sm">
                    <Palette size={16} className="text-gray-600" />
                    <div className="flex gap-1">
                      {colors.map((color) => (
                        <button
                          key={color}
                          className={`w-7 h-7 rounded-full border-2 transition-all ${
                            activeColor === color 
                              ? 'border-gray-800 scale-110' 
                              : 'border-gray-300 hover:border-gray-500'
                          }`}
                          style={{ backgroundColor: color }}
                          onClick={() => onColorChange(color)}
                          title={`Couleur ${color}`}
                        />
                      ))}
                    </div>
                  </div>
                  
                  <Separator orientation="vertical" className="h-8" />
                  
                  {/* Brush Size */}
                  <div className="flex items-center gap-3 bg-white rounded-lg p-3 shadow-sm">
                    <span className="text-sm font-medium text-gray-700">Taille:</span>
                    <input
                      type="range"
                      min="1"
                      max="20"
                      value={brushSize}
                      onChange={(e) => onBrushSizeChange(parseInt(e.target.value))}
                      className="w-24 accent-blue-500"
                    />
                    <span className="text-sm font-mono w-8 text-center">{brushSize}px</span>
                  </div>
                </>
              )}

              {/* Text Context */}
              {activeContextMenu === 'text' && (
                <>
                  <div className="flex items-center gap-2 bg-white rounded-lg p-2 shadow-sm">
                    <Button
                      variant={activeTool === 'text' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => onToolChange('text')}
                      title="Ajouter texte"
                    >
                      <Type size={16} />
                      <span className="ml-1 hidden sm:inline">Texte</span>
                    </Button>
                    <Button
                      variant={activeTool === 'note' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => onToolChange('note')}
                      title="Ajouter note"
                    >
                      <StickyNote size={16} />
                      <span className="ml-1 hidden sm:inline">Note</span>
                    </Button>
                  </div>
                  
                  <Separator orientation="vertical" className="h-8" />
                  
                  {/* Font Size */}
                  <div className="flex items-center gap-3 bg-white rounded-lg p-3 shadow-sm">
                    <span className="text-sm font-medium text-gray-700">Police:</span>
                    <input
                      type="range"
                      min="12"
                      max="72"
                      value={fontSize}
                      onChange={(e) => onFontSizeChange(parseInt(e.target.value))}
                      className="w-24 accent-blue-500"
                    />
                    <span className="text-sm font-mono w-12 text-center">{fontSize}px</span>
                  </div>
                  
                  <Separator orientation="vertical" className="h-8" />
                  
                  {/* Text Color */}
                  <div className="flex items-center gap-2 bg-white rounded-lg p-2 shadow-sm">
                    <span className="text-xs text-gray-600">Couleur:</span>
                    <div className="flex gap-1">
                      {colors.slice(0, 8).map((color) => (
                        <button
                          key={color}
                          className={`w-6 h-6 rounded border-2 ${
                            activeColor === color ? 'border-gray-800' : 'border-gray-300'
                          }`}
                          style={{ backgroundColor: color }}
                          onClick={() => onColorChange(color)}
                          title={`Couleur texte ${color}`}
                        />
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Shapes Context */}
              {activeContextMenu === 'shapes' && (
                <>
                  <div className="flex items-center gap-2 bg-white rounded-lg p-2 shadow-sm">
                    <Button
                      variant={activeTool === 'circle' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => onToolChange('circle')}
                      title="Cercle"
                    >
                      <Circle size={16} />
                      <span className="ml-1 hidden sm:inline">Cercle</span>
                    </Button>
                    <Button
                      variant={activeTool === 'rectangle' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => onToolChange('rectangle')}
                      title="Rectangle"
                    >
                      <Square size={16} />
                      <span className="ml-1 hidden sm:inline">Rectangle</span>
                    </Button>
                  </div>
                  
                  <Separator orientation="vertical" className="h-8" />
                  
                  {/* Shape Color */}
                  <div className="flex items-center gap-2 bg-white rounded-lg p-2 shadow-sm">
                    <span className="text-xs text-gray-600">Couleur:</span>
                    <div className="flex gap-1">
                      {colors.slice(0, 8).map((color) => (
                        <button
                          key={color}
                          className={`w-6 h-6 rounded border-2 ${
                            activeColor === color ? 'border-gray-800' : 'border-gray-300'
                          }`}
                          style={{ backgroundColor: color }}
                          onClick={() => onColorChange(color)}
                          title={`Couleur forme ${color}`}
                        />
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Transform Context */}
              {activeContextMenu === 'transform' && (
                <>
                  <div className="flex items-center gap-2 bg-white rounded-lg p-2 shadow-sm">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onToolChange('rotate')}
                      title="Rotation 90°"
                    >
                      <RotateCw size={16} />
                      <span className="ml-1 hidden sm:inline">Rotation</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onCrop}
                      title="Rogner"
                    >
                      <Crop size={16} />
                      <span className="ml-1 hidden sm:inline">Rogner</span>
                    </Button>
                  </div>
                </>
              )}

              {/* Actions Context */}
              {activeContextMenu === 'actions' && (
                <>
                  <div className="flex items-center gap-2 bg-white rounded-lg p-2 shadow-sm">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onUndo}
                      title="Annuler"
                    >
                      <Undo size={16} />
                      <span className="ml-1 hidden sm:inline">Annuler</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onClear}
                      title="Tout effacer"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 size={16} />
                      <span className="ml-1 hidden sm:inline">Effacer</span>
                    </Button>
                  </div>
                  
                  <Separator orientation="vertical" className="h-8" />
                  
                  <div className="flex items-center gap-2 bg-white rounded-lg p-2 shadow-sm">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={onSave}
                      disabled={isSaving}
                      title="Sauvegarder"
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Save size={16} />
                      <span className="ml-1 hidden sm:inline">Sauver</span>
                      {isSaving && <span className="ml-1">...</span>}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onDownloadImage}
                      title="Télécharger image"
                    >
                      <Download size={16} />
                      <span className="ml-1 hidden sm:inline">IMG</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onDownloadPDF}
                      title="Télécharger PDF"
                    >
                      <FileText size={16} />
                      <span className="ml-1 hidden sm:inline">PDF</span>
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Toolbar - Visually distinct with gradient and larger buttons */}
      <div className="bg-gradient-to-r from-gray-800 to-gray-900 p-4 shadow-lg">
        <div className="flex items-center justify-center gap-2">
          <Button
            variant={activeContextMenu === 'draw' ? 'secondary' : 'ghost'}
            size="lg"
            onClick={() => toggleContextMenu('draw')}
            className="flex flex-col items-center p-4 h-auto text-white hover:bg-white/10 transition-all"
            title="Outils de dessin"
          >
            <Pencil size={24} />
            <span className="text-xs mt-1 font-medium">Dessin</span>
          </Button>
          
          <Button
            variant={activeContextMenu === 'text' ? 'secondary' : 'ghost'}
            size="lg"
            onClick={() => toggleContextMenu('text')}
            className="flex flex-col items-center p-4 h-auto text-white hover:bg-white/10 transition-all"
            title="Texte et notes"
          >
            <Type size={24} />
            <span className="text-xs mt-1 font-medium">Texte</span>
          </Button>
          
          <Button
            variant={activeContextMenu === 'shapes' ? 'secondary' : 'ghost'}
            size="lg"
            onClick={() => toggleContextMenu('shapes')}
            className="flex flex-col items-center p-4 h-auto text-white hover:bg-white/10 transition-all"
            title="Formes"
          >
            <Square size={24} />
            <span className="text-xs mt-1 font-medium">Formes</span>
          </Button>
          
          <Button
            variant={activeContextMenu === 'transform' ? 'secondary' : 'ghost'}
            size="lg"
            onClick={() => toggleContextMenu('transform')}
            className="flex flex-col items-center p-4 h-auto text-white hover:bg-white/10 transition-all"
            title="Transformation"
          >
            <RotateCw size={24} />
            <span className="text-xs mt-1 font-medium">Transform</span>
          </Button>
          
          <Button
            variant={activeContextMenu === 'actions' ? 'secondary' : 'ghost'}
            size="lg"
            onClick={() => toggleContextMenu('actions')}
            className="flex flex-col items-center p-4 h-auto text-white hover:bg-white/10 transition-all"
            title="Actions"
          >
            <Settings size={24} />
            <span className="text-xs mt-1 font-medium">Actions</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EnhancedWordStyleToolbar;
