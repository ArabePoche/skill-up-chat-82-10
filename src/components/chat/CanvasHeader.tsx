
import React from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CanvasHeaderProps {
  fileName: string;
  onClose?: () => void;
}

const CanvasHeader: React.FC<CanvasHeaderProps> = ({ fileName, onClose }) => {
  return (
    <div className="bg-white border-b p-3 flex items-center justify-between">
      <div className="flex-1 min-w-0 mr-4">
        <h2 
          className="text-sm md:text-base font-medium text-gray-900 truncate"
          title={fileName}
        >
          {fileName}
        </h2>
      </div>
      
      {onClose && (
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X size={16} />
        </Button>
      )}
    </div>
  );
};

export default CanvasHeader;
