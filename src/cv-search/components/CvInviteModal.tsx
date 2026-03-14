/**
 * Modal pour envoyer une invitation à un propriétaire de CV
 * Permet au recruteur d'écrire un message personnalisé
 */
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useSendCvInvitation } from '../hooks/useCvInvitations';

interface CvInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  cvId: string;
  cvOwnerId: string;
  inviterId: string;
  shopId?: string;
  jobListingId?: string;
  candidateName: string;
}

export const CvInviteModal: React.FC<CvInviteModalProps> = ({
  isOpen,
  onClose,
  cvId,
  cvOwnerId,
  inviterId,
  shopId,
  jobListingId,
  candidateName,
}) => {
  const [message, setMessage] = useState('');
  const { mutateAsync: sendInvitation, isPending } = useSendCvInvitation();

  const handleSubmit = async () => {
    if (!message.trim()) return;
    try {
      await sendInvitation({
        cvId,
        cvOwnerId,
        inviterId,
        shopId,
        jobListingId,
        message,
      });
      setMessage('');
      onClose();
    } catch (error) {
      console.error('Erreur envoi invitation:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Inviter {candidateName}</DialogTitle>
          <DialogDescription>
            Envoyez un message pour exprimer votre intérêt pour ce profil
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="invite-message">Message *</Label>
            <Textarea
              id="invite-message"
              placeholder="Bonjour, votre profil nous intéresse pour un poste dans notre boutique..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-[120px]"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={isPending}>
              Annuler
            </Button>
            <Button onClick={handleSubmit} disabled={isPending || !message.trim()}>
              {isPending ? 'Envoi...' : "Envoyer l'invitation"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
