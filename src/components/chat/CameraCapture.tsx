
import React, { useState, useRef } from 'react';
import { Camera, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  disabled?: boolean;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, disabled = false }) => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'environment' // Caméra arrière par défaut
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

    // Ajuster la taille du canvas à la vidéo
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Capturer l'image
    ctx.drawImage(video, 0, 0);
    
    // Convertir en blob
    canvas.toBlob((blob) => {
      if (blob) {
        const imageUrl = URL.createObjectURL(blob);
        setCapturedImage(imageUrl);
      }
    }, 'image/jpeg', 0.8);
  };

  const confirmCapture = () => {
    if (!canvasRef.current) return;

    canvasRef.current.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
        onCapture(file);
        cancelCapture();
      }
    }, 'image/jpeg', 0.8);
  };

  const cancelCapture = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCapturing(false);
    setCapturedImage(null);
  };

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
            <Button
              onClick={capturePhoto}
              size="lg"
              className="bg-white text-black hover:bg-gray-200 w-16 h-16 rounded-full"
            >
              <Camera size={24} />
            </Button>
          ) : (
            <Button
              onClick={confirmCapture}
              size="lg"
              className="bg-green-500 text-white hover:bg-green-600"
            >
              <Check size={20} />
            </Button>
          )}
        </div>
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
      title="Prendre une photo"
    >
      <Camera size={16} />
    </Button>
  );
};

export default CameraCapture;
