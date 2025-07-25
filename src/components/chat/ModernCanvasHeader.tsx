
import React from 'react';
import { Button } from '@/components/ui/button';
import { Save, Download, FileText, X } from 'lucide-react';

interface ModernCanvasHeaderProps {
  onSave: () => void;
  onDownloadImage: () => void;
  onDownloadPDF: () => void;
  onClose?: () => void;
  isSaving: boolean;
}

const ModernCanvasHeader: React.FC<ModernCanvasHeaderProps> = ({
  onSave,
  onDownloadImage,
  onDownloadPDF,
  onClose,
  isSaving
}) => {
  return (
    <div className="bg-white border-b p-4 flex items-center justify-between shadow-sm">
      <div className="flex-1">
        <h2 className="text-lg font-semibold text-gray-900">
          🎨 Éditeur d'annotation
        </h2>
      </div>
      
      <div className="flex items-center gap-3">
        <Button
          onClick={onSave}
          disabled={isSaving}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
        >
          <Save size={16} />
          {isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
        </Button>
        
        <Button
          onClick={onDownloadImage}
          variant="outline"
          className="flex items-center gap-2"
        >
          <Download size={16} />
          Image
        </Button>
        
        <Button
          onClick={onDownloadPDF}
          variant="outline"
          className="flex items-center gap-2"
        >
          <FileText size={16} />
          PDF
        </Button>
        
        {onClose && (
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-gray-100"
          >
            <X size={16} />
          </Button>
        )}
      </div>
    </div>
  );
};

export default ModernCanvasHeader;
