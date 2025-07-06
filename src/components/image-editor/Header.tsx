import React from 'react';
import { Button } from '@/components/ui/button';
import { Save, Undo, Redo, X } from 'lucide-react';

interface HeaderProps {
  onSave: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onClose?: () => void;
  canUndo: boolean;
  canRedo: boolean;
  isSaving: boolean;
}

const Header: React.FC<HeaderProps> = ({
  onSave,
  onUndo,
  onRedo,
  onClose,
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
        <Button
          variant="default"
          size="sm"
          onClick={onSave}
          disabled={isSaving}
          title="Sauvegarder"
        >
          <Save size={16} />
          {isSaving && <span className="ml-2">...</span>}
        </Button>
        
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