
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Copy, Facebook, Twitter, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';

interface VideoShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  title: string;
  description?: string;
}

const VideoShareModal: React.FC<VideoShareModalProps> = ({
  isOpen,
  onClose,
  url,
  title,
  description
}) => {
  const handleCopyLink = () => {
    navigator.clipboard.writeText(url);
    toast.success('Lien copié !');
    onClose();
  };

  const handleShare = (platform: string) => {
    const text = `${title} - ${description || ''}`;
    let shareUrl = '';

    switch (platform) {
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
        break;
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
        break;
      case 'whatsapp':
        shareUrl = `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`;
        break;
    }

    if (shareUrl) {
      window.open(shareUrl, '_blank', 'width=600,height=400');
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-white">
        <DialogHeader>
          <DialogTitle>Partager cette vidéo</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col space-y-4">
          <Button
            onClick={handleCopyLink}
            variant="outline"
            className="w-full justify-start"
          >
            <Copy className="mr-2 h-4 w-4" />
            Copier le lien
          </Button>
          
          <Button
            onClick={() => handleShare('facebook')}
            variant="outline"
            className="w-full justify-start"
          >
            <Facebook className="mr-2 h-4 w-4" />
            Partager sur Facebook
          </Button>
          
          <Button
            onClick={() => handleShare('twitter')}
            variant="outline"
            className="w-full justify-start"
          >
            <Twitter className="mr-2 h-4 w-4" />
            Partager sur Twitter
          </Button>
          
          <Button
            onClick={() => handleShare('whatsapp')}
            variant="outline"
            className="w-full justify-start"
          >
            <MessageCircle className="mr-2 h-4 w-4" />
            Partager sur WhatsApp
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VideoShareModal;
