import React, { useState } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import VerifiedBadge from '@/components/VerifiedBadge';
import VerificationRequestModal from './VerificationRequestModal';

/**
 * Dialog affiché lorsqu'un utilisateur non certifié tente d'accéder 
 * à une fonctionnalité réservée aux comptes vérifiés
 */
interface VerificationRequiredDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  featureName?: string;
}

const VerificationRequiredDialog: React.FC<VerificationRequiredDialogProps> = ({ 
  open, 
  onOpenChange,
  featureName = 'cette fonctionnalité'
}) => {
  const [showVerificationModal, setShowVerificationModal] = useState(false);

  const handleRequestCertification = () => {
    onOpenChange(false);
    setShowVerificationModal(true);
  };

  return (
    <>
      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="p-4 bg-blue-500/10 rounded-full">
                <VerifiedBadge size={48} showTooltip={false} />
              </div>
            </div>
            <AlertDialogTitle className="text-center text-xl">
              Certification requise
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center space-y-3">
              <p>
                <span className="font-semibold">{featureName}</span> est réservée aux comptes certifiés.
              </p>
              <p className="text-sm">
                La certification permet de publier des offres de recrutement, créer des formations et des vidéos éducatives publiques.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-col gap-2">
            <Button
              onClick={handleRequestCertification}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white"
            >
              Demander la certification
            </Button>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-full"
            >
              Plus tard
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de demande de certification */}
      <VerificationRequestModal
        isOpen={showVerificationModal}
        onClose={() => setShowVerificationModal(false)}
      />
    </>
  );
};

export default VerificationRequiredDialog;
