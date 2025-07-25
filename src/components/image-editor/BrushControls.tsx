import React from 'react';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';

interface BrushControlsProps {
  brushSize: number;
  brushColor: string;
  brushOpacity: number;
  onBrushSizeChange: (size: number) => void;
  onBrushColorChange: (color: string) => void;
  onBrushOpacityChange: (opacity: number) => void;
}

const BrushControls: React.FC<BrushControlsProps> = ({
  brushSize,
  brushColor,
  brushOpacity,
  onBrushSizeChange,
  onBrushColorChange,
  onBrushOpacityChange
}) => {
  return (
    <div className="p-4 space-y-4">
      <div>
        <Label className="text-xs">Taille: {brushSize}px</Label>
        <Slider
          value={[brushSize]}
          onValueChange={(value) => onBrushSizeChange(value[0])}
          min={1}
          max={50}
          step={1}
          className="mt-2"
        />
      </div>
      
      <div>
        <Label className="text-xs">Couleur</Label>
        <div className="flex items-center gap-2 mt-2">
          <input
            type="color"
            value={brushColor}
            onChange={(e) => onBrushColorChange(e.target.value)}
            className="w-8 h-8 rounded border border-border cursor-pointer"
          />
          <span className="text-xs text-muted-foreground">{brushColor}</span>
        </div>
      </div>
      
      <div>
        <Label className="text-xs">Opacité: {Math.round(brushOpacity * 100)}%</Label>
        <Slider
          value={[brushOpacity]}
          onValueChange={(value) => onBrushOpacityChange(value[0])}
          min={0.1}
          max={1}
          step={0.1}
          className="mt-2"
        />
      </div>
    </div>
  );
};

export default BrushControls;