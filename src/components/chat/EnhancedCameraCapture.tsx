/**
 * Composant de capture photo responsive avec annotation
 * Compatible mobile et desktop
 */
import React, { useEffect, useMemo, useState, useRef } from 'react';
import { Camera, Video, X, Check, Upload, Edit3, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import ImageEditor from './ImageEditor';

interface EnhancedCameraCaptureProps {
  onCapture: (file: File, annotated?: boolean) => void;
  disabled?: boolean;
}

const EnhancedCameraCapture: React.FC<EnhancedCameraCaptureProps> = ({ 
  onCapture, 
  disabled = false 
}) => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureMode, setCaptureMode] = useState<'photo' | 'video'>('photo');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedVideo, setCapturedVideo] = useState<string | null>(null);
  const [showAnnotation, setShowAnnotation] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSecondsLeft, setRecordingSecondsLeft] = useState(60);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isCapturing || (capturedImage || capturedVideo) || !videoRef.current || !streamRef.current) {
      return;
    }

    const video = videoRef.current;
    video.srcObject = streamRef.current;
    video.muted = true;

    const playVideo = async () => {
      try {
        await video.play();
      } catch (error) {
        console.error('Erreur lecture caméra:', error);
      }
    };

    void playVideo();
  }, [capturedImage, capturedVideo, isCapturing]);

  useEffect(() => {
    if (!isRecording) {
      if (recordingTimerRef.current) {
        window.clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      return;
    }

    recordingTimerRef.current = window.setInterval(() => {
      setRecordingSecondsLeft((current) => {
        if (current <= 1) {
          window.clearInterval(recordingTimerRef.current ?? undefined);
          recordingTimerRef.current = null;
          stopRecording();
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => {
      if (recordingTimerRef.current) {
        window.clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    };
  }, [isRecording]);

  const recordingLabel = useMemo(() => {
    const minutes = Math.floor(recordingSecondsLeft / 60);
    const seconds = recordingSecondsLeft % 60;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  }, [recordingSecondsLeft]);

  const startCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true,
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'environment'
        } 
      });
      
      streamRef.current = stream;
      setIsCapturing(true);
    } catch (error) {
      console.error('Erreur accès caméra:', error);
      alert('Impossible d\'accéder à la caméra. Vérifiez vos permissions.');
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;
    if (!video.videoWidth || !video.videoHeight) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    
    canvas.toBlob((blob) => {
      if (blob) {
        const imageUrl = URL.createObjectURL(blob);
        setCapturedVideo(null);
        setCapturedImage(imageUrl);
      }
    }, 'image/jpeg', 0.8);
  };

  const startRecording = () => {
    if (!streamRef.current || isRecording || typeof MediaRecorder === 'undefined') return;

    recordedChunksRef.current = [];

    try {
      const mediaRecorder = new MediaRecorder(streamRef.current, {
        mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
          ? 'video/webm;codecs=vp9,opus'
          : 'video/webm',
      });

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        if (recordedChunksRef.current.length === 0) return;
        const blob = new Blob(recordedChunksRef.current, { type: mediaRecorder.mimeType || 'video/webm' });
        const videoUrl = URL.createObjectURL(blob);
        setCapturedImage(null);
        setCapturedVideo(videoUrl);
        setIsRecording(false);
      };

      setRecordingSecondsLeft(60);
      setIsRecording(true);
      mediaRecorder.start();
    } catch (error) {
      console.error('Erreur démarrage enregistrement:', error);
      alert('Impossible de démarrer l\'enregistrement vidéo sur cet appareil.');
    }
  };

  const stopRecording = () => {
    const mediaRecorder = mediaRecorderRef.current;
    if (!mediaRecorder || mediaRecorder.state === 'inactive') {
      setIsRecording(false);
      return;
    }

    mediaRecorder.stop();
  };

  const handleGalleryUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setCapturedImage(file.type.startsWith('image/') ? previewUrl : null);
      setCapturedVideo(file.type.startsWith('video/') ? previewUrl : null);
      setIsCapturing(true);
    }
    event.target.value = '';
  };

  const confirmCapture = () => {
    if (capturedVideo) {
      fetch(capturedVideo)
        .then((response) => response.blob())
        .then((blob) => {
          const file = new File([blob], `video_${Date.now()}.webm`, { type: blob.type || 'video/webm' });
          onCapture(file, false);
          cancelCapture();
        })
        .catch((error) => {
          console.error('Erreur confirmation vidéo:', error);
        });
      return;
    }

    if (!canvasRef.current) return;

    canvasRef.current.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
        onCapture(file, false);
        cancelCapture();
      }
    }, 'image/jpeg', 0.8);
  };

  const openAnnotation = () => {
    setShowAnnotation(true);
  };

  const handleAnnotatedSave = async (annotatedImageUrl: string) => {
    try {
      const response = await fetch(annotatedImageUrl);
      const blob = await response.blob();
      const file = new File([blob], `annotated_photo_${Date.now()}.png`, { type: 'image/png' });
      onCapture(file, true);
      setShowAnnotation(false);
      cancelCapture();
    } catch (error) {
      console.error('Error saving annotated image:', error);
    }
  };

  const cancelCapture = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.onstop = null;
      if (mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCapturing(false);
    setCapturedImage(null);
    setCapturedVideo(null);
    setShowAnnotation(false);
    setIsRecording(false);
    setRecordingSecondsLeft(60);
    mediaRecorderRef.current = null;
    recordedChunksRef.current = [];
  };

  if (showAnnotation && capturedImage) {
    return (
      <Dialog open={true} onOpenChange={() => setShowAnnotation(false)}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full p-0">
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between p-3 border-b">
              <h3 className="text-base font-semibold">Annoter la photo</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAnnotation(false)}
                className="h-8 w-8 p-0"
              >
                <X size={16} />
              </Button>
            </div>
            
            <div className="flex-1 overflow-hidden">
              <ImageEditor
                imageUrl={capturedImage}
                fileName="captured_photo.jpg"
                messageId=""
                isTeacher={false}
                isSaving={false}
                onSaveAnnotations={handleAnnotatedSave}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (isCapturing) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {/* Zone de prévisualisation — occupe tout l'espace */}
        <div className="flex-1 relative overflow-hidden">
          {!capturedVideo && (
            <video
              ref={videoRef}
              className="absolute inset-0 w-full h-full object-cover"
              autoPlay
              playsInline
              muted
            />
          )}
          <canvas ref={canvasRef} className="hidden" />
          
          {capturedImage && (
            <div className="absolute inset-0 bg-black flex items-center justify-center">
              <img 
                src={capturedImage} 
                alt="Captured" 
                className="max-w-full max-h-full object-contain" 
              />
            </div>
          )}

          {capturedVideo && (
            <div className="absolute inset-0 bg-black flex items-center justify-center">
              <video src={capturedVideo} controls className="max-w-full max-h-full object-contain" />
            </div>
          )}

          {!capturedImage && !capturedVideo && (
            <div className="absolute left-1/2 top-4 z-10 -translate-x-1/2 rounded-full bg-black/55 px-3 py-1 text-sm font-semibold text-white backdrop-blur-sm">
              {captureMode === 'video' ? `Vidéo 1 min max · ${recordingLabel}` : 'Photo'}
            </div>
          )}

          {/* Bouton fermer en haut à gauche */}
          <Button
            onClick={cancelCapture}
            variant="ghost"
            size="icon"
            className="absolute top-[max(1rem,env(safe-area-inset-top))] left-3 z-10 bg-black/50 text-white rounded-full h-10 w-10 hover:bg-black/60 backdrop-blur-sm"
          >
            <X size={22} />
          </Button>
        </div>
        
        {/* Barre d'actions en bas — responsive */}
        <div className="bg-black/90 backdrop-blur-sm px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] flex items-center justify-center gap-6">
          {!capturedImage && !capturedVideo ? (
            <>
              <div className="absolute left-4 top-4 flex rounded-full bg-black/35 p-1 backdrop-blur-sm">
                <button
                  type="button"
                  onClick={() => setCaptureMode('photo')}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${captureMode === 'photo' ? 'bg-white text-black' : 'text-white/85'}`}
                >
                  Photo
                </button>
                <button
                  type="button"
                  onClick={() => setCaptureMode('video')}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${captureMode === 'video' ? 'bg-white text-black' : 'text-white/85'}`}
                >
                  Vidéo
                </button>
              </div>
              <Button
                onClick={handleGalleryUpload}
                size="icon"
                className="bg-white/15 text-white hover:bg-white/25 rounded-full h-12 w-12"
              >
                <Upload size={20} />
              </Button>
              {captureMode === 'photo' ? (
                <button
                  onClick={capturePhoto}
                  className="h-16 w-16 rounded-full border-4 border-white bg-transparent flex items-center justify-center hover:bg-white/10 transition-colors"
                >
                  <div className="h-12 w-12 rounded-full bg-white" />
                </button>
              ) : (
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`h-16 w-16 rounded-full border-4 border-white flex items-center justify-center transition-colors ${isRecording ? 'bg-red-600 hover:bg-red-500' : 'bg-transparent hover:bg-white/10'}`}
                >
                  {isRecording ? <Square className="h-6 w-6 fill-white text-white" /> : <Video className="h-8 w-8 text-white" />}
                </button>
              )}
              {/* Espace pour équilibrer le layout */}
              <div className="h-12 w-12" />
            </>
          ) : (
            <>
              {capturedImage ? (
                <Button
                  onClick={openAnnotation}
                  size="icon"
                  className="bg-purple-500/80 text-white hover:bg-purple-600 rounded-full h-12 w-12"
                >
                  <Edit3 size={20} />
                </Button>
              ) : (
                <div className="h-12 w-12" />
              )}
              <Button
                onClick={confirmCapture}
                size="icon"
                className="bg-green-500 text-white hover:bg-green-600 rounded-full h-14 w-14"
              >
                <Check size={24} />
              </Button>
              {/* Espace pour équilibrer */}
              <div className="h-12 w-12" />
            </>
          )}
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>
    );
  }

  return (
    <Button
      onClick={startCapture}
      disabled={disabled}
      variant="actionPurple"
      size="sm"
      className="gap-1.5"
      title="Prendre une photo ou filmer jusqu'à une minute"
    >
      <Camera size={16} />
      <span className="hidden sm:inline">Photo/Vidéo</span>
    </Button>
  );
};

export default EnhancedCameraCapture;
