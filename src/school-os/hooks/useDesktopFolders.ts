/**
 * Hook pour gérer les dossiers du bureau School OS avec persistance Supabase
 * Supporte une hiérarchie illimitée de sous-dossiers
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { DesktopFolder, FolderFile } from '../types/folder';

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
  const { user } = useAuth();
  const [folders, setFolders] = useState<DesktopFolder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Charger les dossiers depuis Supabase
  useEffect(() => {
    const loadFolders = async () => {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }

      try {
        // Charger les dossiers
        const { data: foldersData, error: foldersError } = await supabase
          .from('desktop_folders')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true });

        if (foldersError) throw foldersError;

        // Charger les fichiers pour tous les dossiers
        const folderIds = foldersData?.map(f => f.id) || [];
        let filesData: any[] = [];
        
        if (folderIds.length > 0) {
          const { data, error: filesError } = await supabase
            .from('desktop_folder_files')
            .select('*')
            .in('folder_id', folderIds);
          
          if (!filesError) filesData = data || [];
        }

        // Mapper les données Supabase vers le format local
        const mappedFolders: DesktopFolder[] = (foldersData || []).map(f => ({
          id: f.id,
          name: f.name,
          color: f.color,
          isPublic: f.is_public,
          parentId: f.parent_id || undefined,
          createdAt: f.created_at,
          files: filesData
            .filter(file => file.folder_id === f.id)
            .map(file => ({
              id: file.id,
              name: file.name,
              type: file.type,
              url: file.url,
              size: file.size,
              uploadedAt: file.uploaded_at,
            })),
        }));

        setFolders(mappedFolders);
      } catch (e) {
        console.error('Error loading folders:', e);
      } finally {
        setIsLoading(false);
      }
    };

    loadFolders();
  }, [user?.id]);

  const createFolder = useCallback(async (name: string, color?: string, isPublic: boolean = false, parentId?: string) => {
    if (!user?.id) return null;

    const folderColor = color || FOLDER_COLORS[Math.floor(Math.random() * FOLDER_COLORS.length)];

    try {
      const { data, error } = await supabase
        .from('desktop_folders')
        .insert({
          user_id: user.id,
          name,
          color: folderColor,
          is_public: isPublic,
          parent_id: parentId || null,
          position_x: 0,
          position_y: 0,
        })
        .select()
        .single();

      if (error) throw error;

      const newFolder: DesktopFolder = {
        id: data.id,
        name: data.name,
        color: data.color,
        isPublic: data.is_public,
        parentId: data.parent_id || undefined,
        createdAt: data.created_at,
        files: [],
      };

      setFolders(prev => [...prev, newFolder]);
      return newFolder;
    } catch (e) {
      console.error('Error creating folder:', e);
      return null;
    }
  }, [user?.id]);

  const toggleFolderVisibility = useCallback(async (folderId: string) => {
    const folder = folders.find(f => f.id === folderId);
    if (!folder) return;

    try {
      await supabase
        .from('desktop_folders')
        .update({ is_public: !folder.isPublic })
        .eq('id', folderId);

      setFolders(prev => prev.map(f => 
        f.id === folderId ? { ...f, isPublic: !f.isPublic } : f
      ));
    } catch (e) {
      console.error('Error toggling folder visibility:', e);
    }
  }, [folders]);

  const deleteFolder = useCallback(async (folderId: string) => {
    try {
      // La suppression en cascade est gérée par la base de données
      await supabase
        .from('desktop_folders')
        .delete()
        .eq('id', folderId);

      setFolders(prev => {
        const getDescendantIds = (id: string): string[] => {
          const children = prev.filter(f => f.parentId === id);
          return children.flatMap(child => [child.id, ...getDescendantIds(child.id)]);
        };
        const idsToDelete = [folderId, ...getDescendantIds(folderId)];
        return prev.filter(f => !idsToDelete.includes(f.id));
      });
    } catch (e) {
      console.error('Error deleting folder:', e);
    }
  }, []);

  const renameFolder = useCallback(async (folderId: string, newName: string) => {
    try {
      await supabase
        .from('desktop_folders')
        .update({ name: newName })
        .eq('id', folderId);

      setFolders(prev => prev.map(f => 
        f.id === folderId ? { ...f, name: newName } : f
      ));
    } catch (e) {
      console.error('Error renaming folder:', e);
    }
  }, []);

  const changeFolderColor = useCallback(async (folderId: string, color: string) => {
    try {
      await supabase
        .from('desktop_folders')
        .update({ color })
        .eq('id', folderId);

      setFolders(prev => prev.map(f => 
        f.id === folderId ? { ...f, color } : f
      ));
    } catch (e) {
      console.error('Error changing folder color:', e);
    }
  }, []);

  const addFileToFolder = useCallback(async (folderId: string, file: Omit<FolderFile, 'id' | 'uploadedAt'>) => {
    try {
      const { data, error } = await supabase
        .from('desktop_folder_files')
        .insert({
          folder_id: folderId,
          name: file.name,
          type: file.type,
          url: file.url,
          size: file.size || 0,
        })
        .select()
        .single();

      if (error) throw error;

      const newFile: FolderFile = {
        id: data.id,
        name: data.name,
        type: data.type,
        url: data.url,
        size: data.size,
        uploadedAt: data.uploaded_at,
      };

      setFolders(prev => prev.map(f => 
        f.id === folderId 
          ? { ...f, files: [...f.files, newFile] }
          : f
      ));
      return newFile;
    } catch (e) {
      console.error('Error adding file to folder:', e);
      return null;
    }
  }, []);

  const removeFileFromFolder = useCallback(async (folderId: string, fileId: string) => {
    try {
      await supabase
        .from('desktop_folder_files')
        .delete()
        .eq('id', fileId);

      setFolders(prev => prev.map(f => 
        f.id === folderId 
          ? { ...f, files: f.files.filter(file => file.id !== fileId) }
          : f
      ));
    } catch (e) {
      console.error('Error removing file from folder:', e);
    }
  }, []);

  const getChildFolders = useCallback((parentId?: string) => {
    return folders.filter(f => f.parentId === parentId);
  }, [folders]);

  const getRootFolders = useCallback(() => {
    return folders.filter(f => !f.parentId);
  }, [folders]);

  const getFolderPath = useCallback((folderId: string): DesktopFolder[] => {
    const path: DesktopFolder[] = [];
    let current = folders.find(f => f.id === folderId);
    
    while (current) {
      path.unshift(current);
      current = current.parentId ? folders.find(f => f.id === current!.parentId) : undefined;
    }
    
    return path;
  }, [folders]);

  const moveFolder = useCallback(async (folderId: string, newParentId?: string) => {
    const getDescendantIds = (id: string): string[] => {
      const children = folders.filter(f => f.parentId === id);
      return children.flatMap(child => [child.id, ...getDescendantIds(child.id)]);
    };
    
    if (newParentId && (folderId === newParentId || getDescendantIds(folderId).includes(newParentId))) {
      return false;
    }

    try {
      await supabase
        .from('desktop_folders')
        .update({ parent_id: newParentId || null })
        .eq('id', folderId);

      setFolders(prev => prev.map(f => 
        f.id === folderId ? { ...f, parentId: newParentId } : f
      ));
      return true;
    } catch (e) {
      console.error('Error moving folder:', e);
      return false;
    }
  }, [folders]);

  const getFilesCount = useCallback((folderId: string) => {
    const folder = folders.find(f => f.id === folderId);
    return folder?.files.length || 0;
  }, [folders]);

  const getTotalItemsCount = useCallback((folderId: string) => {
    const folder = folders.find(f => f.id === folderId);
    const childFolders = folders.filter(f => f.parentId === folderId);
    return (folder?.files.length || 0) + childFolders.length;
  }, [folders]);

  return {
    folders,
    isLoading,
    createFolder,
    deleteFolder,
    renameFolder,
    changeFolderColor,
    toggleFolderVisibility,
    addFileToFolder,
    removeFileFromFolder,
    getFilesCount,
    getTotalItemsCount,
    getChildFolders,
    getRootFolders,
    getFolderPath,
    moveFolder,
    folderColors: FOLDER_COLORS,
  };
};
