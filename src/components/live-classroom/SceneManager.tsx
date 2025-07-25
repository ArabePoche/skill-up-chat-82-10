// Gestionnaire de scènes pour le studio d'enseignement
import React, { useState } from 'react';
import { Plus, Trash2, Edit, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Scene } from './hooks/useSceneControl';

interface SceneManagerProps {
  scenes: Scene[];
  activeSceneId: string;
  onSceneSelect: (sceneId: string) => void;
  onCreateScene: (name: string) => string;
  onDeleteScene?: (sceneId: string) => void;
}

const SceneManager: React.FC<SceneManagerProps> = ({
  scenes,
  activeSceneId,
  onSceneSelect,
  onCreateScene,
  onDeleteScene
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newSceneName, setNewSceneName] = useState('');

  const handleCreateScene = () => {
    if (newSceneName.trim()) {
      onCreateScene(newSceneName.trim());
      setNewSceneName('');
      setIsCreating(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCreateScene();
    } else if (e.key === 'Escape') {
      setIsCreating(false);
      setNewSceneName('');
    }
  };

  return (
    <div className="space-y-2">
      {/* Liste des scènes */}
      {scenes.map((scene, index) => (
        <div
          key={scene.id}
          className={`
            flex items-center space-x-2 p-2 rounded cursor-pointer transition-colors
            ${scene.id === activeSceneId 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
            }
          `}
          onClick={() => onSceneSelect(scene.id)}
        >
          <div className="w-8 h-6 bg-gray-900 rounded border flex items-center justify-center text-xs">
            {index + 1}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{scene.name}</div>
            <div className="text-xs opacity-75">
              {scene.elements.length} élément{scene.elements.length !== 1 ? 's' : ''}
            </div>
          </div>

          {scene.id === activeSceneId && (
            <Eye size={14} className="text-green-400" />
          )}

          {onDeleteScene && scenes.length > 1 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteScene(scene.id);
              }}
              className="p-1 h-auto text-red-400 hover:text-red-300 hover:bg-red-900/30"
            >
              <Trash2 size={12} />
            </Button>
          )}
        </div>
      ))}

      {/* Création de nouvelle scène */}
      {isCreating ? (
        <div className="flex space-x-2">
          <Input
            value={newSceneName}
            onChange={(e) => setNewSceneName(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Nom de la scène"
            className="flex-1 bg-gray-700 border-gray-600 text-white text-sm"
            autoFocus
          />
          <Button
            size="sm"
            onClick={handleCreateScene}
            disabled={!newSceneName.trim()}
            className="px-2"
          >
            ✓
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setIsCreating(false);
              setNewSceneName('');
            }}
            className="px-2"
          >
            ✕
          </Button>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsCreating(true)}
          className="w-full flex items-center space-x-2 text-gray-300 border-gray-600 hover:bg-gray-700"
        >
          <Plus size={14} />
          <span>Nouvelle scène</span>
        </Button>
      )}

      {/* Aperçu de la scène active */}
      {activeSceneId && (
        <div className="mt-4 p-2 bg-gray-700 rounded">
          <div className="text-xs text-gray-400 mb-1">Aperçu</div>
          <div className="w-full h-16 bg-black rounded relative border">
            {scenes.find(s => s.id === activeSceneId)?.elements.map((element, index) => (
              <div
                key={element.id}
                className="absolute bg-blue-500 opacity-50 border border-blue-300"
                style={{
                  left: `${(element.position.x / 800) * 100}%`,
                  top: `${(element.position.y / 600) * 100}%`,
                  width: `${(element.size.width / 800) * 100}%`,
                  height: `${(element.size.height / 600) * 100}%`,
                  minWidth: '4px',
                  minHeight: '4px'
                }}
                title={`${element.type} - ${element.visible ? 'Visible' : 'Masqué'}`}
              />
            ))}
            
            {scenes.find(s => s.id === activeSceneId)?.elements.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-xs">
                Vide
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SceneManager;