
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Type,
  Pencil,
  Square,
  Settings,
  Palette,
  ChevronDown,
  Highlighter,
  MousePointer,
  Circle,
  ArrowRight,
  Undo,
  Trash2
} from 'lucide-react';

interface ModernAnnotationToolbarProps {
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
  onRotate: () => void;
  onCrop: () => void;
}

type MenuType = 'text' | 'draw' | 'shapes' | 'actions' | 'colors' | null;

const ModernAnnotationToolbar: React.FC<ModernAnnotationToolbarProps> = ({
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
  onRotate,
  onCrop
}) => {
  const [activeMenu, setActiveMenu] = useState<MenuType>(null);

  const colors = [
    '#ff0000', '#00ff00', '#0000ff', '#ffff00', 
    '#ff00ff', '#00ffff', '#000000', '#ffffff',
    '#ff8800', '#8800ff', '#00ff80', '#ff0080'
  ];

  const toggleMenu = (menu: MenuType) => {
    setActiveMenu(activeMenu === menu ? null : menu);
  };

  return (
    <div className="bg-white border-t border-b shadow-sm">
      {/* Menu contextuel */}
      {activeMenu && (
        <div className="border-b bg-gray-50 px-4 py-3">
          <div className="flex items-center gap-3 flex-wrap">
            
            {/* Menu Texte */}
            {activeMenu === 'text' && (
              <>
                <Button
                  variant={activeTool === 'text' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onToolChange('text')}
                  className="flex items-center gap-2"
                >
                  <Type size={16} />
                  Ajouter texte
                </Button>
                <Button
                  variant={activeTool === 'note' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onToolChange('note')}
                  className="flex items-center gap-2"
                >
                  <Type size={16} />
                  Ajouter note
                </Button>
                
                <div className="h-6 w-px bg-gray-300 mx-2" />
                
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Taille:</span>
                  <input
                    type="range"
                    min="12"
                    max="48"
                    value={fontSize}
                    onChange={(e) => onFontSizeChange(parseInt(e.target.value))}
                    className="w-20"
                  />
                  <span className="text-sm w-10 text-center">{fontSize}px</span>
                </div>
              </>
            )}

            {/* Menu Dessin */}
            {activeMenu === 'draw' && (
              <>
                <Button
                  variant={activeTool === 'draw' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onToolChange('draw')}
                  className="flex items-center gap-2"
                >
                  <Pencil size={16} />
                  Crayon
                </Button>
                <Button
                  variant={activeTool === 'highlight' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onToolChange('highlight')}
                  className="flex items-center gap-2 bg-yellow-100 hover:bg-yellow-200"
                >
                  <Highlighter size={16} />
                  Surligneur
                </Button>
                <Button
                  variant={activeTool === 'select' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onToolChange('select')}
                  className="flex items-center gap-2"
                >
                  <MousePointer size={16} />
                  Sélection
                </Button>
                
                <div className="h-6 w-px bg-gray-300 mx-2" />
                
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Épaisseur:</span>
                  <input
                    type="range"
                    min="1"
                    max="20"
                    value={brushSize}
                    onChange={(e) => onBrushSizeChange(parseInt(e.target.value))}
                    className="w-20"
                  />
                  <span className="text-sm w-10 text-center">{brushSize}px</span>
                </div>
              </>
            )}

            {/* Menu Formes */}
            {activeMenu === 'shapes' && (
              <>
                <Button
                  variant={activeTool === 'circle' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onToolChange('circle')}
                  className="flex items-center gap-2"
                >
                  <Circle size={16} />
                  Cercle
                </Button>
                <Button
                  variant={activeTool === 'rectangle' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onToolChange('rectangle')}
                  className="flex items-center gap-2"
                >
                  <Square size={16} />
                  Rectangle
                </Button>
                <Button
                  variant={activeTool === 'arrow' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onToolChange('arrow')}
                  className="flex items-center gap-2"
                >
                  <ArrowRight size={16} />
                  Flèche
                </Button>
              </>
            )}

            {/* Menu Actions */}
            {activeMenu === 'actions' && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onUndo}
                  className="flex items-center gap-2"
                >
                  <Undo size={16} />
                  Annuler
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onClear}
                  className="flex items-center gap-2 text-red-600 hover:text-red-700"
                >
                  <Trash2 size={16} />
                  Effacer
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRotate}
                  className="flex items-center gap-2"
                >
                  Rotation 90°
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onCrop}
                  className="flex items-center gap-2"
                >
                  Rogner
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.location.reload()}
                  className="flex items-center gap-2"
                >
                  Réinitialiser
                </Button>
              </>
            )}

            {/* Menu Couleurs */}
            {activeMenu === 'colors' && (
              <div className="grid grid-cols-6 gap-2 max-w-xs">
                {colors.map(color => (
                  <button
                    key={color}
                    className={`w-8 h-8 rounded-lg border-2 transition-all hover:scale-110 ${
                      activeColor === color 
                        ? 'border-gray-800 ring-2 ring-blue-500' 
                        : 'border-gray-300 hover:border-gray-500'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => onColorChange(color)}
                    title={`Couleur ${color}`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Barre principale horizontale */}
      <div className="flex items-center justify-center gap-6 p-4">
        {/* Icône Texte */}
        <Button
          variant="ghost"
          onClick={() => toggleMenu('text')}
          className={`flex flex-col items-center gap-1 h-auto p-3 transition-all hover:bg-blue-50 ${
            activeMenu === 'text' ? 'bg-blue-100 text-blue-700' : ''
          }`}
        >
          <div className="text-xl">🅰️</div>
          <span className="text-xs font-medium">Texte</span>
        </Button>

        {/* Icône Dessin */}
        <Button
          variant="ghost"
          onClick={() => toggleMenu('draw')}
          className={`flex flex-col items-center gap-1 h-auto p-3 transition-all hover:bg-blue-50 ${
            activeMenu === 'draw' ? 'bg-blue-100 text-blue-700' : ''
          }`}
        >
          <div className="text-xl">✍️</div>
          <span className="text-xs font-medium">Dessin</span>
        </Button>

        {/* Icône Formes */}
        <Button
          variant="ghost"
          onClick={() => toggleMenu('shapes')}
          className={`flex flex-col items-center gap-1 h-auto p-3 transition-all hover:bg-blue-50 ${
            activeMenu === 'shapes' ? 'bg-blue-100 text-blue-700' : ''
          }`}
        >
          <div className="text-xl">📐</div>
          <span className="text-xs font-medium">Formes</span>
        </Button>

        {/* Palette de couleurs */}
        <Button
          variant="ghost"
          onClick={() => toggleMenu('colors')}
          className={`flex flex-col items-center gap-1 h-auto p-3 transition-all hover:bg-blue-50 ${
            activeMenu === 'colors' ? 'bg-blue-100 text-blue-700' : ''
          }`}
        >
          <div 
            className="w-6 h-6 rounded border-2 border-gray-300"
            style={{ backgroundColor: activeColor }}
          />
          <span className="text-xs font-medium">Couleurs</span>
        </Button>

        {/* Icône Actions */}
        <Button
          variant="ghost"
          onClick={() => toggleMenu('actions')}
          className={`flex flex-col items-center gap-1 h-auto p-3 transition-all hover:bg-blue-50 ${
            activeMenu === 'actions' ? 'bg-blue-100 text-blue-700' : ''
          }`}
        >
          <div className="text-xl">⚙️</div>
          <span className="text-xs font-medium">Actions</span>
        </Button>
      </div>
    </div>
  );
};

export default ModernAnnotationToolbar;
