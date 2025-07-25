import React from 'react';
import { Button } from '@/components/ui/button';
import { Type, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';

interface TextToolsProps {
  activeTool: string;
  onToolChange: (tool: string) => void;
}

const textTools = [
  { id: 'text', icon: Type, label: 'Zone de texte' },
];

const styleTools = [
  { id: 'bold', icon: Bold, label: 'Gras' },
  { id: 'italic', icon: Italic, label: 'Italique' },
  { id: 'underline', icon: Underline, label: 'Souligné' },
];

const alignTools = [
  { id: 'align-left', icon: AlignLeft, label: 'Gauche' },
  { id: 'align-center', icon: AlignCenter, label: 'Centre' },
  { id: 'align-right', icon: AlignRight, label: 'Droite' },
];

const TextTools: React.FC<TextToolsProps> = ({ activeTool, onToolChange }) => {
  return (
    <div className="p-4 space-y-4">
      <div>
        <h3 className="text-sm font-medium mb-3">Texte</h3>
        <div className="grid grid-cols-1 gap-2">
          {textTools.map(({ id, icon: Icon, label }) => (
            <Button
              key={id}
              variant={activeTool === id ? "default" : "outline"}
              size="sm"
              onClick={() => onToolChange(id)}
              className="flex items-center gap-2 justify-start"
            >
              <Icon size={16} />
              {label}
            </Button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium mb-3">Style</h3>
        <div className="grid grid-cols-3 gap-2">
          {styleTools.map(({ id, icon: Icon, label }) => (
            <Button
              key={id}
              variant={activeTool === id ? "default" : "outline"}
              size="sm"
              onClick={() => onToolChange(id)}
              className="flex flex-col gap-1 h-12"
              title={label}
            >
              <Icon size={16} />
            </Button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium mb-3">Alignement</h3>
        <div className="grid grid-cols-3 gap-2">
          {alignTools.map(({ id, icon: Icon, label }) => (
            <Button
              key={id}
              variant={activeTool === id ? "default" : "outline"}
              size="sm"
              onClick={() => onToolChange(id)}
              className="flex flex-col gap-1 h-12"
              title={label}
            >
              <Icon size={16} />
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TextTools;