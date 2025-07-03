import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ColorPickerProps {
  activeColor: string;
  onColorChange: (color: string) => void;
  compact?: boolean;
}

const predefinedColors = [
  '#ff0000', '#ff6600', '#ffff00', '#00ff00', 
  '#0000ff', '#8000ff', '#000000', '#ffffff',
  '#ff69b4', '#00ffff', '#ffa500', '#808080'
];

const ColorPicker: React.FC<ColorPickerProps> = ({ 
  activeColor, 
  onColorChange, 
  compact = false 
}) => {
  const [customColor, setCustomColor] = useState(activeColor);

  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value;
    setCustomColor(color);
    onColorChange(color);
  };

  if (compact) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="w-full justify-start p-2">
            <div 
              className="w-4 h-4 rounded border mr-2"
              style={{ backgroundColor: activeColor }}
            />
            <span className="text-xs">Couleur</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3">
          <div className="space-y-3">
            <Label className="text-sm font-medium">Couleurs</Label>
            <div className="grid grid-cols-6 gap-2">
              {predefinedColors.map((color) => (
                <button
                  key={color}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    activeColor === color 
                      ? 'border-gray-800 scale-110' 
                      : 'border-gray-300 hover:scale-105'
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => onColorChange(color)}
                  title={color}
                />
              ))}
            </div>
            
            <div className="flex gap-2">
              <Input
                type="color"
                value={customColor}
                onChange={handleCustomColorChange}
                className="w-12 h-8 p-1 border rounded flex-shrink-0"
              />
              <Input
                type="text"
                value={customColor}
                onChange={(e) => handleCustomColorChange(e)}
                placeholder="#000000"
                className="flex-1 text-xs"
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          🎨
          <div 
            className="w-4 h-4 rounded border"
            style={{ backgroundColor: activeColor }}
          />
          <span className="hidden sm:inline">Couleur</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3">
        <div className="space-y-3">
          <Label className="text-sm font-medium">Couleurs prédéfinies</Label>
          <div className="grid grid-cols-6 gap-2">
            {predefinedColors.map((color) => (
              <button
                key={color}
                className={`w-8 h-8 rounded-full border-2 transition-all ${
                  activeColor === color 
                    ? 'border-gray-800 scale-110' 
                    : 'border-gray-300 hover:scale-105'
                }`}
                style={{ backgroundColor: color }}
                onClick={() => onColorChange(color)}
                title={color}
              />
            ))}
          </div>
          
          <div className="space-y-2">
            <Label className="text-sm font-medium">Couleur personnalisée</Label>
            <div className="flex gap-2">
              <Input
                type="color"
                value={customColor}
                onChange={handleCustomColorChange}
                className="w-12 h-8 p-1 border rounded"
              />
              <Input
                type="text"
                value={customColor}
                onChange={(e) => handleCustomColorChange(e)}
                placeholder="#000000"
                className="flex-1 text-xs"
              />
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default ColorPicker;
