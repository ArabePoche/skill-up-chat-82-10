import { useRef, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useCanvasHistory } from './useCanvasHistory';
import { useDrawingTools } from './useDrawingTools';
import { bucketFill } from '../utils/bucketFillUtils';

interface UseDrawingProps {
  imageUrl: string;
  fileName: string;
  onSave?: (editedImageUrl: string) => void;
  onUndoRedoChange?: (canUndo: boolean, canRedo: boolean) => void;
}

export const useDrawing = ({
  imageUrl,
  fileName,
  onSave,
  onUndoRedoChange
}: UseDrawingProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [brushSize, setBrushSize] = useState(5);
  const [brushColor, setBrushColor] = useState('#000000');
  const [brushOpacity, setBrushOpacity] = useState(1);

  const { saveState, handleUndo, handleRedo } = useCanvasHistory({ onUndoRedoChange });
  
  const {
    isDrawing,
    setIsDrawing,
    currentTool,
    setCurrentTool,
    isDrawingShape,
    setIsDrawingShape,
    shapeStartPos,
    setShapeStartPos,
    tempCanvas,
    setTempCanvas,
    addText,
    drawShape
  } = useDrawingTools({
    brushColor,
    brushSize,
    brushOpacity,
    saveState: (canvasRef) => saveState(canvasRef)
  });

  const handleSave = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      toast.error('Canvas non disponible');
      return;
    }

    setIsSaving(true);
    try {
      const dataURL = canvas.toDataURL('image/png', 1.0);
      
      if (onSave) {
        await onSave(dataURL);
      }
      
      toast.success('Image sauvegardée avec succès!');
    } catch (error) {
      console.error('Error saving image:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setIsSaving(false);
    }
  }, [onSave]);

  const applyTransform = useCallback((transformType: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    saveState(canvasRef);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    switch (transformType) {
      case 'rotate-left':
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.translate(-canvas.width / 2, -canvas.height / 2);
        ctx.putImageData(imageData, 0, 0);
        ctx.restore();
        break;
      case 'rotate-right':
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(Math.PI / 2);
        ctx.translate(-canvas.width / 2, -canvas.height / 2);
        ctx.putImageData(imageData, 0, 0);
        ctx.restore();
        break;
      case 'flip-horizontal':
        ctx.save();
        ctx.scale(-1, 1);
        ctx.translate(-canvas.width, 0);
        ctx.putImageData(imageData, 0, 0);
        ctx.restore();
        break;
      case 'flip-vertical':
        ctx.save();
        ctx.scale(1, -1);
        ctx.translate(0, -canvas.height);
        ctx.putImageData(imageData, 0, 0);
        ctx.restore();
        break;
      case 'zoom-in':
        ctx.save();
        ctx.scale(1.2, 1.2);
        ctx.putImageData(imageData, 0, 0);
        ctx.restore();
        break;
      case 'zoom-out':
        ctx.save();
        ctx.scale(0.8, 0.8);
        ctx.putImageData(imageData, 0, 0);
        ctx.restore();
        break;
    }
  }, [saveState]);

  const getCanvasCoordinates = useCallback((e: MouseEvent | TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }, []);

  const startDrawing = useCallback((e: MouseEvent | TouchEvent) => {
    if (currentTool === 'select') return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCanvasCoordinates(e, canvas);

    // Gestion spéciale pour les formes
    if (['rectangle', 'circle', 'arrow'].includes(currentTool)) {
      setIsDrawingShape(true);
      setShapeStartPos({ x, y });
      saveState(canvasRef);
      
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tempCtx = tempCanvas.getContext('2d');
      if (tempCtx) {
        tempCtx.drawImage(canvas, 0, 0);
        setTempCanvas(tempCanvas);
      }
      return;
    }

    // Gestion spéciale pour le texte
    if (currentTool === 'text') {
      const text = prompt('Entrez votre texte:') || 'Texte';
      addText(canvasRef, x, y, text, 24);
      return;
    }

    setIsDrawing(true);
    saveState(canvasRef);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    switch (currentTool) {
      case 'pencil':
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = brushColor;
        ctx.globalAlpha = brushOpacity;
        ctx.lineWidth = brushSize;
        break;
      case 'eraser':
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineWidth = brushSize * 2;
        break;
      case 'highlighter':
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = brushColor;
        ctx.globalAlpha = 0.3;
        ctx.lineWidth = brushSize * 3;
        break;
      case 'bucket':
        bucketFill(ctx, x, y, brushColor);
        setIsDrawing(false);
        return;
    }

    ctx.beginPath();
    ctx.moveTo(x, y);
  }, [currentTool, brushSize, brushColor, brushOpacity, saveState, addText, getCanvasCoordinates]);

  const draw = useCallback((e: MouseEvent | TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCanvasCoordinates(e, canvas);

    if (isDrawingShape && shapeStartPos && tempCanvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(tempCanvas, 0, 0);
      drawShape(canvasRef, shapeStartPos.x, shapeStartPos.y, x, y, currentTool);
      return;
    }

    if (!isDrawing || currentTool === 'select' || currentTool === 'bucket') return;

    ctx.lineTo(x, y);
    ctx.stroke();
  }, [isDrawing, currentTool, isDrawingShape, shapeStartPos, tempCanvas, drawShape, getCanvasCoordinates]);

  const stopDrawing = useCallback(() => {
    if (isDrawingShape) {
      setIsDrawingShape(false);
      setShapeStartPos(null);
      setTempCanvas(null);
      return;
    }

    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(false);
    ctx.beginPath();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }, [isDrawing, isDrawingShape]);

  return {
    canvasRef,
    handleSave,
    handleUndo: () => handleUndo(canvasRef),
    handleRedo: () => handleRedo(canvasRef),
    saveState: () => saveState(canvasRef),
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
    brushOpacity,
    isDrawing,
    addText: (x: number, y: number, text?: string, fontSize?: number) => addText(canvasRef, x, y, text, fontSize),
    drawShape: (startX: number, startY: number, endX: number, endY: number, shape: string) => drawShape(canvasRef, startX, startY, endX, endY, shape)
  };
};
