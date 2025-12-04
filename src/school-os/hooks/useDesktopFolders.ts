/**
 * Hook pour gérer les dossiers du bureau School OS
 */
import { useState, useEffect, useCallback } from 'react';
import { DesktopFolder } from '../types/folder';

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
        setFolders(JSON.parse(saved));
      } catch (e) {
        console.error('Error loading folders:', e);
      }
    }
  }, []);

  // Sauvegarder les dossiers dans le localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(folders));
  }, [folders]);

  const createFolder = useCallback((name: string, color?: string) => {
    const newFolder: DesktopFolder = {
      id: `folder-${Date.now()}`,
      name,
      color: color || FOLDER_COLORS[Math.floor(Math.random() * FOLDER_COLORS.length)],
      appIds: [],
      createdAt: new Date().toISOString(),
    };
    setFolders(prev => [...prev, newFolder]);
    return newFolder;
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

  const addAppToFolder = useCallback((folderId: string, appId: string) => {
    setFolders(prev => prev.map(f => 
      f.id === folderId 
        ? { ...f, appIds: [...new Set([...f.appIds, appId])] }
        : f
    ));
  }, []);

  const removeAppFromFolder = useCallback((folderId: string, appId: string) => {
    setFolders(prev => prev.map(f => 
      f.id === folderId 
        ? { ...f, appIds: f.appIds.filter(id => id !== appId) }
        : f
    ));
  }, []);

  const getAppsInFolders = useCallback(() => {
    return folders.flatMap(f => f.appIds);
  }, [folders]);

  return {
    folders,
    createFolder,
    deleteFolder,
    renameFolder,
    changeFolderColor,
    addAppToFolder,
    removeAppFromFolder,
    getAppsInFolders,
    folderColors: FOLDER_COLORS,
  };
};
