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
  localUid: number | null;
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
  const remoteVideoTracksRef = useRef<Map<string, IRemoteVideoTrack>>(new Map());
  const firstRemoteUidRef = useRef<string | null>(null);
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
    localUid: null,
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
          const uid = String(user.uid);
          remoteVideoTracksRef.current.set(uid, remoteVideoTrack);
          // Only the first remote publisher goes into the background container
          if (!firstRemoteUidRef.current) {
            firstRemoteUidRef.current = uid;
            latestRemoteVideoTrackRef.current = remoteVideoTrack;
            playRemoteTrack();
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
        if (mediaType === 'video') {
          const uid = String(user.uid);
          remoteVideoTracksRef.current.delete(uid);
          if (firstRemoteUidRef.current === uid) {
            // Main stream stopped – promote the next available track
            const nextUid = remoteVideoTracksRef.current.keys().next().value as string | undefined;
            if (nextUid !== undefined) {
              firstRemoteUidRef.current = nextUid;
              latestRemoteVideoTrackRef.current = remoteVideoTracksRef.current.get(nextUid) ?? null;
              playRemoteTrack();
            } else {
              firstRemoteUidRef.current = null;
              latestRemoteVideoTrackRef.current = null;
            }
          }
        }
      });

      client.on('user-left', (user) => {
        console.log('👋 Remote user left:', user.uid);
        const uid = String(user.uid);
        remoteVideoTracksRef.current.delete(uid);
        if (firstRemoteUidRef.current === uid) {
          firstRemoteUidRef.current = null;
          latestRemoteVideoTrackRef.current = null;
        }
        setState(prev => ({
          ...prev,
          remoteUsers: prev.remoteUsers.filter(id => id !== uid),
        }));
      });

      // 4. Rejoindre le canal
      const assignedUid = await client.join(tokenData.appId, channelName, tokenData.token, agoraUid);

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
        localUid: typeof assignedUid === 'number' ? assignedUid : agoraUid,
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
    remoteVideoTracksRef.current.clear();
    firstRemoteUidRef.current = null;

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
      localUid: null,
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

  /**
   * Récupérer la piste vidéo d'un utilisateur distant par son UID Agora
   */
  const getRemoteVideoTrack = useCallback((uid: string): IRemoteVideoTrack | undefined => {
    return remoteVideoTracksRef.current.get(uid);
  }, []);

  /**
   * Passer du rôle audience au rôle hôte (intervenant accepté)
   * Active le micro et la caméra, puis publie les pistes dans le canal
   */
  const upgradeToHost = useCallback(async (options: { enableAudio?: boolean; enableVideo?: boolean } = {}) => {
    const client = clientRef.current;
    if (!client) {
      toast.error('Non connecté au canal Agora');
      return;
    }

    const { enableAudio = true, enableVideo = true } = options;

    try {
      await client.setClientRole('host');

      const tracksToPublish: Array<IMicrophoneAudioTrack | ICameraVideoTrack> = [];

      if (enableAudio && !localAudioTrackRef.current) {
        const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
        localAudioTrackRef.current = audioTrack;
        tracksToPublish.push(audioTrack);
      }

      if (enableVideo && !localVideoTrackRef.current) {
        const videoTrack = await AgoraRTC.createCameraVideoTrack();
        localVideoTrackRef.current = videoTrack;
        playLocalTrack();
        tracksToPublish.push(videoTrack);
      }

      if (tracksToPublish.length > 0) {
        await client.publish(tracksToPublish);
      }

      setState(prev => ({
        ...prev,
        isMuted: !enableAudio,
        isVideoEnabled: enableVideo,
      }));

      toast.success('Vous intervenez maintenant dans le live !');
    } catch (error) {
      console.error('❌ Error upgrading to host:', error);
      toast.error('Impossible d\'activer votre micro/caméra');
    }
  }, [playLocalTrack]);

  return {
    state,
    joinCall,
    leaveCall,
    toggleMute,
    toggleVideo,
    localVideoContainerRef,
    remoteVideoContainerRef,
    getRemoteVideoTrack,
    upgradeToHost,
  };
};
