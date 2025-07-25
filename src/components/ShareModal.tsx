
import React from 'react';
import { Copy, MessageCircle, Share2, Download } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoId: string;
  videoTitle: string;
}

const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, videoId, videoTitle }) => {
  const videoUrl = `${window.location.origin}/video/${videoId}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(videoUrl);
      toast.success('Lien copié dans le presse-papiers');
    } catch (error) {
      toast.error('Erreur lors de la copie du lien');
    }
  };

  const handleWhatsAppShare = () => {
    const text = `Regarde cette vidéo: ${videoTitle} ${videoUrl}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: videoTitle,
          text: 'Regarde cette vidéo intéressante !',
          url: videoUrl,
        });
      } catch (error) {
        console.log('Partage annulé');
      }
    } else {
      handleCopyLink();
    }
  };

  const shareOptions = [
    {
      icon: Copy,
      label: 'Copier le lien',
      action: handleCopyLink,
      color: 'bg-gray-600 hover:bg-gray-700'
    },
    {
      icon: MessageCircle,
      label: 'WhatsApp',
      action: handleWhatsAppShare,
      color: 'bg-green-600 hover:bg-green-700'
    },
    {
      icon: Share2,
      label: 'Partager',
      action: handleNativeShare,
      color: 'bg-blue-600 hover:bg-blue-700'
    }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm bg-black text-white border-gray-800">
        <DialogHeader>
          <DialogTitle className="text-center">Partager cette vidéo</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-3">
          {shareOptions.map((option, index) => (
            <Button
              key={index}
              onClick={option.action}
              className={`w-full flex items-center justify-center space-x-3 py-3 ${option.color} text-white`}
              variant="secondary"
            >
              <option.icon size={20} />
              <span>{option.label}</span>
            </Button>
          ))}
        </div>
        
        <div className="mt-4 p-3 bg-gray-800 rounded-lg">
          <p className="text-xs text-gray-400 mb-2">Lien de la vidéo:</p>
          <p className="text-sm text-white break-all">{videoUrl}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareModal;
