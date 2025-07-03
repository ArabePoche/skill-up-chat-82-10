
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Type,
  Pencil,
  Square,
  Settings,
  Highlighter,
  MousePointer,
  Circle,
  RotateCw,
  Crop,
  Undo,
  Trash2,
  Save,
  FileImage,
  FileText
} from 'lucide-react';

interface CompactAnnotationToolbarProps {
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
  onRotate: () => void;
  isSaving: boolean;
}

type MenuType = 'text' | 'draw' | 'shapes' | 'actions' | null;

const CompactAnnotationToolbar: React.FC<CompactAnnotationToolbarProps> = ({
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
  onRotate,
  isSaving
}) => {
  const [activeMenu, setActiveMenu] = useState<MenuType>(null);

  const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#000000'];

  const toggleMenu = (menu: MenuType) => {
    setActiveMenu(activeMenu === menu ? null : menu);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t shadow-lg">
      {/* Menu contextuel compact */}
      {activeMenu && (
        <div className="border-b bg-gray-50 px-4 py-2">
          <div className="flex items-center gap-2 overflow-x-auto">
            
            {/* Menu Texte */}
            {activeMenu === 'text' && (
              <>
                <Button
                  variant={activeTool === 'text' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => onToolChange('text')}
                  className="whitespace-nowrap"
                >
                  <Type size={16} />
                  <span className="ml-1">Texte</span>
                </Button>
                <Button
                  variant={activeTool === 'highlight' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => onToolChange('highlight')}
                  className="whitespace-nowrap bg-yellow-100 hover:bg-yellow-200"
                >
                  <Highlighter size={16} />
                  <span className="ml-1">Surligner</span>
                </Button>
                
                <div className="h-6 w-px bg-gray-300 mx-2" />
                
                {/* Taille police */}
                <div className="flex items-center gap-2">
                  <span className="text-sm">Police:</span>
                  <input
                    type="range"
                    min="12"
                    max="48"
                    value={fontSize}
                    onChange={(e) => onFontSizeChange(parseInt(e.target.value))}
                    className="w-16"
                  />
                  <span className="text-sm w-8">{fontSize}px</span>
                </div>
                
                <div className="h-6 w-px bg-gray-300 mx-2" />
                
                {/* Couleurs */}
                <div className="flex gap-1">
                  {colors.map(color => (
                    <button
                      key={color}
                      className={`w-6 h-6 rounded border-2 ${activeColor === color ? 'border-gray-800' : 'border-gray-300'}`}
                      style={{ backgroundColor: color }}
                      onClick={() => onColorChange(color)}
                      title={`Couleur ${color}`}
                    />
                  ))}
                </div>
              </>
            )}

            {/* Menu Dessin */}
            {activeMenu === 'draw' && (
              <>
                <Button
                  variant={activeTool === 'select' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => onToolChange('select')}
                  className="whitespace-nowrap"
                >
                  <MousePointer size={16} />
                  <span className="ml-1">Sélectionner</span>
                </Button>
                <Button
                  variant={activeTool === 'draw' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => onToolChange('draw')}
                  className="whitespace-nowrap"
                >
                  <Pencil size={16} />
                  <span className="ml-1">Crayon</span>
                </Button>
                
                <div className="h-6 w-px bg-gray-300 mx-2" />
                
                {/* Taille pinceau */}
                <div className="flex items-center gap-2">
                  <span className="text-sm">Taille:</span>
                  <input
                    type="range"
                    min="1"
                    max="20"
                    value={brushSize}
                    onChange={(e) => onBrushSizeChange(parseInt(e.target.value))}
                    className="w-16"
                  />
                  <span className="text-sm w-8">{brushSize}px</span>
                </div>
                
                <div className="h-6 w-px bg-gray-300 mx-2" />
                
                {/* Couleurs */}
                <div className="flex gap-1">
                  {colors.map(color => (
                    <button
                      key={color}
                      className={`w-6 h-6 rounded border-2 ${activeColor === color ? 'border-gray-800' : 'border-gray-300'}`}
                      style={{ backgroundColor: color }}
                      onClick={() => onColorChange(color)}
                      title={`Couleur ${color}`}
                    />
                  ))}
                </div>
              </>
            )}

            {/* Menu Formes */}
            {activeMenu === 'shapes' && (
              <>
                <Button
                  variant={activeTool === 'rectangle' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => onToolChange('rectangle')}
                  className="whitespace-nowrap"
                >
                  <Square size={16} />
                  <span className="ml-1">Rectangle</span>
                </Button>
                <Button
                  variant={activeTool === 'circle' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => onToolChange('circle')}
                  className="whitespace-nowrap"
                >
                  <Circle size={16} />
                  <span className="ml-1">Cercle</span>
                </Button>
                
                <div className="h-6 w-px bg-gray-300 mx-2" />
                
                {/* Couleurs */}
                <div className="flex gap-1">
                  {colors.map(color => (
                    <button
                      key={color}
                      className={`w-6 h-6 rounded border-2 ${activeColor === color ? 'border-gray-800' : 'border-gray-300'}`}
                      style={{ backgroundColor: color }}
                      onClick={() => onColorChange(color)}
                      title={`Couleur ${color}`}
                    />
                  ))}
                </div>
              </>
            )}

            {/* Menu Actions */}
            {activeMenu === 'actions' && (
              <>
                <Button variant="ghost" size="sm" onClick={onRotate} className="whitespace-nowrap">
                  <RotateCw size={16} />
                  <span className="ml-1">Rotation</span>
                </Button>
                <Button variant="ghost" size="sm" onClick={onCrop} className="whitespace-nowrap">
                  <Crop size={16} />
                  <span className="ml-1">Rogner</span>
                </Button>
                <Button variant="ghost" size="sm" onClick={onUndo} className="whitespace-nowrap">
                  <Undo size={16} />
                  <span className="ml-1">Annuler</span>
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={onClear} 
                  className="whitespace-nowrap text-red-600 hover:text-red-700"
                >
                  <Trash2 size={16} />
                  <span className="ml-1">Effacer</span>
                </Button>
                
                <div className="h-6 w-px bg-gray-300 mx-2" />
                
                <Button 
                  variant="default" 
                  size="sm" 
                  onClick={onSave} 
                  disabled={isSaving}
                  className="whitespace-nowrap"
                >
                  <Save size={16} />
                  <span className="ml-1">Sauver</span>
                  {isSaving && <span className="ml-1">...</span>}
                </Button>
                <Button variant="ghost" size="sm" onClick={onDownloadImage} className="whitespace-nowrap">
                  <FileImage size={16} />
                  <span className="ml-1">Image</span>
                </Button>
                <Button variant="ghost" size="sm" onClick={onDownloadPDF} className="whitespace-nowrap">
                  <FileText size={16} />
                  <span className="ml-1">PDF</span>
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Barre principale compacte */}
      <div className="flex items-center justify-center gap-1 p-2">
        <Button
          variant={activeMenu === 'text' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => toggleMenu('text')}
          className={`flex flex-col items-center p-2 h-auto ${
            activeMenu === 'text' ? 'bg-blue-500 text-white hover:bg-blue-600' : ''
          }`}
          title="Texte et surlignage"
        >
          <Type size={18} />
          <span className="text-xs mt-1">Texte</span>
        </Button>
        
        <Button
          variant={activeMenu === 'draw' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => toggleMenu('draw')}
          className={`flex flex-col items-center p-2 h-auto ${
            activeMenu === 'draw' ? 'bg-blue-500 text-white hover:bg-blue-600' : ''
          }`}
          title="Crayon et sélection"
        >
          <Pencil size={18} />
          <span className="text-xs mt-1">Dessin</span>
        </Button>
        
        <Button
          variant={activeMenu === 'shapes' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => toggleMenu('shapes')}
          className={`flex flex-col items-center p-2 h-auto ${
            activeMenu === 'shapes' ? 'bg-blue-500 text-white hover:bg-blue-600' : ''
          }`}
          title="Formes géométriques"
        >
          <Square size={18} />
          <span className="text-xs mt-1">Formes</span>
        </Button>
        
        <Button
          variant={activeMenu === 'actions' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => toggleMenu('actions')}
          className={`flex flex-col items-center p-2 h-auto ${
            activeMenu === 'actions' ? 'bg-blue-500 text-white hover:bg-blue-600' : ''
          }`}
          title="Actions et sauvegarde"
        >
          <Settings size={18} />
          <span className="text-xs mt-1">Actions</span>
        </Button>
      </div>
    </div>
  );
};

export default CompactAnnotationToolbar;
