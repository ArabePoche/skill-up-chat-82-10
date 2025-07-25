import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface PlanChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (justification?: string) => void;
  currentPlan: string;
  newPlan: string;
  isLoading?: boolean;
}

const PlanChangeModal: React.FC<PlanChangeModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  currentPlan,
  newPlan,
  isLoading = false
}) => {
  const [justification, setJustification] = useState('');

  const getPlanLabel = (plan: string) => {
    switch (plan) {
      case 'free': return 'Gratuit';
      case 'standard': return 'Standard';
      case 'premium': return 'Premium';
      default: return plan;
    }
  };

  const handleConfirm = () => {
    onConfirm(justification.trim() || undefined);
    setJustification('');
  };

  const handleClose = () => {
    setJustification('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Souhaitez-vous demander un changement de plan vers {getPlanLabel(newPlan)} ?
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="text-sm text-gray-600">
            <p>Plan actuel : <span className="font-medium">{getPlanLabel(currentPlan)}</span></p>
            <p>Nouveau plan : <span className="font-medium">{getPlanLabel(newPlan)}</span></p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="justification">Justification (optionnelle)</Label>
            <Textarea
              id="justification"
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Expliquez pourquoi vous souhaitez changer de plan..."
              rows={3}
            />
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Annuler
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isLoading}
            >
              {isLoading ? 'Envoi...' : 'Envoyer la demande'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PlanChangeModal;