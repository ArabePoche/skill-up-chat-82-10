import React from 'react';
import { X, CheckCircle2, Video, Briefcase, Star, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import VerifiedBadge from '@/components/VerifiedBadge';
import { useVerification } from '@/hooks/useVerification';
import { useAuth } from '@/hooks/useAuth';

/**
 * Modal de demande de certification EducaTok Verified
 * Présente les avantages et conditions pour obtenir la certification
 */
interface VerificationRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const VerificationRequestModal: React.FC<VerificationRequestModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { sendRequest, isSubmitting, hasPendingRequest } = useVerification(user?.id);

  const handleRequest = () => {
    sendRequest();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/80 z-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-background rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto border border-border shadow-2xl">
          {/* Header */}
          <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <VerifiedBadge size={24} showTooltip={false} />
              <h2 className="text-xl font-bold">Certification EducaTok</h2>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Avantages */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Star className="text-yellow-500" size={20} />
                Avantages du compte certifié
              </h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <Video className="text-blue-500" size={20} />
                  </div>
                  <div>
                    <p className="font-medium">Créer des vidéos éducatives</p>
                    <p className="text-sm text-muted-foreground">
                      Publiez vos formations et tutoriels vidéo
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    <Briefcase className="text-green-500" size={20} />
                  </div>
                  <div>
                    <p className="font-medium">Publier des offres de recrutement</p>
                    <p className="text-sm text-muted-foreground">
                      Recrutez des talents pour votre organisation
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className="p-2 bg-purple-500/10 rounded-lg">
                    <TrendingUp className="text-purple-500" size={20} />
                  </div>
                  <div>
                    <p className="font-medium">Visibilité accrue</p>
                    <p className="text-sm text-muted-foreground">
                      Badge vérifié affiché sur votre profil
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Conditions */}
            <div className="border-t border-border pt-4">
              <h3 className="text-lg font-semibold mb-3">Conditions d'obtention</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Compte actif et régulier sur EducaTok</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Bonne réputation et respect des règles de la communauté</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Contenu éducatif de qualité et pertinent</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Validation par l'équipe EducaTok</span>
                </li>
              </ul>
            </div>

            {/* Actions */}
            <div className="border-t border-border pt-4 space-y-3">
              {hasPendingRequest ? (
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-center">
                  <p className="text-sm font-medium text-yellow-600 dark:text-yellow-500">
                    Demande en cours d'examen
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Votre demande sera examinée prochainement par notre équipe
                  </p>
                </div>
              ) : (
                <>
                  <Button
                    onClick={handleRequest}
                    disabled={isSubmitting}
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white"
                  >
                    {isSubmitting ? 'Envoi en cours...' : 'Demander la certification'}
                  </Button>
                  <p className="text-xs text-center text-muted-foreground">
                    Votre demande sera examinée dans un délai de 48 heures
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default VerificationRequestModal;
