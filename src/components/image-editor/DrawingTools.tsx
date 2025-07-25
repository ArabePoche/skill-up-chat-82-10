import React from 'react';
import { Button } from '@/components/ui/button';
import { MousePointer, Pencil, Eraser, Highlighter, PaintBucket } from 'lucide-react';
import { DrawingTool } from './ImageEditor';
import BrushControls from './BrushControls';

interface DrawingToolsProps {
  activeTool: string;
  onToolChange: (tool: string) => void;
  brushSize?: number;
  brushColor?: string;
  brushOpacity?: number;
  onBrushSizeChange?: (size: number) => void;
  onBrushColorChange?: (color: string) => void;
  onBrushOpacityChange?: (opacity: number) => void;
}

const tools: { id: DrawingTool; icon: any; label: string }[] = [
  { id: 'select', icon: MousePointer, label: 'Sélectionner' },
  { id: 'pencil', icon: Pencil, label: 'Crayon' },
  { id: 'eraser', icon: Eraser, label: 'Gomme' },
  { id: 'highlighter', icon: Highlighter, label: 'Surligneur' },
  { id: 'bucket', icon: PaintBucket, label: 'Pot de peinture' },
];

const DrawingTools: React.FC<DrawingToolsProps> = ({ 
  activeTool, 
  onToolChange,
  brushSize = 5,
  brushColor = '#000000',
  brushOpacity = 1,
  onBrushSizeChange,
  onBrushColorChange,
  onBrushOpacityChange
}) => {
  return (
    <div className="p-4">
      <h3 className="text-sm font-medium mb-3">Outils de dessin</h3>
      <div className="grid grid-cols-2 gap-2 mb-4">
        {tools.map(({ id, icon: Icon, label }) => (
          <Button
            key={id}
            variant={activeTool === id ? "default" : "outline"}
            size="sm"
            onClick={() => onToolChange(id)}
            className="flex flex-col gap-1 h-16 p-2"
          >
            <Icon size={20} />
            <span className="text-xs">{label}</span>
          </Button>
        ))}
      </div>
      
      {activeTool !== 'select' && onBrushSizeChange && onBrushColorChange && onBrushOpacityChange && (
        <BrushControls
          brushSize={brushSize}
          brushColor={brushColor}
          brushOpacity={brushOpacity}
          onBrushSizeChange={onBrushSizeChange}
          onBrushColorChange={onBrushColorChange}
          onBrushOpacityChange={onBrushOpacityChange}
        />
      )}
    </div>
  );
};

export default DrawingTools;