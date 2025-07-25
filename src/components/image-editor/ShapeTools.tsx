import React from 'react';
import { Button } from '@/components/ui/button';
import { Square, Circle, ArrowRight } from 'lucide-react';
import { ShapeTool } from './ImageEditor';

interface ShapeToolsProps {
  activeTool: string;
  onToolChange: (tool: string) => void;
}

const tools: { id: ShapeTool; icon: any; label: string }[] = [
  { id: 'rectangle', icon: Square, label: 'Rectangle' },
  { id: 'circle', icon: Circle, label: 'Cercle' },
  { id: 'arrow', icon: ArrowRight, label: 'Flèche' },
];

const ShapeTools: React.FC<ShapeToolsProps> = ({ activeTool, onToolChange }) => {
  return (
    <div className="p-4">
      <h3 className="text-sm font-medium mb-3">Formes</h3>
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

export default ShapeTools;