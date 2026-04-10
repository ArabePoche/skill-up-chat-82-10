import React from 'react';
import { RemoteVideoTile } from './RemoteVideoTile';
import type { IRemoteVideoTrack } from 'agora-rtc-sdk-ng';
import type { AcceptedParticipant } from '../utils/types';
import { MicOff, VideoOff, PhoneOff, Mic, Video } from 'lucide-react';

interface LiveVideoGridProps {
  isHost: boolean;
  acceptedParticipants: AcceptedParticipant[];
  localVideoContainerRef: React.RefObject<HTMLDivElement>;
  getRemoteVideoTrack: (uid: string) => IRemoteVideoTrack | undefined;
  state: {
    remoteUsers: string[];
    isMuted: boolean;
    isVideoEnabled: boolean;
  };
  expandedParticipantControlsId: string | null;
  setExpandedParticipantControlsId: (id: string | null) => void;
  handleParticipantControl: (p: AcceptedParticipant, action: any) => void;
}

export const LiveVideoGrid: React.FC<LiveVideoGridProps> = ({
  isHost,
  acceptedParticipants,
  localVideoContainerRef,
  getRemoteVideoTrack,
  state,
  expandedParticipantControlsId,
  setExpandedParticipantControlsId,
  handleParticipantControl,
}) => {
  return (
    <div className="absolute top-20 right-3 z-30 flex flex-col gap-2 w-24 sm:w-32">
      {/* Vidéo locale (Hôte ou Intervenant accepté) */}
      <div className="relative group w-full overflow-hidden rounded-xl bg-zinc-900 aspect-[9/16] shadow-xl border border-white/10">
        <div ref={localVideoContainerRef} className="w-full h-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
        <div className="absolute bottom-1.5 left-1.5 right-1.5">
          <span className="text-white text-[9px] font-semibold bg-black/50 backdrop-blur-sm px-1.5 py-0.5 rounded-full truncate block text-center">
            Moi
          </span>
        </div>
        <div className="absolute top-1 right-1 flex flex-col gap-0.5 pointer-events-none">
          {state.isMuted && (
            <div className="bg-red-500/85 rounded-full p-0.5 shadow-sm">
              <MicOff className="h-2.5 w-2.5 text-white" />
            </div>
          )}
          {!state.isVideoEnabled && (
            <div className="bg-red-500/85 rounded-full p-0.5 shadow-sm">
              <VideoOff className="h-2.5 w-2.5 text-white" />
            </div>
          )}
        </div>
      </div>

      {/* Vidéos des autres intervenants */}
      {acceptedParticipants.map((participant) => {
        if (!participant.agoraUid) return null;
        const isExpanded = expandedParticipantControlsId === participant.userId;

        return (
          <div key={participant.userId} className="relative group">
            <RemoteVideoTile
              uid={participant.agoraUid}
              getRemoteVideoTrack={getRemoteVideoTrack}
              label={participant.userName}
              avatarUrl={participant.userAvatar || undefined}
              remoteUsers={state.remoteUsers}
              showMicOff={!participant.isMicEnabled}
              showCameraOff={!participant.isCameraEnabled}
              onRevealControls={() => isHost && setExpandedParticipantControlsId(isExpanded ? null : participant.userId)}
            />

            {/* Contrôles de l'hôte sur les intervenants */}
            {isHost && isExpanded && (
              <div className="absolute -left-10 top-0 bottom-0 flex flex-col justify-center gap-1.5 animate-in fade-in slide-in-from-right-4 duration-200">
                <button
                  type="button"
                  className={`flex h-7 w-7 items-center justify-center rounded-full backdrop-blur-md shadow-lg border border-white/10 text-white transition-all ${participant.isMicEnabled ? 'bg-black/60 hover:bg-red-500/80' : 'bg-red-500/80 hover:bg-green-500/80'}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleParticipantControl(participant, participant.isMicEnabled ? 'mic_off' : 'mic_on');
                  }}
                  title={participant.isMicEnabled ? 'Couper le micro' : 'Activer le micro'}
                >
                  {participant.isMicEnabled ? <Mic className="h-3.5 w-3.5" /> : <MicOff className="h-3.5 w-3.5" />}
                </button>
                <button
                  type="button"
                  className={`flex h-7 w-7 items-center justify-center rounded-full backdrop-blur-md shadow-lg border border-white/10 text-white transition-all ${participant.isCameraEnabled ? 'bg-black/60 hover:bg-red-500/80' : 'bg-red-500/80 hover:bg-green-500/80'}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleParticipantControl(participant, participant.isCameraEnabled ? 'camera_off' : 'camera_on');
                  }}
                  title={participant.isCameraEnabled ? 'Couper la caméra' : 'Activer la caméra'}
                >
                  {participant.isCameraEnabled ? <Video className="h-3.5 w-3.5" /> : <VideoOff className="h-3.5 w-3.5" />}
                </button>
                <button
                  type="button"
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-red-600/90 text-white backdrop-blur-md shadow-lg border border-white/10 hover:bg-red-600 transition-all"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleParticipantControl(participant, 'stop');
                  }}
                  title="Arrêter l'intervention"
                >
                  <PhoneOff className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
