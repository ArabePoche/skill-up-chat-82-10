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

export interface AgoraJoinOptions {
  uid?: number;
  role?: 'host' | 'viewer';
  enableAudio?: boolean;
  enableVideo?: boolean;
}

export const useAgoraCall = () => {
  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const localAudioTrackRef = useRef<IMicrophoneAudioTrack | null>(null);
  const localVideoTrackRef = useRef<ICameraVideoTrack | null>(null);
  const latestRemoteVideoTrackRef = useRef<IRemoteVideoTrack | null>(null);
  const localVideoElementRef = useRef<HTMLDivElement | null>(null);
  const remoteVideoElementRef = useRef<HTMLDivElement | null>(null);
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const joinRequestIdRef = useRef(0);

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
  const fetchToken = useCallback(async (channelName: string, uid: number, role: 'host' | 'viewer') => {
    const { data, error } = await supabase.functions.invoke('agora-token', {
      body: { channelName, uid, role: role === 'viewer' ? 'subscriber' : 'publisher' },
    });

    if (error) {
      console.error('❌ Error fetching Agora token:', error);
      throw new Error(error.message || 'Impossible de récupérer le token Agora');
    }

    if (!data?.token) {
      throw new Error('Token Agora vide. Configurez AGORA_APP_CERTIFICATE dans les secrets Supabase.');
    }

    return data as { token: string; appId: string; uid: number; channelName: string };
  }, []);

  const playLocalTrack = useCallback(() => {
    console.log('🎥 playLocalTrack attempt', {
      hasTrack: !!localVideoTrackRef.current,
      hasElement: !!localVideoElementRef.current,
    });
    if (!localVideoTrackRef.current || !localVideoElementRef.current) {
      return;
    }

    localVideoElementRef.current.innerHTML = '';
    localVideoTrackRef.current.play(localVideoElementRef.current, { fit: 'cover' });
    console.log('🎥 local track played on element');
  }, []);

  const playRemoteTrack = useCallback(() => {
    console.log('🎥 playRemoteTrack attempt', {
      hasTrack: !!latestRemoteVideoTrackRef.current,
      hasElement: !!remoteVideoElementRef.current,
    });
    if (!latestRemoteVideoTrackRef.current || !remoteVideoElementRef.current) {
      return;
    }

    remoteVideoElementRef.current.innerHTML = '';
    latestRemoteVideoTrackRef.current.play(remoteVideoElementRef.current, { fit: 'cover' });
    console.log('🎥 remote track played on element');
  }, []);

  const localVideoContainerRef = useCallback((element: HTMLDivElement | null) => {
    localVideoElementRef.current = element;
    if (element) {
      playLocalTrack();
    }
  }, [playLocalTrack]);

  const remoteVideoContainerRef = useCallback((element: HTMLDivElement | null) => {
    remoteVideoElementRef.current = element;
    if (element) {
      playRemoteTrack();
    }
  }, [playRemoteTrack]);

  /**
   * Rejoindre un canal Agora
   */
  const joinCall = useCallback(async (channelName: string, callType: 'audio' | 'video', options?: number | AgoraJoinOptions) => {
    const joinRequestId = ++joinRequestIdRef.current;

    if (clientRef.current) {
      console.warn('Already in a call');
      return;
    }

    setState(prev => ({ ...prev, isConnecting: true }));

    try {
      const resolvedOptions = typeof options === 'number' ? { uid: options } : (options || {});
      const role = resolvedOptions.role || 'host';
      const enableAudio = resolvedOptions.enableAudio ?? role === 'host';
      const enableVideo = resolvedOptions.enableVideo ?? (callType === 'video' && role === 'host');
      const agoraUid = resolvedOptions.uid || Math.floor(Math.random() * 100000);
      
      // 1. Récupérer le token
      const tokenData = await fetchToken(channelName, agoraUid, role);
      console.log('✅ Agora token received for channel:', channelName);

      // 2. Créer le client Agora
      const client = AgoraRTC.createClient({ mode: 'live', codec: 'vp8' });
      clientRef.current = client;

      client.on('connection-state-change', (currentState, previousState, reason) => {
        console.log('🌐 Agora connection state:', previousState, '->', currentState, reason || '');
      });

      client.on('media-reconnect-start', (uid) => {
        console.warn('🔄 Agora media reconnect start:', uid);
      });

      client.on('media-reconnect-end', (uid) => {
        console.log('✅ Agora media reconnect end:', uid);
      });

      client.on('is-using-cloud-proxy', (isUsingProxy) => {
        console.log('🛡️ Agora cloud proxy:', isUsingProxy ? 'enabled' : 'disabled');
      });

      client.on('join-fallback-to-proxy', (proxyServer) => {
        console.warn('↪️ Agora fallback proxy:', proxyServer);
      });

      client.on('exception', (event) => {
        console.warn('⚠️ Agora exception:', event);
      });

      // 3. Gérer les utilisateurs distants
      client.on('user-published', async (user, mediaType) => {
        await client.subscribe(user, mediaType);
        console.log('📺 Subscribed to remote user:', user.uid, mediaType);

        if (mediaType === 'video') {
          const remoteVideoTrack = user.videoTrack as IRemoteVideoTrack;
          latestRemoteVideoTrackRef.current = remoteVideoTrack;
          playRemoteTrack();
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

      if (joinRequestId !== joinRequestIdRef.current) {
        await client.leave();
        return;
      }

      await client.setClientRole(role === 'host' ? 'host' : 'audience');
      console.log('✅ Joined Agora channel:', channelName);

      // 5. Créer et publier les pistes locales
      if (role === 'host') {
        const tracksToPublish = [] as Array<IMicrophoneAudioTrack | ICameraVideoTrack>;

        if (enableAudio) {
          const localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
          localAudioTrackRef.current = localAudioTrack;
          tracksToPublish.push(localAudioTrack);
        }

        if (enableVideo) {
          const localVideoTrack = await AgoraRTC.createCameraVideoTrack();
          localVideoTrackRef.current = localVideoTrack;
          playLocalTrack();

          tracksToPublish.push(localVideoTrack);
        }

        if (tracksToPublish.length > 0) {
          await client.publish(tracksToPublish);
        }
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
        isVideoEnabled: !!enableVideo,
      }));

      toast.success('Connecté à l\'appel');
    } catch (error) {
      console.error('❌ Error joining Agora call:', error);
      if (typeof error === 'object' && error && 'code' in error) {
        console.error('❌ Agora error code:', (error as { code?: string }).code);
      }
      setState(prev => ({ ...prev, isConnecting: false }));
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la connexion à l\'appel');
      // Nettoyer en cas d'erreur
      await leaveCall();
    }
  }, [fetchToken]);

  /**
   * Quitter l'appel et nettoyer toutes les ressources
   */
  const leaveCall = useCallback(async () => {
    joinRequestIdRef.current++; // Invalidate pending joins

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

    latestRemoteVideoTrackRef.current = null;

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
