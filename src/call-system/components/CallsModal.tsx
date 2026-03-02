import React, { useState } from 'react';
import { Phone, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CallSession } from '../hooks/useCallSystem';
import IncomingCallsGrid from './IncomingCallsGrid';
import AgoraCallUI from './AgoraCallUI';

interface CallsModalProps {
  isOpen: boolean;
  onClose: () => void;
  formationId: string;
  incomingCalls: CallSession[];
  isLoading: boolean;
  onAcceptCall: (callId: string) => Promise<boolean>;
  onRejectCall: (callId: string) => Promise<boolean>;
  onRefresh: () => void;
}

const CallsModal: React.FC<CallsModalProps> = ({ 
  isOpen, 
  onClose, 
  formationId, 
  incomingCalls, 
  isLoading,
  onAcceptCall,
  onRejectCall,
  onRefresh
}) => {
  const [activeCall, setActiveCall] = useState<CallSession | null>(null);

  const handleAcceptCall = async (callId: string) => {
    const success = await onAcceptCall(callId);
    if (success) {
      const call = incomingCalls.find(c => c.id === callId);
      if (call) {
        setActiveCall(call);
      }
    }
    return success;
  };

  const handleEndActiveCall = () => {
    setActiveCall(null);
  };

  // Si un appel Agora est actif, afficher l'UI d'appel en plein écran
  if (activeCall) {
    return (
      <AgoraCallUI
        callId={activeCall.id}
        channelName={`call_${activeCall.id}`}
        callType={activeCall.call_type}
        remoteUserName={activeCall.caller_name || 'Utilisateur'}
        onEndCall={handleEndActiveCall}
      />
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl mx-auto max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Phone className="h-5 w-5 text-blue-600" />
              <span>Appels entrants ({incomingCalls.length})</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              disabled={isLoading}
              className="h-8 w-8 p-0"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Phone className="h-4 w-4" />
              )}
            </Button>
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto min-h-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Chargement des appels...</span>
            </div>
          ) : (
            <IncomingCallsGrid
              incomingCalls={incomingCalls}
              onAcceptCall={handleAcceptCall}
              onRejectCall={onRejectCall}
            />
          )}
        </div>
        
        <div className="flex justify-end pt-4 border-t flex-shrink-0">
          <Button onClick={onClose} variant="outline">
            Fermer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CallsModal;
