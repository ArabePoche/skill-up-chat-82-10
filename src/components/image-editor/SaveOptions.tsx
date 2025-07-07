import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Save, Send, Download, ChevronDown } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface SaveOptionsProps {
  onSave: () => void;
  onSaveAndSendToChat?: () => void;
  onDownload?: () => void;
  isSaving?: boolean;
  disabled?: boolean;
}

const SaveOptions: React.FC<SaveOptionsProps> = ({
  onSave,
  onSaveAndSendToChat,
  onDownload,
  isSaving = false,
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleSave = () => {
    onSave();
    setIsOpen(false);
  };

  const handleSaveAndSend = () => {
    if (onSaveAndSendToChat) {
      onSaveAndSendToChat();
    }
    setIsOpen(false);
  };

  const handleDownload = () => {
    if (onDownload) {
      onDownload();
    }
    setIsOpen(false);
  };

  return (
    <div className="flex items-center">
      {/* Bouton principal - Sauvegarder */}
      <Button
        onClick={handleSave}
        disabled={isSaving || disabled}
        className="rounded-r-none border-r-0"
        size="sm"
      >
        <Save size={16} />
        {isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
      </Button>

      {/* Menu déroulant pour les autres options */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="default"
            size="sm"
            className="rounded-l-none px-2"
            disabled={isSaving || disabled}
          >
            <ChevronDown size={16} />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-0" align="end">
          <div className="py-1">
            <Button
              variant="ghost"
              className="w-full justify-start px-4 py-2 h-auto"
              onClick={handleSave}
              disabled={isSaving}
            >
              <Save size={16} className="mr-2" />
              Sauvegarder uniquement
            </Button>
            
            {onSaveAndSendToChat && (
              <Button
                variant="ghost"
                className="w-full justify-start px-4 py-2 h-auto"
                onClick={handleSaveAndSend}
                disabled={isSaving}
              >
                <Send size={16} className="mr-2" />
                Envoyer dans le chat
              </Button>
            )}
            
            <Separator className="my-1" />
            
            {onDownload && (
              <Button
                variant="ghost"
                className="w-full justify-start px-4 py-2 h-auto"
                onClick={handleDownload}
                disabled={isSaving}
              >
                <Download size={16} className="mr-2" />
                Télécharger sur l'appareil
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default SaveOptions;