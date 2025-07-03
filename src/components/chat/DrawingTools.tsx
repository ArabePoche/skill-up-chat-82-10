
import React from 'react';
import { Button } from '@/components/ui/button';
import { MousePointer, Pencil, Type, Circle, Square, StickyNote } from 'lucide-react';

interface DrawingToolsProps {
  activeTool: string;
  onToolChange: (tool: any) => void;
}

const DrawingTools: React.FC<DrawingToolsProps> = ({ activeTool, onToolChange }) => {
  return (
    <div className="flex items-center gap-1">
      <Button
        variant={activeTool === 'select' ? 'default' : 'outline'}
        size="sm"
        onClick={() => onToolChange('select')}
        title="Sélectionner"
      >
        <MousePointer size={16} />
      </Button>
      
      <Button
        variant={activeTool === 'draw' ? 'default' : 'outline'}
        size="sm"
        onClick={() => onToolChange('draw')}
        title="Crayon"
      >
        <Pencil size={16} />
      </Button>
      
      <Button
        variant={activeTool === 'highlight' ? 'default' : 'outline'}
        size="sm"
        onClick={() => onToolChange('highlight')}
        title="Surligneur"
        className="bg-yellow-200 hover:bg-yellow-300 text-yellow-800"
      >
        ✏️
      </Button>
      
      <Button
        variant={activeTool === 'text' ? 'default' : 'outline'}
        size="sm"
        onClick={() => onToolChange('text')}
        title="Texte"
      >
        <Type size={16} />
      </Button>
      
      <Button
        variant={activeTool === 'circle' ? 'default' : 'outline'}
        size="sm"
        onClick={() => onToolChange('circle')}
        title="Cercle"
      >
        <Circle size={16} />
      </Button>
      
      <Button
        variant={activeTool === 'rectangle' ? 'default' : 'outline'}
        size="sm"
        onClick={() => onToolChange('rectangle')}
        title="Rectangle"
      >
        <Square size={16} />
      </Button>
      
      <Button
        variant={activeTool === 'note' ? 'default' : 'outline'}
        size="sm"
        onClick={() => onToolChange('note')}
        title="Ajouter une note"
      >
        <StickyNote size={16} />
      </Button>
    </div>
  );
};

export default DrawingTools;
