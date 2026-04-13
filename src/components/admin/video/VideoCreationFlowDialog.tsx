import React from 'react';
import { Dialog } from '@/components/ui/dialog';
import { LiveTeachingStudioEditor } from '@/live/components/studio-live';
import { BASE_SOUNDS, STICKERS } from './video-creation-flow/constants';
import { VideoCreationDetailsStep } from './video-creation-flow/components/VideoCreationDetailsStep';
import { VideoCreationFinalizeStep } from './video-creation-flow/components/VideoCreationFinalizeStep';
import { VideoCreationLiveStep } from './video-creation-flow/components/VideoCreationLiveStep';
import { VideoCreationLoadingOverlay } from './video-creation-flow/components/VideoCreationLoadingOverlay';
import { VideoCreationRecordStep } from './video-creation-flow/components/VideoCreationRecordStep';
import type { VideoCreationFlowDialogProps } from './video-creation-flow/types';
import { useVideoCreationFlow } from './video-creation-flow/hooks/useVideoCreationFlow';

const VideoCreationFlowDialog: React.FC<VideoCreationFlowDialogProps> = ({
  open,
  onOpenChange,
  onSuccess,
  initialStep,
  initialMethod,
  initialSourceVideoFile,
}) => {
  const flow = useVideoCreationFlow({
    open,
    onOpenChange,
    onSuccess,
    initialStep,
    initialMethod,
    initialSourceVideoFile,
  });

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        {flow.step === 'live' && (
          <VideoCreationLiveStep
            liveData={flow.liveData}
            isLaunchingLive={flow.isLaunchingLive}
            studioEditor={{
              preparedStudio: flow.preparedStudio,
              isStudioEditorOpen: flow.isStudioEditorOpen,
              setIsStudioEditorOpen: flow.setters.setIsStudioEditorOpen,
              setPreparedStudio: flow.setters.setPreparedStudio,
            }}
            onChange={flow.setters.setLiveData}
            onCancel={flow.actions.handleLiveCancel}
            onLaunch={() => void flow.actions.launchLive()}
          />
        )}

        {flow.step === 'record' && (
          <VideoCreationRecordStep
            liveVideoRef={flow.refs.liveVideoRef}
            isRecording={flow.isRecording}
            isRecordingPaused={flow.isRecordingPaused}
            countdownValue={flow.countdownValue}
            cameraFacingMode={flow.cameraFacingMode}
            flashEnabled={flow.flashEnabled}
            recordingTimerSeconds={flow.recordingTimerSeconds}
            onClose={() => onOpenChange(false)}
            onStartRecording={flow.actions.startRecording}
            onStopRecording={flow.actions.stopRecording}
            onToggleRecordingPause={flow.actions.toggleRecordingPause}
            onToggleCameraFacingMode={() => void flow.actions.toggleCameraFacingMode()}
            onToggleFlash={() => void flow.actions.toggleFlash()}
            onCycleRecordingTimer={flow.actions.cycleRecordingTimer}
          />
        )}

        {flow.step === 'finalize' && (
          <VideoCreationFinalizeStep
            sourcePreviewUrl={flow.sourcePreviewUrl}
            previewAspectRatio={flow.previewAspectRatio}
            setPreviewAspectRatio={flow.setters.setPreviewAspectRatio}
            customAudioFile={flow.customAudioFile}
            customAudioPreviewUrl={flow.customAudioPreviewUrl}
            selectedBaseSoundId={flow.selectedBaseSoundId}
            activeFinalizeOverlay={flow.activeFinalizeOverlay}
            stickerOverlays={flow.stickerOverlays}
            textOverlays={flow.textOverlays}
            selectedOverlay={flow.selectedOverlay}
            textDraft={flow.textDraft}
            textColorDraft={flow.textColorDraft}
            textFontFamilyDraft={flow.textFontFamilyDraft}
            textBoldDraft={flow.textBoldDraft}
            textItalicDraft={flow.textItalicDraft}
            textUnderlineDraft={flow.textUnderlineDraft}
            isProcessing={flow.isProcessing}
            stickers={STICKERS}
            baseSounds={BASE_SOUNDS}
            finalizeStageRef={flow.refs.finalizeStageRef}
            nativeAudioInputRef={flow.refs.nativeAudioInputRef}
            overlayHandlers={flow.overlayHandlers}
            onBack={() => flow.setters.setStep('record')}
            onRefilm={() => flow.setters.setStep('record')}
            onContinue={() => void flow.actions.continueAfterFinalize()}
            onSetActiveOverlay={flow.setters.setActiveFinalizeOverlay}
            onAddSticker={flow.actions.addStickerOverlay}
            onAddText={flow.actions.addTextOverlay}
            onEditSelectedText={(overlayId) => {
              flow.setters.setSelectedOverlay({ kind: 'text', id: overlayId });
              flow.setters.setActiveFinalizeOverlay('text');
            }}
            onUpdateSelectedText={flow.actions.updateSelectedTextOverlay}
            onUpdateSelectedTextColor={(value) => flow.actions.updateSelectedTextStyle({ color: value })}
            onUpdateSelectedTextFontFamily={(value) => flow.actions.updateSelectedTextStyle({ fontFamily: value })}
            onToggleBold={() => flow.actions.updateSelectedTextStyle({ fontWeight: flow.textBoldDraft ? 'normal' : 'bold' })}
            onToggleItalic={() => flow.actions.updateSelectedTextStyle({ fontStyle: flow.textItalicDraft ? 'normal' : 'italic' })}
            onToggleUnderline={() => flow.actions.updateSelectedTextStyle({ textDecoration: flow.textUnderlineDraft ? 'none' : 'underline' })}
            onResetOverlayTransform={flow.actions.resetOverlayTransform}
            onRemoveSelectedOverlay={flow.actions.removeSelectedOverlay}
            onSelectOverlay={flow.setters.setSelectedOverlay}
            onHandleBaseSoundSelection={(soundId) => void flow.actions.handleBaseSoundSelection(soundId)}
            onHandleCustomAudioSelection={flow.actions.handleCustomAudioSelection}
            onClearSelectedAudio={flow.actions.clearSelectedAudio}
          />
        )}

        {flow.step === 'details' && (
          <VideoCreationDetailsStep
            method={flow.method}
            sourcePreviewUrl={flow.sourcePreviewUrl}
            detailsPreviewSource={flow.detailsPreviewSource}
            thumbnailPreviewUrl={flow.thumbnailPreviewUrl}
            videoUrl={flow.videoUrl}
            formData={flow.formData}
            formations={flow.formations}
            isUploading={flow.isUploading}
            isProcessing={flow.isProcessing}
            detailsPreviewVideoRef={flow.refs.detailsPreviewVideoRef}
            onChangeVideoUrl={flow.setters.setVideoUrl}
            onChangeFormData={flow.setters.setFormData}
            onUploadVideoSelection={flow.actions.handleUploadVideoSelection}
            onCaptureThumbnail={() => void flow.actions.captureThumbnail()}
            onThumbnailUploadSelection={flow.actions.handleThumbnailUploadSelection}
            onBack={flow.actions.handleDetailsBack}
            onSaveDraft={() => void flow.actions.submitVideo('draft')}
            onPublish={() => void flow.actions.submitVideo('publish')}
          />
        )}
      </Dialog>

      <VideoCreationLoadingOverlay isVisible={flow.isProcessing} label={flow.processingLabel} />

      <LiveTeachingStudioEditor 
        open={flow.isStudioEditorOpen}
        onOpenChange={flow.setters.setIsStudioEditorOpen}
        initialStudio={flow.preparedStudio}
        onSave={flow.setters.setPreparedStudio}
      />
    </>
  );
};

export default VideoCreationFlowDialog;
