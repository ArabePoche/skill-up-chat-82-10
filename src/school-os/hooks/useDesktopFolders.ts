/**
 * Hook pour gérer les dossiers du bureau School OS
 * Les dossiers contiennent des fichiers uniquement (pas d'applications)
 */
import { useState, useEffect, useCallback } from 'react';
import { DesktopFolder, FolderFile } from '../types/folder';

const STORAGE_KEY = 'school-os-desktop-folders';

const FOLDER_COLORS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#F97316', // orange
];

export const useDesktopFolders = () => {
  const [folders, setFolders] = useState<DesktopFolder[]>([]);

  // Charger les dossiers depuis le localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Migration: convertir appIds en files et ajouter isPublic si nécessaire
        const migrated = parsed.map((f: any) => ({
          ...f,
          files: f.files || [],
          isPublic: f.isPublic ?? false,
          appIds: undefined,
        }));
        setFolders(migrated);
      } catch (e) {
        console.error('Error loading folders:', e);
      }
    }
  }, []);

  // Sauvegarder les dossiers dans le localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(folders));
  }, [folders]);

  const createFolder = useCallback((name: string, color?: string, isPublic: boolean = false) => {
    const newFolder: DesktopFolder = {
      id: `folder-${Date.now()}`,
      name,
      color: color || FOLDER_COLORS[Math.floor(Math.random() * FOLDER_COLORS.length)],
      files: [],
      isPublic,
      createdAt: new Date().toISOString(),
    };
    setFolders(prev => [...prev, newFolder]);
    return newFolder;
  }, []);

  const toggleFolderVisibility = useCallback((folderId: string) => {
    setFolders(prev => prev.map(f => 
      f.id === folderId ? { ...f, isPublic: !f.isPublic } : f
    ));
  }, []);

  const deleteFolder = useCallback((folderId: string) => {
    setFolders(prev => prev.filter(f => f.id !== folderId));
  }, []);

  const renameFolder = useCallback((folderId: string, newName: string) => {
    setFolders(prev => prev.map(f => 
      f.id === folderId ? { ...f, name: newName } : f
    ));
  }, []);

  const changeFolderColor = useCallback((folderId: string, color: string) => {
    setFolders(prev => prev.map(f => 
      f.id === folderId ? { ...f, color } : f
    ));
  }, []);

  const addFileToFolder = useCallback((folderId: string, file: Omit<FolderFile, 'id' | 'uploadedAt'>) => {
    const newFile: FolderFile = {
      ...file,
      id: `file-${Date.now()}`,
      uploadedAt: new Date().toISOString(),
    };
    setFolders(prev => prev.map(f => 
      f.id === folderId 
        ? { ...f, files: [...f.files, newFile] }
        : f
    ));
    return newFile;
  }, []);

  const removeFileFromFolder = useCallback((folderId: string, fileId: string) => {
    setFolders(prev => prev.map(f => 
      f.id === folderId 
        ? { ...f, files: f.files.filter(file => file.id !== fileId) }
        : f
    ));
  }, []);

  const getFilesCount = useCallback((folderId: string) => {
    const folder = folders.find(f => f.id === folderId);
    return folder?.files.length || 0;
  }, [folders]);

  return {
    folders,
    createFolder,
    deleteFolder,
    renameFolder,
    changeFolderColor,
    toggleFolderVisibility,
    addFileToFolder,
    removeFileFromFolder,
    getFilesCount,
    folderColors: FOLDER_COLORS,
  };
};
