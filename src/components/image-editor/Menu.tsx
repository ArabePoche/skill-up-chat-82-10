import React, { useState } from 'react';
import { MenuType } from './ImageEditor';
import { Pencil, Square, Type, RotateCw, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import DrawingTools from './DrawingTools';
import ShapeTools from './ShapeTools';
import TextTools from './TextTools';
import TransformTools from './TransformTools';
import { cn } from '@/lib/utils';

interface MenuProps {
  activeMenu: MenuType | null;
  activeTool: string;
  isMobile: boolean;
  showDynamicSection: boolean;
  onMenuChange: (menu: MenuType) => void;
  onToolChange: (tool: string) => void;
  onCloseDynamicSection: () => void;
  brushSize?: number;
  brushColor?: string;
  brushOpacity?: number;
  onBrushSizeChange?: (size: number) => void;
  onBrushColorChange?: (color: string) => void;
  onBrushOpacityChange?: (opacity: number) => void;
}

const menuIcons = {
  drawing: Pencil,
  shapes: Square,
  text: Type,
  transform: RotateCw,
  export: Download,
};

const Menu: React.FC<MenuProps> = ({
  activeMenu,
  activeTool,
  isMobile,
  showDynamicSection,
  onMenuChange,
  onToolChange,
  onCloseDynamicSection,
  brushSize,
  brushColor,
  brushOpacity,
  onBrushSizeChange,
  onBrushColorChange,
  onBrushOpacityChange
}) => {
  const handleToolSelection = (tool: string) => {
    onToolChange(tool);
  };

  const renderMenuContent = () => {
    switch (activeMenu) {
      case 'drawing':
        return (
          <DrawingTools 
            activeTool={activeTool} 
            onToolChange={handleToolSelection} 
            brushSize={brushSize}
            brushColor={brushColor}
            brushOpacity={brushOpacity}
            onBrushSizeChange={onBrushSizeChange}
            onBrushColorChange={onBrushColorChange}
            onBrushOpacityChange={onBrushOpacityChange}
          />
        );
      case 'shapes':
        return <ShapeTools activeTool={activeTool} onToolChange={handleToolSelection} />;
      case 'text':
        return <TextTools activeTool={activeTool} onToolChange={handleToolSelection} />;
      case 'transform':
        return <TransformTools activeTool={activeTool} onToolChange={handleToolSelection} />;
      case 'export':
        return <div className="p-4 text-center text-muted-foreground">Options d'export</div>;
      default:
        return null;
    }
  };

  if (isMobile) {
    return (
      <>
        {/* Section dynamique - Au-dessus de la barre de menu */}
        {showDynamicSection && activeMenu && (
          <div className="fixed bottom-16 left-0 right-0 bg-background border-t border-border shadow-lg z-50">
            {renderMenuContent()}
          </div>
        )}
        
        {/* Barre de menu - Fixe en bas */}
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-40">
          <div className="flex justify-around py-2">
            {(Object.entries(menuIcons) as [MenuType, any][]).map(([menu, Icon]) => (
              <Button
                key={menu}
                variant={activeMenu === menu && showDynamicSection ? "default" : "ghost"}
                size="sm"
                onClick={() => onMenuChange(menu)}
                className="flex-col h-12 w-12 p-1"
              >
                <Icon size={20} />
              </Button>
            ))}
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="w-80 bg-background border-l border-border flex flex-col">
      {/* Menu Header - Fixed */}
      <div className="border-b border-border p-4">
        <div className="flex gap-2 justify-center">
          {(Object.entries(menuIcons) as [MenuType, any][]).map(([menu, Icon]) => (
            <Button
              key={menu}
              variant={activeMenu === menu ? "default" : "outline"}
              size="sm"
              onClick={() => onMenuChange(menu)}
              className="p-2"
              title={menu}
            >
              <Icon size={16} />
            </Button>
          ))}
        </div>
      </div>
      
      {/* Menu Content - Dynamic */}
      <div className="flex-1 overflow-auto">
        {renderMenuContent()}
      </div>
    </div>
  );
};

export default Menu;