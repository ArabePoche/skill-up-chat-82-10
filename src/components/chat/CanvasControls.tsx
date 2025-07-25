
import React from 'react';
import { Button } from '@/components/ui/button';
import { Undo, Trash2, Save, Download, FileText } from 'lucide-react';

interface CanvasControlsProps {
  onUndo: () => void;
  onClear: () => void;
  onSave: () => void;
  onDownloadImage: () => void;
  onDownloadPDF: () => void;
  isSaving: boolean;
}

const CanvasControls: React.FC<CanvasControlsProps> = ({
  onUndo,
  onClear,
  onSave,
  onDownloadImage,
  onDownloadPDF,
  isSaving
}) => {
  return (
    <div className="flex items-center gap-1">
      <Button variant="outline" size="sm" onClick={onUndo} title="Annuler">
        <Undo size={16} />
      </Button>
      
      <Button variant="outline" size="sm" onClick={onClear} title="Tout effacer">
        <Trash2 size={16} />
      </Button>
      
      <Button variant="default" size="sm" onClick={onSave} disabled={isSaving} title="Sauvegarder">
        <Save size={16} />
        {isSaving && <span className="ml-1">...</span>}
      </Button>
      
      <Button variant="outline" size="sm" onClick={onDownloadImage} title="Télécharger image">
        <Download size={16} />
      </Button>
      
      <Button variant="outline" size="sm" onClick={onDownloadPDF} title="Télécharger PDF">
        <FileText size={16} />
      </Button>
    </div>
  );
};

export default CanvasControls;
