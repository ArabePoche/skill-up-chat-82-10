import React, { useState, useRef, useEffect } from 'react';
import { Camera, Square, Check, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VideoRecorderComponentProps {
    onRecordComplete: (file: File) => void;
    onCancel: () => void;
}

const VideoRecorderComponent: React.FC<VideoRecorderComponentProps> = ({ onRecordComplete, onCancel }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<BlobPart[]>([]);

    // Démarrer la caméra au chargement
    useEffect(() => {
        startCamera();
        return () => {
            stopCamera();
        };
    }, []);

    const startCamera = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
                audio: true
            });
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
                videoRef.current.muted = true; // Mute local playback to avoid audio feedback loop
            }
        } catch (error) {
            console.error('Error accessing media devices:', error);
            alert('Impossible d\'accéder à la caméra ou au microphone.');
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        setStream(null);
    };

    const startRecording = () => {
        if (!stream) return;

        chunksRef.current = [];

        // Essayer de trouver un format supporté
        let options: MediaRecorderOptions = { mimeType: 'video/webm;codecs=vp8,opus' };
        if (!MediaRecorder.isTypeSupported(options.mimeType || '')) {
            options = { mimeType: 'video/webm' };
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                options = { mimeType: 'video/mp4' };
                if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                    options = { mimeType: '' }; // Fallback to browser default
                }
            }
        }

        const mediaRecorder = new MediaRecorder(stream, options.mimeType ? options : undefined);

        mediaRecorder.ondataavailable = (event) => {
            if (event.data && event.data.size > 0) {
                chunksRef.current.push(event.data);
            }
        };

        mediaRecorder.onstop = () => {
            // Créer un blob final à partir des différents morceaux
            const type = chunksRef.current.length > 0 ? (chunksRef.current[0] as Blob).type : 'video/mp4';
            const blob = new Blob(chunksRef.current, { type });
            setRecordedBlob(blob);

            // Assigner la vidéo enregistrée à l'élément vidéo pour l'aperçu
            if (videoRef.current) {
                videoRef.current.srcObject = null;
                videoRef.current.src = URL.createObjectURL(blob);
                videoRef.current.controls = true;
                videoRef.current.muted = false; // Activer le son pour l'aperçu
            }

            // Eteindre la caméra physique
            stopCamera();
        };

        mediaRecorderRef.current = mediaRecorder;
        mediaRecorder.start(100); // collecter les morceaux toutes les 100ms
        setIsRecording(true);
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const retakeVideo = () => {
        setRecordedBlob(null);
        if (videoRef.current && videoRef.current.src) {
            URL.revokeObjectURL(videoRef.current.src);
            videoRef.current.src = '';
            videoRef.current.controls = false;
            videoRef.current.muted = true;
        }
        startCamera();
    };

    const confirmVideo = () => {
        if (recordedBlob) {
            // Nettoyer le type mime en enlevant les spécifications de codecs (qui peuvent bugger certains lecteurs)
            const cleanMimeType = recordedBlob.type.split(';')[0] || 'video/mp4';

            let ext = 'mp4';
            if (cleanMimeType.includes('webm')) ext = 'webm';
            else if (cleanMimeType.includes('matroska')) ext = 'mkv';
            else if (cleanMimeType.includes('quicktime')) ext = 'mov';

            const file = new File([recordedBlob], `video_${Date.now()}.${ext}`, { type: cleanMimeType });
            onRecordComplete(file);
        }
    };

    const handleCancel = () => {
        stopCamera();
        onCancel();
    };

    return (
        <div className="flex flex-col space-y-4 rounded-lg overflow-hidden bg-gray-900 border border-gray-800 p-2 mt-4">
            <div className="relative aspect-video bg-black rounded-md overflow-hidden flex items-center justify-center">
                {!stream && !recordedBlob && <div className="text-white text-sm">Chargement de la caméra...</div>}

                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-contain"
                />

                {/* Témoin d'enregistrement */}
                {isRecording && (
                    <div className="absolute top-4 right-4 flex items-center space-x-2 bg-black/50 px-3 py-1.5 rounded-full pr-4">
                        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                        <span className="text-white text-sm font-medium">Enregistrement</span>
                    </div>
                )}
            </div>

            {/* Contrôles d'enregistrement */}
            <div className="flex items-center justify-center gap-4 py-2">
                {!recordedBlob ? (
                    <>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleCancel}
                            className="bg-transparent border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white"
                        >
                            Annuler
                        </Button>

                        {!isRecording ? (
                            <Button
                                type="button"
                                onClick={startRecording}
                                disabled={!stream}
                                className="bg-red-600 hover:bg-red-700 text-white rounded-full w-14 h-14 p-0 flex items-center justify-center shadow-lg transition-transform hover:scale-105"
                                title="Commencer l'enregistrement"
                            >
                                <Camera size={24} />
                            </Button>
                        ) : (
                            <Button
                                type="button"
                                onClick={stopRecording}
                                className="bg-gray-200 hover:bg-white text-black rounded-full w-14 h-14 p-0 flex items-center justify-center shadow-lg transition-transform hover:scale-105 animate-pulse"
                                title="Arrêter l'enregistrement"
                            >
                                <Square size={20} className="fill-black" />
                            </Button>
                        )}
                    </>
                ) : (
                    <>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={retakeVideo}
                            className="bg-transparent border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white"
                        >
                            <RotateCcw size={18} className="mr-2" />
                            Recommencer
                        </Button>
                        <Button
                            type="button"
                            onClick={confirmVideo}
                            className="bg-edu-primary hover:bg-edu-primary/90 text-white px-6"
                        >
                            <Check size={18} className="mr-2" />
                            Utiliser cette vidéo
                        </Button>
                    </>
                )}
            </div>
        </div>
    );
};

export default VideoRecorderComponent;
