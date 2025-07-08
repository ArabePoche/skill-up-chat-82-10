// Hook pour la gestion des scènes du studio d'enseignement
import { useState, useCallback } from 'react';

export interface Scene {
  id: string;
  name: string;
  elements: SceneElement[];
  isActive: boolean;
  thumbnail?: string;
}

export interface SceneElement {
  id: string;
  type: 'camera' | 'whiteboard' | 'notes' | 'document' | 'image';
  position: { x: number; y: number };
  size: { width: number; height: number };
  visible: boolean;
  content?: any;
}

export const useSceneControl = () => {
  const [scenes, setScenes] = useState<Scene[]>([
    {
      id: 'scene-1',
      name: 'Scène principale',
      elements: [],
      isActive: true,
    },
  ]);

  const [activeSceneId, setActiveSceneId] = useState('scene-1');

  const createScene = useCallback((name: string) => {
    const newScene: Scene = {
      id: `scene-${Date.now()}`,
      name,
      elements: [],
      isActive: false,
    };

    setScenes(prev => [...prev, newScene]);
    return newScene.id;
  }, []);

  const deleteScene = useCallback((sceneId: string) => {
    setScenes(prev => prev.filter(s => s.id !== sceneId));
    
    // Si la scène active est supprimée, basculer vers la première scène
    if (activeSceneId === sceneId) {
      setActiveSceneId(scenes[0]?.id || '');
    }
  }, [activeSceneId, scenes]);

  const switchToScene = useCallback((sceneId: string) => {
    setScenes(prev =>
      prev.map(scene => ({
        ...scene,
        isActive: scene.id === sceneId,
      }))
    );
    setActiveSceneId(sceneId);
  }, []);

  const addElementToScene = useCallback((sceneId: string, element: Omit<SceneElement, 'id'>) => {
    const newElement: SceneElement = {
      ...element,
      id: `element-${Date.now()}`,
    };

    setScenes(prev =>
      prev.map(scene =>
        scene.id === sceneId
          ? { ...scene, elements: [...scene.elements, newElement] }
          : scene
      )
    );

    return newElement.id;
  }, []);

  const updateElement = useCallback((sceneId: string, elementId: string, updates: Partial<SceneElement>) => {
    setScenes(prev =>
      prev.map(scene =>
        scene.id === sceneId
          ? {
              ...scene,
              elements: scene.elements.map(el =>
                el.id === elementId ? { ...el, ...updates } : el
              ),
            }
          : scene
      )
    );
  }, []);

  const removeElement = useCallback((sceneId: string, elementId: string) => {
    setScenes(prev =>
      prev.map(scene =>
        scene.id === sceneId
          ? { ...scene, elements: scene.elements.filter(el => el.id !== elementId) }
          : scene
      )
    );
  }, []);

  const activeScene = scenes.find(s => s.id === activeSceneId);

  return {
    scenes,
    activeScene,
    activeSceneId,
    createScene,
    deleteScene,
    switchToScene,
    addElementToScene,
    updateElement,
    removeElement,
  };
};