import React from 'react';
import { X, Phone } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import IncomingCallsList from './IncomingCallsList';
import { IncomingCall } from '@/hooks/useIncomingCalls';

interface CallsModalProps {
  isOpen: boolean;
  onClose: () => void;
  formationId: string;
  incomingCalls: IncomingCall[];
}

const CallsModal: React.FC<CallsModalProps> = ({ isOpen, onClose, formationId, incomingCalls }) => {

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Phone className="h-5 w-5 text-blue-600" />
            <span>Appels entrants ({incomingCalls.length})</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="max-h-96 overflow-y-auto">
          <IncomingCallsList 
            formationId={formationId}
            incomingCalls={incomingCalls}
            className="mt-4"
          />
        </div>
        
        <div className="flex justify-end pt-4 border-t">
          <Button onClick={onClose} variant="outline">
            Fermer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CallsModal;