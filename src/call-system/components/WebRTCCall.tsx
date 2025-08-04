import React, { useEffect, useRef, useState } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

interface WebRTCCallProps {
  callId: string;
  isInitiator: boolean;
  callType: 'audio' | 'video';
  onEndCall: () => void;
  remoteUserName: string;
}

const WebRTCCall: React.FC<WebRTCCallProps> = ({
  callId,
  isInitiator,
  callType,
  onEndCall,
  remoteUserName
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(callType === 'video');
  const [duration, setDuration] = useState(0);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  // Configuration STUN/TURN pour WebRTC
  const rtcConfiguration: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ]
  };

  useEffect(() => {
    initializeWebRTC();
    return () => {
      cleanup();
    };
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isConnected) {
      interval = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isConnected]);

  const initializeWebRTC = async () => {
    try {
      console.log('🔄 Initializing WebRTC for call:', callId);

      // Obtenir les médias locaux
      const constraints: MediaStreamConstraints = {
        audio: true,
        video: callType === 'video'
      };

      const localStream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = localStream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStream;
      }

      // Créer la connexion peer
      const peerConnection = new RTCPeerConnection(rtcConfiguration);
      peerConnectionRef.current = peerConnection;

      // Ajouter les pistes locales
      localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
      });

      // Gérer les pistes distantes
      peerConnection.ontrack = (event) => {
        console.log('📺 Remote track received');
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      // Gérer les changements de connexion
      peerConnection.onconnectionstatechange = () => {
        console.log('🔗 Connection state:', peerConnection.connectionState);
        setIsConnected(peerConnection.connectionState === 'connected');
      };

      // Gérer les candidats ICE
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('🧊 ICE candidate:', event.candidate);
          // TODO: Envoyer le candidat via Supabase Realtime
        }
      };

      if (isInitiator) {
        // L'initiateur crée l'offre
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        console.log('📤 Offer created:', offer);
        // TODO: Envoyer l'offre via Supabase Realtime
      }

      toast.success('Connexion WebRTC initialisée');
    } catch (error) {
      console.error('❌ Error initializing WebRTC:', error);
      toast.error('Erreur lors de l\'initialisation de l\'appel');
    }
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  };

  const handleEndCall = () => {
    cleanup();
    onEndCall();
  };

  const cleanup = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header avec infos de l'appel */}
      <div className="p-4 bg-gray-900 text-white">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold">{remoteUserName}</h2>
            <p className="text-sm text-gray-300">
              {isConnected ? `En cours - ${formatDuration(duration)}` : 'Connexion...'}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
            <span className="text-sm">{isConnected ? 'Connecté' : 'Connexion...'}</span>
          </div>
        </div>
      </div>

      {/* Zone vidéo */}
      <div className="flex-1 relative">
        {callType === 'video' && (
          <>
            {/* Vidéo distante */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            
            {/* Vidéo locale */}
            <Card className="absolute top-4 right-4 w-48 h-36 overflow-hidden">
              <CardContent className="p-0 h-full">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              </CardContent>
            </Card>
          </>
        )}
        
        {callType === 'audio' && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-white">
              <div className="w-32 h-32 bg-gray-700 rounded-full flex items-center justify-center mb-4 mx-auto">
                <Phone className="w-16 h-16" />
              </div>
              <h3 className="text-xl font-semibold">{remoteUserName}</h3>
              <p className="text-gray-300">Appel audio en cours</p>
            </div>
          </div>
        )}
      </div>

      {/* Contrôles */}
      <div className="p-6 bg-gray-900">
        <div className="flex justify-center items-center space-x-4">
          <Button
            onClick={toggleMute}
            variant={isMuted ? 'destructive' : 'outline'}
            size="lg"
            className="w-12 h-12 rounded-full"
          >
            {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
          </Button>

          {callType === 'video' && (
            <Button
              onClick={toggleVideo}
              variant={!isVideoEnabled ? 'destructive' : 'outline'}
              size="lg"
              className="w-12 h-12 rounded-full"
            >
              {isVideoEnabled ? <Video size={20} /> : <VideoOff size={20} />}
            </Button>
          )}

          <Button
            onClick={handleEndCall}
            variant="destructive"
            size="lg"
            className="w-12 h-12 rounded-full"
          >
            <PhoneOff size={20} />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default WebRTCCall;