import React, { useEffect, useState } from 'react';
import { Phone, PhoneOff, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useCallNotifications } from '@/hooks/useCallNotifications';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import CallModal from '@/components/chat/CallModal';

interface StudentProfile {
  first_name: string;
  last_name: string;
  avatar_url?: string;
}

const CallNotificationHandler = () => {
  const { user } = useAuth();
  const { incomingCall, dismissCall } = useCallNotifications();
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [showCallModal, setShowCallModal] = useState(false);

  useEffect(() => {
    if (incomingCall) {
      fetchStudentProfile(incomingCall.caller_id);
      setShowCallModal(true);
    } else {
      setShowCallModal(false);
      setStudentProfile(null);
    }
  }, [incomingCall]);

  const fetchStudentProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('first_name, last_name, avatar_url')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setStudentProfile(data);
    } catch (error) {
      console.error('Erreur lors du chargement du profil étudiant:', error);
    }
  };

  const acceptCall = async () => {
    if (!incomingCall || !user) return;

    try {
      const { error } = await supabase
        .from('call_sessions')
        .update({ 
          status: 'accepted',
          receiver_id: user.id, // Ajout explicite du receiver_id pour identifier le professeur qui répond
          started_at: new Date().toISOString()
        })
        .eq('id', incomingCall.id);

      if (error) throw error;

      toast.success('Appel accepté');
      // Le modal restera ouvert pour gérer l'appel
    } catch (error) {
      console.error('Erreur lors de l\'acceptation de l\'appel:', error);
      toast.error('Erreur lors de l\'acceptation de l\'appel');
    }
  };

  const rejectCall = async () => {
    if (!incomingCall || !user) return;

    try {
      const { error } = await supabase
        .from('call_sessions')
        .update({ 
          status: 'rejected',
          receiver_id: user.id, // Ajout explicite du receiver_id pour identifier le professeur qui rejette
          ended_at: new Date().toISOString()
        })
        .eq('id', incomingCall.id);

      if (error) throw error;

      toast.info('Appel rejeté');
      dismissCall();
      setShowCallModal(false);
    } catch (error) {
      console.error('Erreur lors du rejet de l\'appel:', error);
      toast.error('Erreur lors du rejet de l\'appel');
    }
  };

  const endCall = async () => {
    if (!incomingCall || !user) return;

    try {
      const { error } = await supabase
        .from('call_sessions')
        .update({ 
          status: 'ended',
          receiver_id: user.id, // Ajout explicite du receiver_id pour identifier le professeur qui termine l'appel
          ended_at: new Date().toISOString()
        })
        .eq('id', incomingCall.id);

      if (error) throw error;

      toast.info('Appel terminé');
      dismissCall();
      setShowCallModal(false);
    } catch (error) {
      console.error('Erreur lors de la fin de l\'appel:', error);
    }
  };

  // Notification d'appel entrant (ne s'affiche que s'il n'y a pas de modal)
  if (incomingCall && !showCallModal && studentProfile) {
    return (
      <div className="fixed top-4 right-4 z-50 max-w-sm">
        <Card className="bg-white shadow-lg border-2 border-blue-500 animate-pulse">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3 mb-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={studentProfile.avatar_url} />
                <AvatarFallback className="bg-blue-100 text-blue-600">
                  {studentProfile.first_name.charAt(0)}{studentProfile.last_name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="font-semibold">
                  {studentProfile.first_name} {studentProfile.last_name}
                </h3>
                <p className="text-sm text-gray-600 flex items-center">
                  {incomingCall.call_type === 'video' ? (
                    <>
                      <Video size={14} className="mr-1" />
                      Appel vidéo entrant
                    </>
                  ) : (
                    <>
                      <Phone size={14} className="mr-1" />
                      Appel audio entrant
                    </>
                  )}
                </p>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button
                onClick={() => setShowCallModal(true)}
                className="flex-1 bg-green-500 hover:bg-green-600"
                size="sm"
              >
                <Phone size={16} className="mr-1" />
                Répondre
              </Button>
              <Button
                onClick={rejectCall}
                variant="destructive"
                size="sm"
              >
                <PhoneOff size={16} />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Modal d'appel
  if (showCallModal && incomingCall && studentProfile) {
    return (
      <CallModal
        isOpen={showCallModal}
        onClose={endCall}
        callType={incomingCall.call_type as 'audio' | 'video'}
        contactName={`${studentProfile.first_name} ${studentProfile.last_name}`}
        contactAvatar={studentProfile.avatar_url}
        isIncoming={true}
        onAccept={acceptCall}
        onDecline={rejectCall}
      />
    );
  }

  return null;
};

export default CallNotificationHandler;