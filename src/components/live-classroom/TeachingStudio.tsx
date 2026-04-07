// Interface de studio d'enseignement inspirée d'OBS
import React, { useState } from 'react';
import { Settings, Play, Square, Camera, Mic, MicOff, CameraOff, Monitor, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useSceneControl } from './hooks/useSceneControl';
import { useLiveMedia } from './hooks/useLiveMedia';
import { useSubmissionQueue } from './hooks/useSubmissionQueue';
import { useLiveSession } from './hooks/useLiveSession';
import SceneManager from './SceneManager';
import Whiteboard from './Whiteboard';
import NotePanel from './NotePanel';
import MediaDropzone from './MediaDropzone';
import DraggableElement from './DraggableElement';

interface TeachingStudioProps {
  formationId: string;
  lessonId: string;
  lesson: {
    id: string;
    title: string;
  };
  onClose: () => void;
}

const TeachingStudio: React.FC<TeachingStudioProps> = ({
  formationId,
  lessonId,
  lesson,
  onClose
}) => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  
  const { 
    scenes, 
    activeScene, 
    switchToScene, 
    createScene,
    addElementToScene,
    updateElement,
    removeElement
  } = useSceneControl();
  
  const { 
    cameraEnabled, 
    micEnabled, 
    videoRef, 
    toggleCamera, 
    toggleMic,
    startScreenShare 
  } = useLiveMedia();
  
  const { 
    pendingSubmissions, 
    acceptSubmission, 
    rejectSubmission 
  } = useSubmissionQueue(formationId, lessonId);

  const { startLiveSession, endLiveSession } = useLiveSession(formationId);

  const handleStartStream = async () => {
    setIsStreaming(true);
    const success = await startLiveSession(lessonId);
    if (!success) {
      setIsStreaming(false);
    }
  };

  const handleStopStream = async () => {
    setIsStreaming(false);
    await endLiveSession();
  };

  const handleAddElement = (type: 'camera' | 'whiteboard' | 'notes' | 'document') => {
    if (activeScene) {
      addElementToScene(activeScene.id, {
        type,
        position: { x: 100, y: 100 },
        size: { width: 300, height: 200 },
        visible: true,
      });
    }
  };

  return (
    <div className="h-[100dvh] bg-gray-900 text-white flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-gray-800 px-3 py-2 sm:p-4 flex items-center justify-between border-b border-gray-700 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <h1 className="text-sm sm:text-xl font-bold whitespace-nowrap">Studio</h1>
          <span className="text-xs sm:text-sm text-gray-300 truncate">{lesson.title}</span>
        </div>
        
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <Button
            variant={isStreaming ? "destructive" : "default"}
            size="sm"
            onClick={isStreaming ? handleStopStream : handleStartStream}
            className="flex items-center gap-1 bg-blue-500 hover:bg-blue-600 text-white text-xs sm:text-sm px-2 sm:px-3"
          >
            {isStreaming ? <Square size={14} /> : <Play size={14} />}
            <span className="hidden sm:inline">{isStreaming ? 'Arrêter' : 'Commencer'} le Direct</span>
            <span className="sm:hidden">{isStreaming ? 'Stop' : 'Live'}</span>
          </Button>
          
          <Button variant="outline" size="icon" onClick={() => setShowSettings(!showSettings)} className="bg-blue-500 hover:bg-blue-600 text-white h-8 w-8">
            <Settings size={14} />
          </Button>
          
          <Button variant="outline" size="sm" onClick={onClose} className="bg-blue-500 hover:bg-blue-600 text-white text-xs px-2 sm:px-3">
            Fermer
          </Button>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row min-h-0">
        {/* Panneau gauche - Contrôles (horizontal scroll on mobile) */}
        <div className="md:w-72 lg:w-80 bg-gray-800 border-b md:border-b-0 md:border-r border-gray-700 flex flex-row md:flex-col overflow-x-auto md:overflow-x-hidden md:overflow-y-auto shrink-0">
          {/* Contrôles audio/vidéo */}
          <div className="p-3 sm:p-4 border-r md:border-r-0 md:border-b border-gray-700 min-w-[200px] md:min-w-0">
            <h3 className="text-xs sm:text-sm font-semibold mb-2 sm:mb-3">Contrôles Média</h3>
            <div className="flex gap-1 sm:gap-2">
              <Button
                variant={cameraEnabled ? "default" : "outline"}
                size="sm"
                onClick={toggleCamera}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white text-xs px-1 sm:px-2"
              >
                {cameraEnabled ? <Camera size={14} /> : <CameraOff size={14} />}
                <span className="hidden sm:inline ml-1">Caméra</span>
              </Button>
              
              <Button
                variant={micEnabled ? "default" : "outline"}
                size="sm"
                onClick={toggleMic}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white text-xs px-1 sm:px-2"
              >
                {micEnabled ? <Mic size={14} /> : <MicOff size={14} />}
                <span className="hidden sm:inline ml-1">Micro</span>
              </Button>
              
              <Button variant="outline" size="icon" onClick={startScreenShare} className="bg-blue-500 hover:bg-blue-600 text-white h-8 w-8 shrink-0">
                <Monitor size={14} />
              </Button>
            </div>
          </div>

          {/* Gestionnaire de scènes */}
          <div className="p-3 sm:p-4 border-r md:border-r-0 md:border-b border-gray-700 min-w-[200px] md:min-w-0">
            <h3 className="text-xs sm:text-sm font-semibold mb-2 sm:mb-3">Scènes</h3>
            <SceneManager
              scenes={scenes}
              activeSceneId={activeScene?.id || ''}
              onSceneSelect={switchToScene}
              onCreateScene={createScene}
            />
          </div>

          {/* Éléments à ajouter */}
          <div className="p-3 sm:p-4 border-r md:border-r-0 md:border-b border-gray-700 min-w-[200px] md:min-w-0">
            <h3 className="text-xs sm:text-sm font-semibold mb-2 sm:mb-3">Ajouter</h3>
            <div className="grid grid-cols-2 gap-1 sm:gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleAddElement('camera')}
                className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-1 sm:px-2"
              >
                <Camera size={12} className="mr-1" />
                Caméra
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleAddElement('whiteboard')}
                className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-1 sm:px-2"
              >
                <Plus size={12} className="mr-1" />
                Tableau
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleAddElement('notes')}
                className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-1 sm:px-2"
              >
                <Plus size={12} className="mr-1" />
                Notes
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleAddElement('document')}
                className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-1 sm:px-2"
              >
                <Plus size={12} className="mr-1" />
                Document
              </Button>
            </div>
          </div>

          {/* Soumissions des élèves */}
          <div className="p-3 sm:p-4 min-w-[200px] md:min-w-0 md:flex-1">
            <h3 className="text-xs sm:text-sm font-semibold mb-2 sm:mb-3">
              Soumissions ({pendingSubmissions.length})
            </h3>
            <MediaDropzone
              submissions={pendingSubmissions}
              onAccept={acceptSubmission}
              onReject={rejectSubmission}
            />
          </div>
        </div>

        {/* Zone principale - Prévisualisation */}
        <div className="flex-1 flex flex-col">
          {/* Prévisualisation de la scène active */}
          <div className="flex-1 bg-black relative overflow-hidden">
            <div className="absolute inset-4 border-2 border-gray-600 rounded">
              {isStreaming && (
                <div className="absolute top-2 right-2 bg-red-600 text-white px-2 py-1 rounded text-xs font-bold">
                  🔴 EN DIRECT
                </div>
              )}
              
              {/* Rendu des éléments de la scène active */}
              {activeScene?.elements.map(element => (
                <DraggableElement
                  key={element.id}
                  element={element}
                  isSelected={selectedElementId === element.id}
                  onSelect={() => setSelectedElementId(element.id)}
                  onUpdate={(updates) => updateElement(activeScene.id, element.id, updates)}
                  onRemove={() => removeElement(activeScene.id, element.id)}
                >
                  {element.type === 'camera' && cameraEnabled && (
                    <video
                      ref={videoRef}
                      autoPlay
                      muted
                      className="w-full h-full object-cover rounded"
                    />
                  )}
                  
                  {element.type === 'whiteboard' && (
                    <Whiteboard />
                  )}
                  
                  {element.type === 'notes' && (
                    <NotePanel />
                  )}
                  
                  {element.type === 'document' && (
                    <div className="w-full h-full bg-white text-black p-2 rounded">
                      <div className="text-sm">Document partagé</div>
                    </div>
                  )}
                </DraggableElement>
              ))}
              
              {/* Message si aucun élément */}
              {(!activeScene?.elements || activeScene.elements.length === 0) && (
                <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <div className="text-4xl mb-4">🎬</div>
                    <div>Ajoutez des éléments à votre scène</div>
                    <div className="text-sm mt-2">Cliquez sur les boutons à gauche pour ajouter des éléments</div>
                  </div>
                </div>
              )}
              
              {/* Clic pour désélectionner */}
              <div 
                className="absolute inset-0 -z-10"
                onClick={() => setSelectedElementId(null)}
              />
            </div>
          </div>

          {/* Barre de statut */}
          <div className="bg-gray-800 p-2 border-t border-gray-700">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-4">
                <span>Scène: {activeScene?.name || 'Aucune'}</span>
                <span>Résolution: 1920x1080</span>
                <span>FPS: 30</span>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className={`w-2 h-2 rounded-full ${isStreaming ? 'bg-red-500' : 'bg-gray-500'}`}></div>
                <span>{isStreaming ? 'Streaming actif' : 'Hors ligne'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeachingStudio;