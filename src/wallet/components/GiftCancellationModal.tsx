import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle } from 'lucide-react';
import { useCreateGiftDispute } from '../hooks/useGiftDisputes';

interface GiftCancellationModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactionRef: string;
  amount: number;
  currency: string;
}

export const GiftCancellationModal: React.FC<GiftCancellationModalProps> = ({
  isOpen,
  onClose,
  transactionRef,
  amount,
  currency
}) => {
  const [reason, setReason] = useState('');
  const { mutate: createDispute, isPending } = useCreateGiftDispute();

  const handleCreateDispute = () => {
    if (!reason.trim()) return;

    createDispute({ transactionRef, reason: reason.trim() }, {
      onSuccess: () => {
        onClose();
        setReason('');
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-slate-900 border-slate-800 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Réclamation d'annulation
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Vous êtes sur le point de réclamer l'annulation d'un cadeau de {Math.abs(amount).toLocaleString('fr-FR')} {currency === 'soumboulah_cash' ? 'SC' : 'SB'}.
            Les fonds seront temporairement bloqués chez le destinataire en attendant la décision d'un administrateur.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">
              Raison de l'annulation
            </label>
            <Textarea
              placeholder="Veuillez expliquer pourquoi vous souhaitez annuler ce cadeau..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="bg-slate-800 border-slate-700 min-h-[100px] text-white"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={isPending} className="text-slate-300 hover:text-white hover:bg-slate-800">
            Annuler
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleCreateDispute} 
            disabled={isPending || !reason.trim()}
          >
            {isPending ? 'Envoi...' : 'Envoyer la réclamation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
