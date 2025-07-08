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
    <div className="h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 p-4 flex items-center justify-between border-b border-gray-700">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-bold">Studio d'Enseignement</h1>
          <span className="text-sm text-gray-300">{lesson.title}</span>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant={isStreaming ? "destructive" : "default"}
            size="sm"
            onClick={isStreaming ? handleStopStream : handleStartStream}
            className="flex items-center space-x-2 bg-blue-500 hover:bg-blue-600 text-white"
          >
            {isStreaming ? <Square size={16} /> : <Play size={16} />}
            <span>{isStreaming ? 'Arrêter' : 'Commencer'} le Direct</span>
          </Button>
          
          <Button variant="outline" size="sm" onClick={() => setShowSettings(!showSettings)} className="bg-blue-500 hover:bg-blue-600 text-white">
            <Settings size={16} />
          </Button>
          
          <Button variant="outline" size="sm" onClick={onClose} className="bg-blue-500 hover:bg-blue-600 text-white">
            Fermer
          </Button>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Panneau gauche - Contrôles */}
        <div className="w-80 bg-gray-800 border-r border-gray-700 flex flex-col">
          {/* Contrôles audio/vidéo */}
          <div className="p-4 border-b border-gray-700">
            <h3 className="text-sm font-semibold mb-3">Contrôles Média</h3>
            <div className="flex space-x-2">
              <Button
                variant={cameraEnabled ? "default" : "outline"}
                size="sm"
                onClick={toggleCamera}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
              >
                {cameraEnabled ? <Camera size={16} /> : <CameraOff size={16} />}
                Caméra
              </Button>
              
              <Button
                variant={micEnabled ? "default" : "outline"}
                size="sm"
                onClick={toggleMic}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
              >
                {micEnabled ? <Mic size={16} /> : <MicOff size={16} />}
                Micro
              </Button>
              
              <Button variant="outline" size="sm" onClick={startScreenShare} className="bg-blue-500 hover:bg-blue-600 text-white">
                <Monitor size={16} />
              </Button>
            </div>
          </div>

          {/* Gestionnaire de scènes */}
          <div className="p-4 border-b border-gray-700">
            <h3 className="text-sm font-semibold mb-3">Scènes</h3>
            <SceneManager
              scenes={scenes}
              activeSceneId={activeScene?.id || ''}
              onSceneSelect={switchToScene}
              onCreateScene={createScene}
            />
          </div>

          {/* Éléments à ajouter */}
          <div className="p-4 border-b border-gray-700">
            <h3 className="text-sm font-semibold mb-3">Ajouter un élément</h3>
            <div className="grid grid-cols-2 gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleAddElement('camera')}
                className="text-xs bg-blue-500 hover:bg-blue-600 text-white"
              >
                <Camera size={14} className="mr-1" />
                Caméra
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleAddElement('whiteboard')}
                className="text-xs bg-blue-500 hover:bg-blue-600 text-white"
              >
                <Plus size={14} className="mr-1" />
                Tableau
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleAddElement('notes')}
                className="text-xs bg-blue-500 hover:bg-blue-600 text-white"
              >
                <Plus size={14} className="mr-1" />
                Notes
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleAddElement('document')}
                className="text-xs bg-blue-500 hover:bg-blue-600 text-white"
              >
                <Plus size={14} className="mr-1" />
                Document
              </Button>
            </div>
          </div>

          {/* Soumissions des élèves */}
          <div className="flex-1 p-4">
            <h3 className="text-sm font-semibold mb-3">
              Soumissions des élèves ({pendingSubmissions.length})
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