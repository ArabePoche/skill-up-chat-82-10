// Modal de candidature pour les posts de recrutement
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Upload, FileText, X } from 'lucide-react';
import { useSubmitApplication } from '../hooks/useApplications';

interface ApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  recruiterId: string;
  sourceId: string;
  sourceType: string;
  postContent?: string;
}

export const ApplicationModal: React.FC<ApplicationModalProps> = ({
  isOpen,
  onClose,
  userId,
  recruiterId,
  sourceId,
  sourceType,
  postContent
}) => {
  const [message, setMessage] = useState('');
  const [cvFile, setCvFile] = useState<File | null>(null);
  const { mutateAsync: submitApplication, isPending } = useSubmitApplication();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setCvFile(e.target.files[0]);
    }
  };

  const handleRemoveFile = () => {
    setCvFile(null);
  };

  const handleSubmit = async () => {
    if (!message.trim()) {
      return;
    }

    try {
      await submitApplication({
        userId,
        recruiterId,
        sourceId,
        sourceType,
        message,
        cvFile: cvFile || undefined
      });
      
      // Réinitialiser et fermer
      setMessage('');
      setCvFile(null);
      onClose();
    } catch (error) {
      console.error('Erreur lors de la soumission:', error);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Postuler à cette offre</DialogTitle>
          <DialogDescription>
            Rédigez un message de motivation et joignez votre CV
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Extrait du post */}
          {postContent && (
            <div className="bg-muted p-3 rounded-md">
              <p className="text-sm text-muted-foreground line-clamp-3">{postContent}</p>
            </div>
          )}

          {/* Message de motivation */}
          <div className="space-y-2">
            <Label htmlFor="message">Message de motivation *</Label>
            <Textarea
              id="message"
              placeholder="Expliquez pourquoi vous êtes intéressé par cette offre..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-[150px]"
            />
          </div>

          {/* Upload CV */}
          <div className="space-y-2">
            <Label>CV (optionnel)</Label>
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4">
              {!cvFile ? (
                <div className="text-center">
                  <Upload className="mx-auto h-10 w-10 text-muted-foreground" />
                  <div className="mt-2">
                    <Label htmlFor="cv-upload" className="cursor-pointer">
                      <span className="text-sm font-semibold text-primary">
                        Cliquez pour téléverser votre CV
                      </span>
                    </Label>
                    <Input
                      id="cv-upload"
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      PDF, DOC, DOCX (max 5 MB)
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between bg-muted p-3 rounded">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    <div>
                      <p className="text-sm font-medium">{cvFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(cvFile.size)}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveFile}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Boutons d'action */}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isPending}
            >
              Annuler
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isPending || !message.trim()}
            >
              {isPending ? 'Envoi...' : 'Envoyer ma candidature'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
