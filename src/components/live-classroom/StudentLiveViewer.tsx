// Composant de visualisation du cours en direct pour les élèves
import React, { useState, useEffect } from 'react';
import { Video, Mic, MicOff, VideoOff, MessageSquare, Hand, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';

interface StudentLiveViewerProps {
  sessionId: string;
  teacherName: string;
  formationTitle: string;
  lessonTitle: string;
  onLeave: () => void;
}

const StudentLiveViewer: React.FC<StudentLiveViewerProps> = ({
  sessionId,
  teacherName,
  formationTitle,
  lessonTitle,
  onLeave
}) => {
  const { user } = useAuth();
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [micEnabled, setMicEnabled] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [viewerCount, setViewerCount] = useState(1);

  useEffect(() => {
    // Simuler le nombre de viewers
    const interval = setInterval(() => {
      setViewerCount(prev => prev + Math.floor(Math.random() * 3) - 1);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const toggleHand = () => {
    setIsHandRaised(!isHandRaised);
    // Ici on notifierait le professeur
  };

  return (
    <div className="h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 p-4 flex items-center justify-between border-b border-gray-700">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium">EN DIRECT</span>
          </div>
          <div className="w-px h-4 bg-gray-600" />
          <div>
            <h1 className="font-semibold">{lessonTitle}</h1>
            <p className="text-sm text-gray-400">{teacherName} • {formationTitle}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <span className="text-sm">{viewerCount} spectateurs</span>
          </div>
          <Button variant="outline" size="sm" onClick={onLeave}>
            Quitter
          </Button>
        </div>
      </div>

      {/* Zone principale */}
      <div className="flex-1 flex">
        {/* Vidéo principale */}
        <div className="flex-1 bg-black flex items-center justify-center">
          <div className="text-center">
            <div className="w-32 h-32 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <Video className="w-16 h-16 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">{teacherName}</h3>
            <p className="text-gray-400">Cours en direct</p>
          </div>
        </div>

        {/* Panneau latéral */}
        <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
          {/* Contrôles rapides */}
          <div className="p-4 border-b border-gray-700">
            <h3 className="text-sm font-semibold mb-3">Contrôles</h3>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={isHandRaised ? "default" : "outline"}
                size="sm"
                onClick={toggleHand}
                className="flex items-center space-x-2"
              >
                <Hand size={16} />
                <span>Lever la main</span>
              </Button>
              
              <Button
                variant={micEnabled ? "default" : "outline"}
                size="sm"
                onClick={() => setMicEnabled(!micEnabled)}
                className="flex items-center space-x-2"
              >
                {micEnabled ? <Mic size={16} /> : <MicOff size={16} />}
                <span>Micro</span>
              </Button>
            </div>
          </div>

          {/* Chat */}
          <div className="flex-1 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">Chat</h3>
              <MessageSquare size={16} className="text-gray-400" />
            </div>
            <div className="bg-gray-700 rounded p-3 h-64 overflow-y-auto">
              <div className="text-sm text-gray-400 text-center">
                Le chat sera disponible bientôt
              </div>
            </div>
          </div>

          {/* Informations */}
          <div className="p-4 border-t border-gray-700">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Session ID:</span>
                <span className="font-mono text-xs">{sessionId.slice(0, 8)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Qualité:</span>
                <Badge variant="secondary" className="text-xs">HD</Badge>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentLiveViewer;