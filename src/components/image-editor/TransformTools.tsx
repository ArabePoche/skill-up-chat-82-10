import React from 'react';
import { Button } from '@/components/ui/button';
import { RotateCcw, RotateCw, FlipHorizontal, FlipVertical, Crop, ZoomIn, ZoomOut } from 'lucide-react';

interface TransformToolsProps {
  activeTool: string;
  onToolChange: (tool: string) => void;
}

const tools = [
  { id: 'rotate-left', icon: RotateCcw, label: 'Rotation ←' },
  { id: 'rotate-right', icon: RotateCw, label: 'Rotation →' },
  { id: 'flip-horizontal', icon: FlipHorizontal, label: 'Miroir ↔' },
  { id: 'flip-vertical', icon: FlipVertical, label: 'Miroir ↕' },
  { id: 'crop', icon: Crop, label: 'Rogner' },
  { id: 'zoom-in', icon: ZoomIn, label: 'Zoom +' },
  { id: 'zoom-out', icon: ZoomOut, label: 'Zoom -' },
];

const TransformTools: React.FC<TransformToolsProps> = ({ activeTool, onToolChange }) => {
  return (
    <div className="p-4">
      <h3 className="text-sm font-medium mb-3">Outils de transformation</h3>
      <div className="grid grid-cols-2 gap-2">
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
    </div>
  );
};

export default TransformTools;