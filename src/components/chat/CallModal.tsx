
import React, { useState, useEffect } from 'react';
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, X } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

interface CallModalProps {
  isOpen: boolean;
  onClose: () => void;
  callType: 'audio' | 'video';
  contactName: string;
  contactAvatar?: string;
  isIncoming?: boolean;
  onAccept?: () => void;
  onDecline?: () => void;
}

const CallModal: React.FC<CallModalProps> = ({
  isOpen,
  onClose,
  callType,
  contactName,
  contactAvatar,
  isIncoming = false,
  onAccept,
  onDecline
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(callType === 'video');

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isConnected) {
      interval = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isConnected]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAccept = () => {
    setIsConnected(true);
    onAccept?.();
  };

  const handleDecline = () => {
    onDecline?.();
    onClose();
  };

  const handleEndCall = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto p-0 bg-gradient-to-b from-gray-900 to-gray-800 text-white border-none">
        <div className="relative h-96 flex flex-col">
          {/* Header */}
          <div className="flex justify-between items-center p-4">
            <div className="text-sm opacity-75">
              {isIncoming ? 'Appel entrant' : isConnected ? formatDuration(duration) : 'Connexion...'}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-white hover:bg-white/10"
            >
              <X size={16} />
            </Button>
          </div>

          {/* Contact Info */}
          <div className="flex-1 flex flex-col items-center justify-center space-y-4">
            <Avatar className="w-24 h-24">
              <AvatarImage src={contactAvatar} alt={contactName} />
              <AvatarFallback className="bg-gray-600 text-white text-2xl">
                {contactName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div className="text-center">
              <h3 className="text-xl font-semibold">{contactName}</h3>
              <p className="text-sm opacity-75">
                {callType === 'video' ? 'Appel vidéo' : 'Appel audio'}
              </p>
            </div>

            {/* Video placeholder */}
            {callType === 'video' && isConnected && isVideoEnabled && (
              <div className="w-full h-32 bg-gray-700 rounded-lg flex items-center justify-center">
                <span className="text-gray-400">Vidéo en cours...</span>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="p-6">
            {isIncoming && !isConnected ? (
              <div className="flex justify-center space-x-8">
                <Button
                  onClick={handleDecline}
                  size="lg"
                  className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 border-none"
                >
                  <PhoneOff size={24} />
                </Button>
                <Button
                  onClick={handleAccept}
                  size="lg"
                  className="w-14 h-14 rounded-full bg-green-500 hover:bg-green-600 border-none"
                >
                  <Phone size={24} />
                </Button>
              </div>
            ) : (
              <div className="flex justify-center space-x-4">
                <Button
                  onClick={() => setIsMuted(!isMuted)}
                  size="lg"
                  variant="outline"
                  className={`w-12 h-12 rounded-full border-white/20 ${
                    isMuted ? 'bg-red-500 hover:bg-red-600' : 'bg-white/10 hover:bg-white/20'
                  }`}
                >
                  {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
                </Button>
                
                {callType === 'video' && (
                  <Button
                    onClick={() => setIsVideoEnabled(!isVideoEnabled)}
                    size="lg"
                    variant="outline"
                    className={`w-12 h-12 rounded-full border-white/20 ${
                      !isVideoEnabled ? 'bg-red-500 hover:bg-red-600' : 'bg-white/10 hover:bg-white/20'
                    }`}
                  >
                    {isVideoEnabled ? <Video size={20} /> : <VideoOff size={20} />}
                  </Button>
                )}
                
                <Button
                  onClick={handleEndCall}
                  size="lg"
                  className="w-12 h-12 rounded-full bg-red-500 hover:bg-red-600 border-none"
                >
                  <PhoneOff size={20} />
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CallModal;
