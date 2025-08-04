import React, { useState } from 'react';
import { Phone, Video, User, Clock, PhoneOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CallSession } from '../hooks/useCallSystem';
import { toast } from 'sonner';

interface IncomingCallsGridProps {
  incomingCalls: CallSession[];
  onAcceptCall: (callId: string) => Promise<boolean>;
  onRejectCall: (callId: string) => Promise<boolean>;
}

const IncomingCallsGrid: React.FC<IncomingCallsGridProps> = ({ 
  incomingCalls, 
  onAcceptCall, 
  onRejectCall 
}) => {
  const [processingCalls, setProcessingCalls] = useState<Set<string>>(new Set());

  const handleAcceptCall = async (call: CallSession) => {
    setProcessingCalls(prev => new Set(prev).add(call.id));
    
    try {
      const success = await onAcceptCall(call.id);
      if (success) {
        toast.success(`Appel accepté avec ${call.caller_name}`);
        // TODO: Rediriger vers l'interface d'appel WebRTC
      } else {
        toast.error('Erreur lors de l\'acceptation de l\'appel');
      }
    } catch (error) {
      console.error('Error accepting call:', error);
      toast.error('Erreur lors de l\'acceptation de l\'appel');
    } finally {
      setProcessingCalls(prev => {
        const newSet = new Set(prev);
        newSet.delete(call.id);
        return newSet;
      });
    }
  };

  const handleRejectCall = async (call: CallSession) => {
    setProcessingCalls(prev => new Set(prev).add(call.id));
    
    try {
      const success = await onRejectCall(call.id);
      if (success) {
        toast.info(`Appel rejeté de ${call.caller_name}`);
      } else {
        toast.error('Erreur lors du rejet de l\'appel');
      }
    } catch (error) {
      console.error('Error rejecting call:', error);
      toast.error('Erreur lors du rejet de l\'appel');
    } finally {
      setProcessingCalls(prev => {
        const newSet = new Set(prev);
        newSet.delete(call.id);
        return newSet;
      });
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const callTime = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - callTime.getTime()) / 1000);
    
    if (diffInSeconds < 60) return `${diffInSeconds}s`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}min`;
    return `${Math.floor(diffInSeconds / 3600)}h`;
  };

  if (incomingCalls.length === 0) {
    return (
      <div className="text-center py-12">
        <Phone className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun appel en attente</h3>
        <p className="text-gray-500 text-sm">
          Les nouveaux appels apparaîtront ici en temps réel
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 p-4">
      {incomingCalls.map((call) => {
        const isProcessing = processingCalls.has(call.id);
        
        return (
          <Card key={call.id} className="border-2 border-blue-200 bg-blue-50/50 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center space-x-4">
                {/* Avatar de l'appelant */}
                <Avatar className="h-14 w-14 border-2 border-blue-300 flex-shrink-0">
                  <AvatarImage src={call.caller_avatar} />
                  <AvatarFallback className="bg-blue-100 text-blue-600 font-semibold">
                    {call.caller_name ? call.caller_name.charAt(0).toUpperCase() : <User className="w-6 h-6" />}
                  </AvatarFallback>
                </Avatar>

                {/* Informations de l'appel */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {call.caller_name || 'Utilisateur inconnu'}
                    </h3>
                    <Badge variant={call.call_type === 'video' ? 'default' : 'secondary'} className="text-xs">
                      {call.call_type === 'video' ? (
                        <><Video className="w-3 h-3 mr-1" />Vidéo</>
                      ) : (
                        <><Phone className="w-3 h-3 mr-1" />Audio</>
                      )}
                    </Badge>
                  </div>
                  
                  <p className="text-sm text-gray-600 truncate mb-2">
                    {call.lesson_title || 'Leçon inconnue'}
                  </p>
                  
                  <div className="flex items-center text-xs text-gray-500">
                    <Clock className="w-3 h-3 mr-1" />
                    Il y a {formatTimeAgo(call.created_at)}
                  </div>
                </div>

                {/* Boutons d'action */}
                <div className="flex space-x-2 flex-shrink-0">
                  <Button
                    onClick={() => handleRejectCall(call)}
                    variant="outline"
                    size="sm"
                    disabled={isProcessing}
                    className="h-10 w-10 p-0 border-red-200 hover:bg-red-50"
                  >
                    <PhoneOff className="h-4 w-4 text-red-600" />
                  </Button>
                  
                  <Button
                    onClick={() => handleAcceptCall(call)}
                    size="sm"
                    disabled={isProcessing}
                    className="h-10 bg-green-500 hover:bg-green-600 text-white min-w-[100px]"
                  >
                    <Phone className="h-4 w-4 mr-2" />
                    {isProcessing ? 'En cours...' : 'Répondre'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default IncomingCallsGrid;