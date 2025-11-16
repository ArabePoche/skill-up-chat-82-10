/**
 * Dialog de confirmation pour la suppression d'un élève
 * Requiert la saisie du nom complet pour éviter les suppressions accidentelles
 */
import React, { useState } from 'react';
import { z } from 'zod';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle } from 'lucide-react';

interface DeleteStudentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentName: string;
  onConfirm: () => void;
  isDeleting?: boolean;
}

// Schéma de validation pour le nom complet
const deleteConfirmationSchema = z.object({
  confirmationText: z.string()
    .trim()
    .min(1, { message: "Veuillez saisir le nom complet" })
    .max(200, { message: "Le texte est trop long" })
});

export const DeleteStudentDialog: React.FC<DeleteStudentDialogProps> = ({
  open,
  onOpenChange,
  studentName,
  onConfirm,
  isDeleting = false,
}) => {
  const [confirmationText, setConfirmationText] = useState('');
  const [error, setError] = useState('');

  const handleConfirm = () => {
    // Validation avec zod
    const result = deleteConfirmationSchema.safeParse({ confirmationText });
    
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }

    // Vérifier que le texte saisi correspond exactement au nom complet
    if (confirmationText.trim() !== studentName.trim()) {
      setError('Le nom saisi ne correspond pas au nom complet de l\'élève');
      return;
    }

    // Tout est bon, on peut supprimer
    setError('');
    setConfirmationText('');
    onConfirm();
  };

  const handleCancel = () => {
    setConfirmationText('');
    setError('');
    onOpenChange(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Limiter la longueur à 200 caractères côté client
    if (value.length <= 200) {
      setConfirmationText(value);
      setError('');
    }
  };

  const isConfirmDisabled = confirmationText.trim() !== studentName.trim() || isDeleting;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Confirmer la suppression
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-4 pt-4">
            <p className="text-foreground font-medium">
              Vous êtes sur le point de supprimer définitivement l'élève :
            </p>
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
              <p className="font-semibold text-center text-lg">
                {studentName}
              </p>
            </div>
            <p className="text-muted-foreground text-sm">
              Cette action est <span className="font-semibold text-destructive">irréversible</span> et 
              supprimera toutes les données associées à cet élève (paiements, notes, etc.).
            </p>
            <div className="space-y-2">
              <Label htmlFor="confirmation-text">
                Pour confirmer, saisissez le nom complet de l'élève :
              </Label>
              <Input
                id="confirmation-text"
                value={confirmationText}
                onChange={handleInputChange}
                placeholder={studentName}
                className={error ? 'border-destructive' : ''}
                disabled={isDeleting}
                autoComplete="off"
              />
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel} disabled={isDeleting}>
            Annuler
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isConfirmDisabled}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? 'Suppression...' : 'Supprimer définitivement'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
