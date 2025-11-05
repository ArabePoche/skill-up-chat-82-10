/**
 * Bouton pour télécharger/supprimer une formation pour usage offline
 */

import React, { useState } from 'react';
import { Download, Trash2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOfflineFormation } from '../hooks/useOfflineFormation';
import { useToast } from '@/hooks/use-toast';
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

interface OfflineDownloadButtonProps {
  formationId: string;
  formationTitle?: string;
}

export const OfflineDownloadButton = ({ 
  formationId, 
  formationTitle = 'cette formation' 
}: OfflineDownloadButtonProps) => {
  const { isOfflineAvailable, downloadForOffline, removeOffline } = useOfflineFormation(formationId);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { toast } = useToast();

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await downloadForOffline();
      toast({
        title: "✅ Téléchargement terminé",
        description: `${formationTitle} est maintenant disponible hors ligne`,
      });
    } catch (error) {
      toast({
        title: "❌ Erreur",
        description: "Impossible de télécharger la formation",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleRemove = async () => {
    try {
      await removeOffline();
      toast({
        title: "🗑️ Supprimé",
        description: `${formationTitle} a été supprimée du mode hors ligne`,
      });
    } catch (error) {
      toast({
        title: "❌ Erreur",
        description: "Impossible de supprimer la formation",
        variant: "destructive",
      });
    }
    setShowDeleteDialog(false);
  };

  if (isOfflineAvailable) {
    return (
      <>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowDeleteDialog(true)}
          className="gap-2"
        >
          <Check className="w-4 h-4" />
          Disponible hors ligne
          <Trash2 className="w-3 h-3 ml-1 opacity-50" />
        </Button>

        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer le contenu hors ligne ?</AlertDialogTitle>
              <AlertDialogDescription>
                Les cours et audios de {formationTitle} ne seront plus accessibles sans connexion.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={handleRemove}>Supprimer</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleDownload}
      disabled={isDownloading}
      className="gap-2"
    >
      <Download className={isDownloading ? "w-4 h-4 animate-pulse" : "w-4 h-4"} />
      {isDownloading ? 'Téléchargement...' : 'Télécharger hors ligne'}
    </Button>
  );
};
