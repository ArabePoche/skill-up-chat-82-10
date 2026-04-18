/**
 * Composant Audio avec logique offline-first
 * Affiche toujours depuis le stockage local, jamais directement depuis Supabase
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Download, CloudOff, Loader2, Volume2, Play, Pause, AlertCircle } from 'lucide-react';
import { useOfflineMedia } from '../hooks/useOfflineMedia';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import WaveSurfer from 'wavesurfer.js';

interface OfflineAudioProps {
  /** URL distante de l'audio (Supabase) */
  src: string | null | undefined;
  /** Classes CSS du container */
  className?: string;
  /** Télécharger automatiquement */
  autoDownload?: boolean;
  /** Nom du fichier affiché */
  fileName?: string;
  /** Props supplémentaires pour l'élément audio */
  audioProps?: React.AudioHTMLAttributes<HTMLAudioElement>;
  /** Callback après téléchargement */
  onDownloaded?: () => void;
}

export const OfflineAudio: React.FC<OfflineAudioProps> = ({
  src,
  className,
  autoDownload = false,
  fileName,
  audioProps,
  onDownloaded,
}) => {
  const {
    displayUrl,
    status,
    progress,
    isLocal,
    hasCheckedLocal,
    download,
  } = useOfflineMedia({
    remoteUrl: src,
    mimeType: 'audio/mpeg',
    fileName,
    autoDownload,
  });

  const canOfferDownload = hasCheckedLocal && (status === 'remote' || status === 'error');

  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState('0:00');
  const [currentTime, setCurrentTime] = useState('0:00');

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  useEffect(() => {
    if (isLocal && onDownloaded) {
      onDownloaded();
    }
  }, [isLocal, onDownloaded]);

  useEffect(() => {
    if (!displayUrl || !containerRef.current) return;

    // Nettoyage de l'instance précédente si elle existe
    if (wavesurferRef.current) {
      wavesurferRef.current.destroy();
    }

    try {
      const ws = WaveSurfer.create({
        container: containerRef.current,
        waveColor: 'rgba(0, 0, 0, 0.2)',
        progressColor: '#25d366', // ou utilisez une couleur de thème pour ModernMediaPreview
        cursorColor: 'transparent',
        barWidth: 2,
        barRadius: 3,
        barGap: 2,
        height: 36,
        url: displayUrl,
        plugins: [],
      });

      ws.on('ready', () => {
        setDuration(formatTime(ws.getDuration()));
      });

      ws.on('audioprocess', () => {
        setCurrentTime(formatTime(ws.getCurrentTime()));
      });

      ws.on('finish', () => {
        setIsPlaying(false);
      });

      ws.on('error', (err) => {
        console.error('WaveSurfer erreur:', err);
      });

      wavesurferRef.current = ws;
    } catch (err) {
      console.error('Erreur initialisation WaveSurfer', err);
    }

    return () => {
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
      }
    };
  }, [displayUrl]);

  const handlePlayPause = () => {
    if (wavesurferRef.current) {
      wavesurferRef.current.playPause();
      setIsPlaying(wavesurferRef.current.isPlaying());
    }
  };

  // ⚡ PRIORITÉ ABSOLUE: Si on a une displayUrl, afficher immédiatement
  // Pas de vérification de status, affichage instantané, pas de shimmer
  if (displayUrl) {
    return (
      <div className={cn('flex items-center gap-3 p-2 bg-white/50 backdrop-blur-sm border border-white/40 shadow-sm rounded-[18px] min-w-[200px]', className)}>
        <button
          onClick={handlePlayPause}
          className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-violet-500 hover:bg-violet-600 text-white shadow-md transition-all"
        >
          {isPlaying ? <Pause className="h-5 w-5 fill-white" /> : <Play className="h-4 w-4 fill-white ml-0.5" />}
        </button>
        <div className="flex-1 flex flex-col justify-center w-[120px] max-w-full">
          <div ref={containerRef} className="w-full h-8" />
          <div className="flex justify-between mt-1 px-1 opacity-70">
            <span className="text-[10px] font-medium leading-none text-slate-500">
              {currentTime}
            </span>
            <span className="text-[10px] font-medium leading-none text-slate-400">
              {duration}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Téléchargement en cours
  if (status === 'downloading') {
    return (
      <div className={cn('flex items-center gap-3 p-2 bg-white/50 backdrop-blur-sm border border-white/40 shadow-sm rounded-[18px] min-w-[200px]', className)}>
        <div className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-slate-100 text-slate-400 border border-slate-200">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
        <div className="flex-1 px-1">
          <Progress value={progress} className="h-1.5 w-full bg-slate-200 rounded-full" />
          <div className="flex justify-between mt-1.5">
            <span className="text-[10px] font-medium text-slate-400">{fileName || 'Téléchargement...'}</span>
            <span className="text-[10px] font-medium text-violet-500">{Math.round(progress)}%</span>
          </div>
        </div>
      </div>
    );
  }

  // ✅ Tant que la vérification locale n'est pas terminée: PAS de bouton Télécharger.
  if (!hasCheckedLocal) {
    return (
      <div className={cn('flex items-center gap-3 p-2 bg-white/50 backdrop-blur-sm border border-white/40 shadow-sm rounded-[18px] min-w-[200px]', className)} aria-busy="true">
        <div className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-slate-100 text-slate-400 border border-slate-200">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
        <span className="flex-1 text-[11px] font-medium text-slate-500 truncate">{fileName || 'Fichier audio'}</span>
      </div>
    );
  }

  // Hors ligne
  if (status === 'offline_unavailable') {
    return (
      <div className={cn('flex items-center gap-3 p-2 bg-white/50 backdrop-blur-sm border border-white/40 shadow-sm rounded-[18px] min-w-[200px] opacity-60 grayscale', className)}>
        <div className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-slate-100 text-slate-400 border border-slate-200">
          <CloudOff className="h-5 w-5" />
        </div>
        <span className="flex-1 text-[10px] font-medium text-slate-500 leading-tight">Média distant<br/>hors ligne</span>
      </div>
    );
  }

  // Non téléchargé
  return (
    <div className={cn('flex items-center justify-between gap-3 p-2 bg-white/50 backdrop-blur-sm border border-white/40 shadow-sm rounded-[18px] min-w-[200px]', className)}>
      <div className="flex items-center gap-3 flex-1 overflow-hidden">
        <div className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
          <Volume2 className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0 pr-2">
          <span className="block text-[11px] font-medium text-slate-600 truncate">{fileName || 'Audio'}</span>
          <span className="block text-[9px] text-slate-400">Prêt à télécharger</span>
        </div>
      </div>

      {canOfferDownload && (
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="h-8 w-8 rounded-full bg-violet-100 hover:bg-violet-200 text-violet-600 flex-shrink-0 transition-colors shadow-sm cursor-pointer relative z-10"
          title="Télécharger l'audio"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            download();
          }}
        >
          <Download className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};
