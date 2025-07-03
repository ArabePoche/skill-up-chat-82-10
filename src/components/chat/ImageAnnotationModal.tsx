
import React, { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';
import ModernImageAnnotationCanvas from './ModernImageAnnotationCanvas';
import { useSendMessage } from '@/hooks/useSendMessage';
import { toast } from 'sonner';

interface ImageAnnotationModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  fileName: string;
  messageId: string;
  isTeacher: boolean;
  lessonId: string;
  formationId: string;
  onSaveAnnotations?: (annotatedImageUrl: string) => void;
}

const ImageAnnotationModal: React.FC<ImageAnnotationModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  fileName,
  messageId,
  isTeacher,
  lessonId,
  formationId,
  onSaveAnnotations
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [annotatedImageUrl, setAnnotatedImageUrl] = useState<string | null>(null);
  const sendMessageMutation = useSendMessage(lessonId, formationId);

  const handleSaveAnnotations = async (dataUrl: string) => {
    setIsSaving(true);
    try {
      console.log('Saving annotations with dataUrl length:', dataUrl.length);
      setAnnotatedImageUrl(dataUrl);
      if (onSaveAnnotations) {
        await onSaveAnnotations(dataUrl);
      }
      toast.success('Annotations sauvegardées avec succès! ✅');
    } catch (error) {
      console.error('Error saving annotations:', error);
      toast.error('Erreur lors de la sauvegarde des annotations');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendToChat = async () => {
    if (!annotatedImageUrl) {
      toast.error('Veuillez d\'abord sauvegarder vos annotations');
      return;
    }

    try {
      const response = await fetch(annotatedImageUrl);
      const blob = await response.blob();
      const file = new File([blob], `annotated_${fileName}`, { type: 'image/png' });

      await sendMessageMutation.mutateAsync({
        content: `📝 Image annotée: ${fileName}`,
        messageType: 'image',
        file
      });

      toast.success('Image annotée envoyée dans la discussion! 💬');
      onClose();
    } catch (error) {
      console.error('Error sending annotated image:', error);
      toast.error('Erreur lors de l\'envoi de l\'image annotée');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[98vw] max-h-[98vh] w-full h-full p-0 bg-gray-50">
        <div className="flex flex-col h-full relative">
          {annotatedImageUrl && (
            <div className="absolute top-4 right-4 z-10">
              <Button
                onClick={handleSendToChat}
                disabled={sendMessageMutation.isPending}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 shadow-lg"
              >
                <Send size={16} />
                Envoyer en discussion
              </Button>
            </div>
          )}
          
          <div className="flex-1 overflow-hidden">
            <ModernImageAnnotationCanvas
              imageUrl={imageUrl}
              fileName={fileName}
              messageId={messageId}
              isTeacher={isTeacher}
              isSaving={isSaving}
              onSaveAnnotations={handleSaveAnnotations}
              onClose={onClose}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImageAnnotationModal;
