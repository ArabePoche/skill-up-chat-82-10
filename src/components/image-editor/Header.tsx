
import React from 'react';
import { Button } from '@/components/ui/button';
import { Undo, Redo, X, Download } from 'lucide-react';
import SaveOptions from './SaveOptions';

interface HeaderProps {
  onSave: () => void;
  onSaveAndSendToChat?: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onClose?: () => void;
  onDownload?: () => void;
  canUndo: boolean;
  canRedo: boolean;
  isSaving: boolean;
}

const Header: React.FC<HeaderProps> = ({
  onSave,
  onSaveAndSendToChat,
  onUndo,
  onRedo,
  onClose,
  onDownload,
  canUndo,
  canRedo,
  isSaving
}) => {
  return (
    <div className="bg-background border-b border-border p-4 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onUndo}
          disabled={!canUndo}
          title="Annuler"
        >
          <Undo size={16} />
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={onRedo}
          disabled={!canRedo}
          title="Refaire"
        >
          <Redo size={16} />
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <SaveOptions
          onSave={onSave}
          onSaveAndSendToChat={onSaveAndSendToChat}
          onDownload={onDownload}
          isSaving={isSaving}
        />
        
        {onClose && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            title="Fermer"
          >
            <X size={16} />
          </Button>
        )}
      </div>
    </div>
  );
};

export default Header;