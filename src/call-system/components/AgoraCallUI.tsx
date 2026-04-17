/**
 * Interface d'appel Agora en plein écran
 * Affiche les flux vidéo local/distant + contrôles (mute, caméra, raccrocher)
 */
import React, { useEffect, useRef } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, Loader2, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAgoraCall } from '../hooks/useAgoraCall';

interface AgoraCallUIProps {
  callId: string;
  channelName: string;
  callType: 'audio' | 'video';
  remoteUserName: string;
  remoteUserAvatar?: string;
  localUserAvatar?: string;
  onEndCall: () => void;
  onRemoteEndCall?: () => void;
}

const AgoraCallUI: React.FC<AgoraCallUIProps> = ({
  callId,
  channelName,
  callType,
  remoteUserName,
  remoteUserAvatar,
  localUserAvatar,
  onEndCall,
  onRemoteEndCall,
}) => {
  const hasSeenRemoteParticipantRef = useRef(false);
  const {
    state,
    joinCall,
    leaveCall,
    toggleMute,
    toggleVideo,
    switchCamera,
    localVideoContainerRef,
    remoteVideoContainerRef,
  } = useAgoraCall();

  useEffect(() => {
    hasSeenRemoteParticipantRef.current = false;
  }, [callId]);

  useEffect(() => {
    if (state.remoteUsers.length > 0) {
      hasSeenRemoteParticipantRef.current = true;
    }
  }, [state.remoteUsers.length]);

  useEffect(() => {
    if (!state.isJoined) {
      return;
    }

    if (state.remoteUsers.length > 0) {
      return;
    }

    if (!hasSeenRemoteParticipantRef.current) {
      return;
    }

    const closeForRemoteHangup = async () => {
      await leaveCall();
      onRemoteEndCall?.();
    };

    void closeForRemoteHangup();
  }, [leaveCall, onRemoteEndCall, state.isJoined, state.remoteUsers.length]);

  // Rejoindre automatiquement à l'ouverture
  useEffect(() => {
    joinCall(channelName, callType);
    return () => {
      leaveCall();
    };
  }, [channelName, callType]);

  const handleEndCall = async () => {
    await leaveCall();
    onEndCall();
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const initials = remoteUserName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || '?';

  const localInitials = 'Vous'
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="p-4 bg-black/80 text-white backdrop-blur-sm">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold">{remoteUserName}</h2>
            <p className="text-sm text-white/70">
              {state.isConnecting
                ? 'Connexion en cours...'
                : state.isJoined
                  ? `En cours — ${formatDuration(state.duration)}`
                  : 'Initialisation...'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {state.isConnecting && <Loader2 className="w-4 h-4 animate-spin text-white/70" />}
            <div className={`w-3 h-3 rounded-full ${state.isJoined ? 'bg-green-400' : 'bg-amber-400 animate-pulse'}`} />
          </div>
        </div>
      </div>

      {/* Zone vidéo / audio */}
      <div className="flex-1 relative">
        {callType === 'video' ? (
          <>
            {/* Vidéo distante */}
            <div
              ref={remoteVideoContainerRef}
              className="w-full h-full bg-black"
            />

            {/* Vidéo locale (picture-in-picture) */}
            <div
              ref={localVideoContainerRef}
              className="absolute top-4 right-4 w-32 h-24 sm:w-48 sm:h-36 rounded-lg overflow-hidden border-2 border-white/20 bg-black shadow-lg"
            >
              {!state.isVideoEnabled && (
                <div className="flex h-full w-full items-center justify-center bg-zinc-950/90">
                  <Avatar className="h-16 w-16 border border-white/20">
                    <AvatarImage src={localUserAvatar} alt="Vous" />
                    <AvatarFallback className="bg-white/10 text-white">{localInitials}</AvatarFallback>
                  </Avatar>
                </div>
              )}
            </div>

            {/* Message si personne n'est encore connecté */}
            {state.isJoined && state.remoteUsers.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center text-white/70">
                  <Avatar className="mx-auto mb-4 h-24 w-24 border border-white/20">
                    <AvatarImage src={remoteUserAvatar} alt={remoteUserName} />
                    <AvatarFallback className="bg-white/10 text-xl text-white">{initials}</AvatarFallback>
                  </Avatar>
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                  <p>En attente du correspondant...</p>
                </div>
              </div>
            )}
          </>
        ) : (
          /* Appel audio uniquement */
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-white">
              <Avatar className="mx-auto mb-6 h-32 w-32 border border-white/20">
                <AvatarImage src={remoteUserAvatar} alt={remoteUserName} />
                <AvatarFallback className="bg-white/10 text-3xl text-white">{initials}</AvatarFallback>
              </Avatar>
              <h3 className="text-xl font-semibold mb-1">{remoteUserName}</h3>
              <p className="text-white/50">
                {state.isJoined
                  ? state.remoteUsers.length > 0
                    ? 'Appel audio en cours'
                    : 'En attente du correspondant...'
                  : 'Connexion...'}
              </p>
              <div className="mt-5 flex items-center justify-center gap-2 text-xs text-white/60">
                <Avatar className="h-7 w-7 border border-white/15">
                  <AvatarImage src={localUserAvatar} alt="Vous" />
                  <AvatarFallback className="bg-white/10 text-white">{localInitials}</AvatarFallback>
                </Avatar>
                <span>Vous</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Contrôles */}
      <div className="p-6 bg-black/80 backdrop-blur-sm">
        <div className="flex justify-center items-center gap-4">
          <Button
            onClick={toggleMute}
            variant={state.isMuted ? 'destructive' : 'outline'}
            size="lg"
            className={state.isMuted
              ? 'w-14 h-14 rounded-full text-white hover:text-white'
              : 'w-14 h-14 rounded-full border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white'}
          >
            {state.isMuted ? <MicOff size={22} /> : <Mic size={22} />}
          </Button>

          {callType === 'video' && (
            <Button
              onClick={toggleVideo}
              variant={!state.isVideoEnabled ? 'destructive' : 'outline'}
              size="lg"
              className={!state.isVideoEnabled
                ? 'w-14 h-14 rounded-full text-white hover:text-white'
                : 'w-14 h-14 rounded-full border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white'}
            >
              {state.isVideoEnabled ? <Video size={22} /> : <VideoOff size={22} />}
            </Button>
          )}

          {callType === 'video' && state.isVideoEnabled && (
            <Button
              onClick={() => {
                void switchCamera();
              }}
              variant="outline"
              size="lg"
              className="w-14 h-14 rounded-full border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"
            >
              <RefreshCcw size={22} />
            </Button>
          )}

          <Button
            onClick={handleEndCall}
            variant="destructive"
            size="lg"
            className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700"
          >
            <PhoneOff size={22} />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AgoraCallUI;
