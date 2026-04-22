// StickerPreviewModal — Modal de prévisualisation d'un sticker avec favoris et édition
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Edit3, X, Bookmark, Sparkles, Download, Share2 } from 'lucide-react';
import { useFavorites } from '@/hooks/useFavorites';
import StickerEditorModal from './StickerEditorModal';
import { fileUrlToFile } from '../utils/fileUrlToFile';
import { motion, AnimatePresence } from 'framer-motion';

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
  const { isFavorited, toggleFavorite } = useFavorites();
  const [showEditor, setShowEditor] = useState(false);
  const [editorFile, setEditorFile] = useState<File | null>(null);
  const isFav = isFavorited('sticker', stickerId);

  const handleEdit = async () => {
    try {
      const file = await fileUrlToFile(stickerUrl, stickerId + '.png');
      setEditorFile(file);
      setShowEditor(true);
    } catch (e) {
      console.error("Impossible de charger le sticker pour édition:", e);
    }
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = stickerUrl;
    link.download = `sticker-${stickerId}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-md p-0 overflow-hidden bg-gradient-to-br from-slate-50 to-white border-0 shadow-2xl">
          <DialogTitle>
            <span className="sr-only">Prévisualisation du sticker</span>
          </DialogTitle>
          
          {/* Header avec bouton fermer */}
          <div className="relative h-2 bg-gradient-to-r from-violet-500 via-purple-500 to-pink-500">
            <button
              className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-white shadow-lg transition-all hover:scale-110"
              onClick={onClose}
              aria-label="Fermer"
            >
              <X size={16} />
            </button>
          </div>

          {/* Contenu principal */}
          <div className="p-8 flex flex-col items-center">
            {/* Zone de preview du sticker */}
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="relative group"
            >
              <div className="relative w-64 h-64 rounded-3xl bg-gradient-to-br from-violet-50 via-white to-pink-50 shadow-xl shadow-violet-500/10 border border-white/50 overflow-hidden">
                {/* Effet de brillance */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent opacity-50" />
                
                {/* Image du sticker */}
                <img
                  src={stickerUrl}
                  alt="Sticker"
                  className="relative w-full h-full object-contain p-6"
                />
                
                {/* Badge favori */}
                <AnimatePresence>
                  {isFav && (
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      className="absolute -top-2 -right-2 w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/30"
                    >
                      <Sparkles size={18} className="text-white fill-white" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Ombre décorative */}
              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-48 h-4 bg-black/5 blur-xl rounded-full" />
            </motion.div>

            {/* Actions */}
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.3 }}
              className="flex gap-3 mt-8 w-full"
            >
              <Button
                onClick={() => toggleFavorite('sticker', stickerId, { url: stickerUrl })}
                className={`flex-1 h-12 rounded-2xl font-semibold transition-all duration-200 ${
                  isFav 
                    ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-white hover:shadow-lg hover:shadow-orange-500/30 hover:scale-105' 
                    : 'bg-white border-2 border-slate-200 text-slate-700 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700'
                }`}
              >
                <Bookmark className={isFav ? 'fill-white' : ''} size={18} />
                <span className="ml-2">{isFav ? 'Favori' : 'Favoriser'}</span>
              </Button>

              <Button
                onClick={handleDownload}
                className="flex-1 h-12 rounded-2xl font-semibold bg-white border-2 border-slate-200 text-slate-700 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 transition-all duration-200 hover:scale-105"
              >
                <Download size={18} />
                <span className="ml-2">Télécharger</span>
              </Button>
            </motion.div>

            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.3 }}
              className="w-full mt-3"
            >
              <Button
                onClick={handleEdit}
                className="w-full h-11 rounded-2xl font-semibold bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:shadow-lg hover:shadow-violet-500/30 transition-all duration-200 hover:scale-105"
              >
                <Edit3 size={18} />
                <span className="ml-2">Modifier ce sticker</span>
              </Button>
            </motion.div>

            {/* Info supplémentaire */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.3 }}
              className="mt-6 text-center"
            >
              <p className="text-xs text-slate-400 font-medium">ID: {stickerId.slice(0, 8)}...</p>
            </motion.div>
          </div>
        </DialogContent>
      </Dialog>
      
      {showEditor && editorFile && (
        <StickerEditorModal
          file={editorFile}
          onConfirm={() => setShowEditor(false)}
          onCancel={() => setShowEditor(false)}
          removeBg={async (file) => file}
        />
      )}
    </>
  );
};

export default StickerPreviewModal;
