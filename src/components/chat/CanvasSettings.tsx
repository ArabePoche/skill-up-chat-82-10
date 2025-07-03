
import React from 'react';
import { Separator } from '@/components/ui/separator';

interface CanvasSettingsProps {
  brushSize: number;
  fontSize: number;
  onBrushSizeChange: (size: number) => void;
  onFontSizeChange: (size: number) => void;
}

const CanvasSettings: React.FC<CanvasSettingsProps> = ({
  brushSize,
  fontSize,
  onBrushSizeChange,
  onFontSizeChange
}) => {
  return (
    <>
      <Separator orientation="vertical" className="h-6" />
      
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
    </>
  );
};

export default CanvasSettings;
