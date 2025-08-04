import React from 'react';
import { Phone, Video, User, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useIncomingCalls, IncomingCall } from '@/hooks/useIncomingCalls';
import { toast } from 'sonner';

interface IncomingCallsListProps {
  formationId: string;
  incomingCalls: IncomingCall[];
  className?: string;
}

const IncomingCallsList: React.FC<IncomingCallsListProps> = ({ formationId, incomingCalls, className }) => {
  const { acceptCall, rejectCall } = useIncomingCalls(formationId);

  const handleAcceptCall = async (call: IncomingCall) => {
    const success = await acceptCall(call.id);
    if (success) {
      toast.success(`Appel accepté avec ${call.caller_name}`);
      // TODO: Rediriger vers l'interface d'appel
    } else {
      toast.error('Erreur lors de l\'acceptation de l\'appel');
    }
  };

  const handleRejectCall = async (call: IncomingCall) => {
    const success = await rejectCall(call.id);
    if (success) {
      toast.info(`Appel rejeté de ${call.caller_name}`);
    } else {
      toast.error('Erreur lors du rejet de l\'appel');
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
      <div className={`text-center py-8 ${className}`}>
        <Phone className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">Aucun appel en attente</p>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {incomingCalls.map((call) => (
        <Card key={call.id} className="border-2 border-blue-200 bg-blue-50/50 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              {/* Avatar de l'appelant */}
              <Avatar className="h-12 w-12 border-2 border-blue-300">
                <AvatarImage src={call.caller_avatar} />
                <AvatarFallback className="bg-blue-100 text-blue-600">
                  {call.caller_name ? call.caller_name.charAt(0).toUpperCase() : <User className="w-6 h-6" />}
                </AvatarFallback>
              </Avatar>

              {/* Informations de l'appel */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
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
                
                <p className="text-sm text-gray-600 truncate mb-1">
                  {call.lesson_title || 'Leçon inconnue'}
                </p>
                
                <div className="flex items-center text-xs text-gray-500">
                  <Clock className="w-3 h-3 mr-1" />
                  Il y a {formatTimeAgo(call.created_at)}
                </div>
              </div>

              {/* Boutons d'action */}
              <div className="flex space-x-2">
                <Button
                  onClick={() => handleRejectCall(call)}
                  variant="outline"
                  size="sm"
                  className="h-9 w-9 p-0 border-red-200 hover:bg-red-50"
                >
                  <Phone className="h-4 w-4 text-red-600 rotate-135" />
                </Button>
                
                <Button
                  onClick={() => handleAcceptCall(call)}
                  size="sm"
                  className="h-9 bg-green-500 hover:bg-green-600 text-white"
                >
                  <Phone className="h-4 w-4 mr-1" />
                  Répondre
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default IncomingCallsList;