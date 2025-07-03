import React, { useState, useRef } from 'react';
import { Camera, X, Check, Upload, Edit3 } from 'lucide-react';
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
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [showAnnotation, setShowAnnotation] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'environment'
        } 
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
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

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    
    canvas.toBlob((blob) => {
      if (blob) {
        const imageUrl = URL.createObjectURL(blob);
        setCapturedImage(imageUrl);
      }
    }, 'image/jpeg', 0.8);
  };

  const handleGalleryUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setCapturedImage(imageUrl);
      setIsCapturing(true);
    }
    event.target.value = '';
  };

  const confirmCapture = () => {
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
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCapturing(false);
    setCapturedImage(null);
    setShowAnnotation(false);
  };

  if (showAnnotation && capturedImage) {
    return (
      <Dialog open={true} onOpenChange={() => setShowAnnotation(false)}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full p-0">
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Annoter la photo</h3>
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
      <div className="fixed inset-0 bg-black z-50 flex flex-col">
        <div className="flex-1 relative">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            autoPlay
            playsInline
            muted
          />
          <canvas ref={canvasRef} className="hidden" />
          
          {capturedImage && (
            <div className="absolute inset-0 bg-black flex items-center justify-center">
              <img src={capturedImage} alt="Captured" className="max-w-full max-h-full object-contain" />
            </div>
          )}
        </div>
        
        <div className="bg-black p-4 flex justify-center space-x-4">
          <Button
            onClick={cancelCapture}
            variant="outline"
            size="lg"
            className="bg-red-500 text-white border-red-500 hover:bg-red-600"
          >
            <X size={20} />
          </Button>
          
          {!capturedImage ? (
            <>
              <Button
                onClick={handleGalleryUpload}
                size="lg"
                className="bg-blue-500 text-white hover:bg-blue-600"
              >
                <Upload size={20} />
              </Button>
              <Button
                onClick={capturePhoto}
                size="lg"
                className="bg-white text-black hover:bg-gray-200 w-16 h-16 rounded-full"
              >
                <Camera size={24} />
              </Button>
            </>
          ) : (
            <div className="flex gap-4">
              <Button
                onClick={openAnnotation}
                size="lg"
                className="bg-purple-500 text-white hover:bg-purple-600"
              >
                <Edit3 size={20} />
              </Button>
              <Button
                onClick={confirmCapture}
                size="lg"
                className="bg-green-500 text-white hover:bg-green-600"
              >
                <Check size={20} />
              </Button>
            </div>
          )}
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
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
      variant="outline"
      size="sm"
      className="p-2"
      title="Prendre une photo ou importer depuis la galerie"
    >
      <Camera size={16} />
    </Button>
  );
};

export default EnhancedCameraCapture;
