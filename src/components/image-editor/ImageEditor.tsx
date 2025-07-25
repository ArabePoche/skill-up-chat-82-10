import React, { useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import Header from './Header';
import ImageCanvas from './ImageCanvas';
import Menu from './Menu';
import { useDrawing } from './hooks/useDrawing';

interface ImageEditorProps {
  imageUrl: string;
  fileName: string;
  onSave?: (editedImageUrl: string) => void;
  onClose?: () => void;
}

export type MenuType = 'drawing' | 'shapes' | 'text' | 'transform' | 'export';
export type DrawingTool = 'select' | 'pencil' | 'eraser' | 'highlighter' | 'bucket';
export type ShapeTool = 'rectangle' | 'circle' | 'arrow';

const ImageEditor: React.FC<ImageEditorProps> = ({
  imageUrl,
  fileName,
  onSave,
  onClose
}) => {
  const [activeMenu, setActiveMenu] = useState<MenuType | null>('drawing');
  const [activeTool, setActiveTool] = useState<string>('select');
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [showDynamicSection, setShowDynamicSection] = useState(false);
  const isMobile = useIsMobile();
  
  const {
    canvasRef,
    handleSave,
    handleUndo,
    handleRedo,
    isSaving,
    applyTransform,
    startDrawing,
    draw,
    stopDrawing,
    setCurrentTool,
    setBrushSize,
    setBrushColor,
    setBrushOpacity,
    currentTool,
    brushSize,
    brushColor,
    brushOpacity
  } = useDrawing({
    imageUrl,
    fileName,
    onSave,
    onUndoRedoChange: (undo, redo) => {
      setCanUndo(undo);
      setCanRedo(redo);
    }
  });

  // Fonction pour télécharger l'image
  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataURL = canvas.toDataURL('image/png', 1.0);
    const link = document.createElement('a');
    link.download = `edited_${fileName}`;
    link.href = dataURL;
    link.click();
  };

  // Fonction pour sauvegarder et envoyer au chat
  const handleSaveAndSendToChat = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      const dataURL = canvas.toDataURL('image/png', 1.0);
      
      // D'abord sauvegarder
      if (onSave) {
        await onSave(dataURL);
      }
      
      // Puis proposer d'envoyer au chat (logique à implémenter selon le contexte)
      // Pour l'instant, on crée un lien de téléchargement avec un nom spécial
      const response = await fetch(dataURL);
      const blob = await response.blob();
      const file = new File([blob], `edited_${fileName}`, { type: 'image/png' });
      
      // Ici on pourrait déclencher un événement ou callback pour envoyer au chat
      console.log('Image prête à être envoyée au chat:', file);
      
      // Pour l'instant, on télécharge avec un nom spécial pour indiquer qu'elle doit être envoyée
      handleDownload();
      
    } catch (error) {
      console.error('Erreur lors de la sauvegarde et envoi:', error);
    }
  };

  const handleMenuChange = (menu: MenuType) => {
    if (isMobile) {
      // Toggle intelligente en mobile
      if (activeMenu === menu && showDynamicSection) {
        setShowDynamicSection(false);
      } else {
        setActiveMenu(menu);
        setShowDynamicSection(true);
      }
    } else {
      setActiveMenu(menu);
    }
    
    // Reset tool when changing menu
    if (menu === 'drawing') {
      setActiveTool('select');
    } else if (menu === 'shapes') {
      setActiveTool('rectangle');
    } else if (menu === 'text') {
      setActiveTool('text');
    } else if (menu === 'transform') {
      setActiveTool('rotate-right');
    }
  };

  const handleToolChange = (tool: string) => {
    setActiveTool(tool);
    
    // Fermer automatiquement la section dynamique sur mobile après sélection d'outil
    if (isMobile) {
      setShowDynamicSection(false);
    }

    // Appliquer les transformations directement
    if (tool.startsWith('rotate-') || tool.startsWith('flip-') || tool.startsWith('zoom-') || tool === 'crop') {
      applyTransform?.(tool);
    }
    
    // Mettre à jour l'outil actuel pour le hook
    setCurrentTool(tool);
  };

  const handleCloseDynamicSection = () => {
    setShowDynamicSection(false);
  };

  return (
    <div className="w-screen h-screen overflow-hidden bg-muted flex flex-col">
      <Header 
        onSave={handleSave}
        onSaveAndSendToChat={handleSaveAndSendToChat}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onClose={onClose}
        onDownload={handleDownload}
        canUndo={canUndo}
        canRedo={canRedo}
        isSaving={isSaving}
      />
      
      <div className="flex flex-1 overflow-hidden">
        <ImageCanvas 
          ref={canvasRef}
          imageUrl={imageUrl}
          activeTool={activeTool}
          className="flex-1"
          onStartDrawing={startDrawing}
          onDraw={draw}
          onStopDrawing={stopDrawing}
          onToolChange={setCurrentTool}
        />
        
        <Menu
          activeMenu={activeMenu}
          activeTool={activeTool}
          isMobile={isMobile}
          showDynamicSection={showDynamicSection}
          onMenuChange={handleMenuChange}
          onToolChange={handleToolChange}
          onCloseDynamicSection={handleCloseDynamicSection}
          brushSize={brushSize}
          brushColor={brushColor}
          brushOpacity={brushOpacity}
          onBrushSizeChange={setBrushSize}
          onBrushColorChange={setBrushColor}
          onBrushOpacityChange={setBrushOpacity}
        />
      </div>
    </div>
  );
};

export default ImageEditor;