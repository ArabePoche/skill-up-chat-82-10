
// Importation des dépendances React et des composants UI
import React from 'react';
// Importation des composants Dialog pour la modale
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
// Importation du composant Button pour les boutons d'action
import { Button } from '@/components/ui/button';
// Importation des icônes utilisées pour les boutons de partage
import { Copy, Facebook, Twitter, MessageCircle, Linkedin } from 'lucide-react';
// Importation de la librairie de notifications pour afficher un toast lors de la copie du lien
import { toast } from 'sonner';

// Définition des props attendues par le composant VideoShareModal
interface VideoShareModalProps {
  isOpen: boolean; // Contrôle l'ouverture de la modale
  onClose: () => void; // Fonction de fermeture de la modale
  url: string; // Lien de la vidéo à partager
  title: string; // Titre de la vidéo
  description?: string; // Description optionnelle de la vidéo
}

// Début du composant principal VideoShareModal
const VideoShareModal: React.FC<VideoShareModalProps> = ({
  isOpen,
  onClose,
  url,
  title,
  description
}) => {
  // Fonction pour copier le lien dans le presse-papier
  const handleCopyLink = () => {
    navigator.clipboard.writeText(url); // Copie le lien
    toast.success('Lien copié !'); // Affiche une notification de succès
    onClose(); // Ferme la modale
  };

  // Fonction pour gérer le partage sur différentes plateformes
  const handleShare = (platform: string) => {
    const text = `${title} - ${description || ''}`; // Texte à partager
    let shareUrl = '';

    // Génération de l'URL de partage selon la plateforme
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
      case 'linkedin':
        // Génération du lien de partage LinkedIn
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
        break;
    }

    // Ouvre la fenêtre de partage si une URL a été générée
    if (shareUrl) {
      window.open(shareUrl, '_blank', 'width=600,height=400');
    }
    onClose(); // Ferme la modale après le partage
  };

  // Rendu de la modale de partage vidéo
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-white">
        <DialogHeader>
          <DialogTitle>Partager cette vidéo</DialogTitle>
        </DialogHeader>
        {/* Section des boutons d'action de partage */}
        <div className="flex flex-col space-y-4">
          {/* Bouton pour copier le lien */}
          <Button
            onClick={handleCopyLink}
            variant="outline"
            className="w-full justify-start"
          >
            <Copy className="mr-2 h-4 w-4" />
            Copier le lien
          </Button>
          {/* Bouton pour partager sur Facebook */}
          <Button
            onClick={() => handleShare('facebook')}
            variant="outline"
            className="w-full justify-start"
          >
            <Facebook className="mr-2 h-4 w-4" />
            Partager sur Facebook
          </Button>
          {/* Bouton pour partager sur Twitter */}
          <Button
            onClick={() => handleShare('twitter')}
            variant="outline"
            className="w-full justify-start"
          >
            <Twitter className="mr-2 h-4 w-4" />
            Partager sur Twitter
          </Button>
          {/* Bouton pour partager sur LinkedIn */}
          <Button
            onClick={() => handleShare('linkedin')}
            variant="outline"
            className="w-full justify-start"
          >
            <Linkedin className="mr-2 h-4 w-4" />
            Partager sur LinkedIn
          </Button>
          {/* Bouton pour partager sur WhatsApp */}
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
