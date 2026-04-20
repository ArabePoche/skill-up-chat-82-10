// StickerPreviewModal — Modal de prévisualisation d'un sticker avec favoris et édition
import React, { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Edit3, X, Bookmark } from 'lucide-react';
import { useStickerFavorites } from '../hooks/useStickerFavorites';
import StickerEditorModal from './StickerEditorModal';
import { fileUrlToFile } from '../utils/fileUrlToFile';

interface StickerPreviewModalProps {
  open: boolean;
  onClose: () => void;
  stickerId: string;
  stickerUrl: string;
  onEdit?: () => void;
}


const StickerPreviewModal: React.FC<StickerPreviewModalProps> = ({
  open,
  onClose,
  stickerId,
  stickerUrl,
}) => {
  const { isFavorite, toggleFavorite } = useStickerFavorites(stickerId);
  const [showEditor, setShowEditor] = useState(false);
  const [editorFile, setEditorFile] = useState<File | null>(null);

  const handleEdit = async () => {
    try {
      const file = await fileUrlToFile(stickerUrl, stickerId + '.png');
      setEditorFile(file);
      setShowEditor(true);
    } catch (e) {
      alert("Impossible de charger le sticker pour édition.");
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-xs flex flex-col items-center gap-4 p-6">
          <button
            className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
            onClick={onClose}
            aria-label="Fermer"
          >
            <X size={20} />
          </button>
          <img
            src={stickerUrl}
            alt="Sticker"
            className="w-40 h-40 object-contain rounded-xl border bg-muted"
          />
          <div className="flex gap-3 mt-2">
            <Button
              variant={isFavorite ? 'secondary' : 'outline'}
              onClick={toggleFavorite}
              className={isFavorite ? 'text-yellow-500 border-yellow-400' : ''}
            >
              <Bookmark className={isFavorite ? 'fill-current' : ''} size={20} />
              <span className="ml-2">
                {isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
              </span>
            </Button>
            <Button variant="outline" onClick={handleEdit}>
              <Edit3 size={18} />
              <span className="ml-2">Modifier</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {showEditor && editorFile && (
        <StickerEditorModal
          file={editorFile}
          onConfirm={() => setShowEditor(false)}
          onCancel={() => setShowEditor(false)}
          removeBg={async (file) => file} // TODO: brancher suppression de fond si besoin
        />
      )}
    </>
  );
};

export default StickerPreviewModal;
