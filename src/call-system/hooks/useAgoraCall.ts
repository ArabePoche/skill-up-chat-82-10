/**
 * Hook pour gérer un appel audio/vidéo via le SDK Agora RTC
 * Gère : connexion au canal, publication/abonnement des pistes, mute, fin d'appel
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import AgoraRTC, {
  IAgoraRTCClient,
  IMicrophoneAudioTrack,
  ICameraVideoTrack,
  IRemoteVideoTrack,
  IRemoteAudioTrack,
} from 'agora-rtc-sdk-ng';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Désactiver les logs verbeux d'Agora en production
AgoraRTC.setLogLevel(3);

export interface AgoraCallState {
  isJoined: boolean;
  isConnecting: boolean;
  isMuted: boolean;
  isVideoEnabled: boolean;
  remoteUsers: string[];
  duration: number;
}

export const useAgoraCall = () => {
  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const localAudioTrackRef = useRef<IMicrophoneAudioTrack | null>(null);
  const localVideoTrackRef = useRef<ICameraVideoTrack | null>(null);
  const localVideoContainerRef = useRef<HTMLDivElement | null>(null);
  const remoteVideoContainerRef = useRef<HTMLDivElement | null>(null);
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [state, setState] = useState<AgoraCallState>({
    isJoined: false,
    isConnecting: false,
    isMuted: false,
    isVideoEnabled: true,
    remoteUsers: [],
    duration: 0,
  });

  // Nettoyage au démontage
  useEffect(() => {
    return () => {
      leaveCall();
    };
  }, []);

  /**
   * Récupérer un token Agora via l'edge function
   */
  const fetchToken = useCallback(async (channelName: string, uid: number) => {
    const { data, error } = await supabase.functions.invoke('agora-token', {
      body: { channelName, uid, role: 'publisher' },
    });

    if (error) {
      console.error('❌ Error fetching Agora token:', error);
      throw new Error('Impossible de récupérer le token Agora');
    }

    return data as { token: string; appId: string; uid: number; channelName: string };
  }, []);

  /**
   * Rejoindre un canal Agora
   */
  const joinCall = useCallback(async (channelName: string, callType: 'audio' | 'video', uid?: number) => {
    if (clientRef.current) {
      console.warn('Already in a call');
      return;
    }

    setState(prev => ({ ...prev, isConnecting: true }));

    try {
      const agoraUid = uid || Math.floor(Math.random() * 100000);
      
      // 1. Récupérer le token
      const tokenData = await fetchToken(channelName, agoraUid);
      console.log('✅ Agora token received for channel:', channelName);

      // 2. Créer le client Agora
      const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
      clientRef.current = client;

      // 3. Gérer les utilisateurs distants
      client.on('user-published', async (user, mediaType) => {
        await client.subscribe(user, mediaType);
        console.log('📺 Subscribed to remote user:', user.uid, mediaType);

        if (mediaType === 'video') {
          const remoteVideoTrack = user.videoTrack as IRemoteVideoTrack;
          if (remoteVideoContainerRef.current) {
            remoteVideoTrack.play(remoteVideoContainerRef.current);
          }
        }
        if (mediaType === 'audio') {
          const remoteAudioTrack = user.audioTrack as IRemoteAudioTrack;
          remoteAudioTrack.play();
        }

        setState(prev => ({
          ...prev,
          remoteUsers: [...new Set([...prev.remoteUsers, String(user.uid)])],
        }));
      });

      client.on('user-unpublished', (user, mediaType) => {
        console.log('🔇 Remote user unpublished:', user.uid, mediaType);
      });

      client.on('user-left', (user) => {
        console.log('👋 Remote user left:', user.uid);
        setState(prev => ({
          ...prev,
          remoteUsers: prev.remoteUsers.filter(id => id !== String(user.uid)),
        }));
      });

      // 4. Rejoindre le canal
      await client.join(tokenData.appId, channelName, tokenData.token, agoraUid);
      console.log('✅ Joined Agora channel:', channelName);

      // 5. Créer et publier les pistes locales
      const localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
      localAudioTrackRef.current = localAudioTrack;

      if (callType === 'video') {
        const localVideoTrack = await AgoraRTC.createCameraVideoTrack();
        localVideoTrackRef.current = localVideoTrack;

        if (localVideoContainerRef.current) {
          localVideoTrack.play(localVideoContainerRef.current);
        }

        await client.publish([localAudioTrack, localVideoTrack]);
      } else {
        await client.publish([localAudioTrack]);
      }

      console.log('✅ Published local tracks');

      // 6. Démarrer le compteur de durée
      durationIntervalRef.current = setInterval(() => {
        setState(prev => ({ ...prev, duration: prev.duration + 1 }));
      }, 1000);

      setState(prev => ({
        ...prev,
        isJoined: true,
        isConnecting: false,
        isVideoEnabled: callType === 'video',
      }));

      toast.success('Connecté à l\'appel');
    } catch (error) {
      console.error('❌ Error joining Agora call:', error);
      setState(prev => ({ ...prev, isConnecting: false }));
      toast.error('Erreur lors de la connexion à l\'appel');
      // Nettoyer en cas d'erreur
      await leaveCall();
    }
  }, [fetchToken]);

  /**
   * Quitter l'appel et nettoyer toutes les ressources
   */
  const leaveCall = useCallback(async () => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    if (localAudioTrackRef.current) {
      localAudioTrackRef.current.stop();
      localAudioTrackRef.current.close();
      localAudioTrackRef.current = null;
    }

    if (localVideoTrackRef.current) {
      localVideoTrackRef.current.stop();
      localVideoTrackRef.current.close();
      localVideoTrackRef.current = null;
    }

    if (clientRef.current) {
      await clientRef.current.leave();
      clientRef.current = null;
    }

    setState({
      isJoined: false,
      isConnecting: false,
      isMuted: false,
      isVideoEnabled: true,
      remoteUsers: [],
      duration: 0,
    });
  }, []);

  /**
   * Basculer le micro
   */
  const toggleMute = useCallback(() => {
    if (localAudioTrackRef.current) {
      const newMuted = !state.isMuted;
      localAudioTrackRef.current.setEnabled(!newMuted);
      setState(prev => ({ ...prev, isMuted: newMuted }));
    }
  }, [state.isMuted]);

  /**
   * Basculer la caméra
   */
  const toggleVideo = useCallback(() => {
    if (localVideoTrackRef.current) {
      const newEnabled = !state.isVideoEnabled;
      localVideoTrackRef.current.setEnabled(newEnabled);
      setState(prev => ({ ...prev, isVideoEnabled: newEnabled }));
    }
  }, [state.isVideoEnabled]);

  return {
    state,
    joinCall,
    leaveCall,
    toggleMute,
    toggleVideo,
    localVideoContainerRef,
    remoteVideoContainerRef,
  };
};
