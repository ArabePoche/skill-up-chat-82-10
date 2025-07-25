// Hook pour la gestion des médias en temps réel
import { useState, useRef, useCallback } from 'react';

export interface LiveMediaStream {
  id: string;
  type: 'camera' | 'screen';
  stream: MediaStream | null;
  isActive: boolean;
}

export const useLiveMedia = () => {
  const [mediaStreams, setMediaStreams] = useState<LiveMediaStream[]>([]);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [micEnabled, setMicEnabled] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      const newMediaStream: LiveMediaStream = {
        id: 'camera-main',
        type: 'camera',
        stream,
        isActive: true,
      };

      setMediaStreams(prev => [...prev.filter(s => s.id !== 'camera-main'), newMediaStream]);
      setCameraEnabled(true);
      setMicEnabled(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      return stream;
    } catch (error) {
      console.error('Erreur lors de l\'accès à la caméra:', error);
      throw error;
    }
  }, []);

  const stopCamera = useCallback(() => {
    const cameraStream = mediaStreams.find(s => s.id === 'camera-main');
    if (cameraStream?.stream) {
      cameraStream.stream.getTracks().forEach(track => track.stop());
    }

    setMediaStreams(prev => prev.filter(s => s.id !== 'camera-main'));
    setCameraEnabled(false);
    setMicEnabled(false);

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [mediaStreams]);

  const toggleCamera = useCallback(async () => {
    if (cameraEnabled) {
      stopCamera();
    } else {
      await startCamera();
    }
  }, [cameraEnabled, startCamera, stopCamera]);

  const toggleMic = useCallback(() => {
    const cameraStream = mediaStreams.find(s => s.id === 'camera-main');
    if (cameraStream?.stream) {
      const audioTrack = cameraStream.stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !micEnabled;
        setMicEnabled(!micEnabled);
      }
    }
  }, [mediaStreams, micEnabled]);

  const startScreenShare = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });

      const newMediaStream: LiveMediaStream = {
        id: 'screen-share',
        type: 'screen',
        stream,
        isActive: true,
      };

      setMediaStreams(prev => [...prev.filter(s => s.id !== 'screen-share'), newMediaStream]);
      return stream;
    } catch (error) {
      console.error('Erreur lors du partage d\'écran:', error);
      throw error;
    }
  }, []);

  const stopScreenShare = useCallback(() => {
    const screenStream = mediaStreams.find(s => s.id === 'screen-share');
    if (screenStream?.stream) {
      screenStream.stream.getTracks().forEach(track => track.stop());
    }

    setMediaStreams(prev => prev.filter(s => s.id !== 'screen-share'));
  }, [mediaStreams]);

  return {
    mediaStreams,
    cameraEnabled,
    micEnabled,
    videoRef,
    toggleCamera,
    toggleMic,
    startScreenShare,
    stopScreenShare,
  };
};