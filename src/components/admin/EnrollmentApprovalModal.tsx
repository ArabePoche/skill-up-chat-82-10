import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, Star, Crown, CheckCircle } from 'lucide-react';

interface EnrollmentApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApprove: (planType: 'free' | 'standard' | 'premium') => void;
  isUpdating: boolean;
  studentName?: string;
  formationTitle?: string;
}

const EnrollmentApprovalModal: React.FC<EnrollmentApprovalModalProps> = ({
  isOpen,
  onClose,
  onApprove,
  isUpdating,
  studentName,
  formationTitle
}) => {
  const [selectedPlan, setSelectedPlan] = useState<'free' | 'standard' | 'premium'>('free');

  const getPlanInfo = (plan: string) => {
    switch (plan) {
      case 'free':
        return { 
          label: 'Gratuit', 
          icon: <User size={16} />, 
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          description: 'Accès limité aux fonctionnalités'
        };
      case 'standard':
        return { 
          label: 'Standard', 
          icon: <Star size={16} />, 
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          description: 'Accès étendu aux fonctionnalités'
        };
      case 'premium':
        return { 
          label: 'Premium', 
          icon: <Crown size={16} />, 
          color: 'bg-purple-100 text-purple-800 border-purple-200',
          description: 'Accès complet à toutes les fonctionnalités'
        };
      default:
        return { 
          label: 'Gratuit', 
          icon: <User size={16} />, 
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          description: 'Accès limité aux fonctionnalités'
        };
    }
  };

  const handlePlanChange = (value: string) => {
    if (value === 'free' || value === 'standard' || value === 'premium') {
      setSelectedPlan(value);
    }
  };

  const handleApprove = () => {
    onApprove(selectedPlan);
  };

  const selectedPlanInfo = getPlanInfo(selectedPlan);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Approuver l'inscription</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Informations sur l'étudiant et la formation */}
          {(studentName || formationTitle) && (
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              {studentName && (
                <p className="text-sm text-blue-800">
                  <strong>Étudiant :</strong> {studentName}
                </p>
              )}
              {formationTitle && (
                <p className="text-sm text-blue-800">
                  <strong>Formation :</strong> {formationTitle}
                </p>
              )}
            </div>
          )}

          <p className="text-sm text-gray-600">
            Sélectionnez le plan d'abonnement à attribuer à cet utilisateur :
          </p>
          
          {/* Sélecteur de plan */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Plan d'abonnement :</label>
            <Select value={selectedPlan} onValueChange={handlePlanChange}>
              <SelectTrigger className="w-full">
                <SelectValue>
                  <div className="flex items-center gap-2">
                    {selectedPlanInfo.icon}
                    {selectedPlanInfo.label}
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="free">
                  <div className="flex items-center gap-2">
                    <User size={16} />
                    <div>
                      <div className="font-medium">Gratuit</div>
                      <div className="text-xs text-gray-500">Accès limité aux fonctionnalités</div>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="standard">
                  <div className="flex items-center gap-2">
                    <Star size={16} />
                    <div>
                      <div className="font-medium">Standard</div>
                      <div className="text-xs text-gray-500">Accès étendu aux fonctionnalités</div>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="premium">
                  <div className="flex items-center gap-2">
                    <Crown size={16} />
                    <div>
                      <div className="font-medium">Premium</div>
                      <div className="text-xs text-gray-500">Accès complet à toutes les fonctionnalités</div>
                    </div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Aperçu du plan sélectionné */}
          <div className="p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center gap-2 text-green-800">
              {selectedPlanInfo.icon}
              <span className="font-medium">{selectedPlanInfo.label}</span>
            </div>
            <p className="text-sm text-green-700 mt-1">
              {selectedPlanInfo.description}
            </p>
          </div>
          
          {/* Boutons d'action */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleApprove}
              disabled={isUpdating}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            >
              <CheckCircle size={16} className="mr-2" />
              {isUpdating ? 'Approbation...' : `Approuver (${selectedPlanInfo.label})`}
            </Button>
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1"
              disabled={isUpdating}
            >
              Annuler
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EnrollmentApprovalModal;
