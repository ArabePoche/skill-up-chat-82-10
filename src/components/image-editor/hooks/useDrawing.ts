import { useRef, useState, useCallback } from 'react';
import { toast } from 'sonner';

// Fonctions utilitaires pour bucket fill
const getPixelColor = (data: Uint8ClampedArray, x: number, y: number, width: number) => {
  const index = (y * width + x) * 4;
  return [data[index], data[index + 1], data[index + 2], data[index + 3]];
};

const setPixelColor = (data: Uint8ClampedArray, x: number, y: number, width: number, color: number[]) => {
  const index = (y * width + x) * 4;
  data[index] = color[0];
  data[index + 1] = color[1];
  data[index + 2] = color[2];
  data[index + 3] = 255;
};

const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16)
  ] : null;
};

const colorsMatch = (a: number[], b: number[]) => {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
};

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
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyStep, setHistoryStep] = useState(0);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentTool, setCurrentTool] = useState('select');
  const [brushSize, setBrushSize] = useState(5);
  const [brushColor, setBrushColor] = useState('#000000');
  const [brushOpacity, setBrushOpacity] = useState(1);

  const saveState = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const newHistory = history.slice(0, historyStep + 1);
    newHistory.push(imageData);
    
    setHistory(newHistory);
    setHistoryStep(newHistory.length - 1);
    
    onUndoRedoChange?.(
      newHistory.length > 1,
      false
    );
  }, [history, historyStep, onUndoRedoChange]);

  const handleUndo = useCallback(() => {
    if (historyStep <= 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prevStep = historyStep - 1;
    const imageData = history[prevStep];
    ctx.putImageData(imageData, 0, 0);
    
    setHistoryStep(prevStep);
    onUndoRedoChange?.(
      prevStep > 0,
      prevStep < history.length - 1
    );
  }, [history, historyStep, onUndoRedoChange]);

  const handleRedo = useCallback(() => {
    if (historyStep >= history.length - 1) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const nextStep = historyStep + 1;
    const imageData = history[nextStep];
    ctx.putImageData(imageData, 0, 0);
    
    setHistoryStep(nextStep);
    onUndoRedoChange?.(
      true,
      nextStep < history.length - 1
    );
  }, [history, historyStep, onUndoRedoChange]);

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

    // Sauvegarder l'état avant transformation
    saveState();

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
        
      default:
        break;
    }
  }, [saveState]);

  // Fonction bucket fill simplifiée
  const bucketFill = useCallback((ctx: CanvasRenderingContext2D, startX: number, startY: number, fillColor: string) => {
    const canvas = ctx.canvas;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    const targetColor = getPixelColor(data, startX, startY, canvas.width);
    const fillColorRGB = hexToRgb(fillColor);
    
    if (!fillColorRGB || colorsMatch(targetColor, fillColorRGB)) return;
    
    // Algorithme de remplissage simple
    const stack = [[Math.floor(startX), Math.floor(startY)]];
    const visited = new Set<string>();
    const maxPixels = 10000; // Limiter pour éviter le freeze
    let pixelCount = 0;
    
    while (stack.length > 0 && pixelCount < maxPixels) {
      const [x, y] = stack.pop()!;
      const key = `${x},${y}`;
      
      if (visited.has(key) || x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) continue;
      visited.add(key);
      
      const currentColor = getPixelColor(data, x, y, canvas.width);
      if (!colorsMatch(currentColor, targetColor)) continue;
      
      setPixelColor(data, x, y, canvas.width, fillColorRGB);
      pixelCount++;
      
      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
    
    ctx.putImageData(imageData, 0, 0);
  }, []);

  // Fonctions de dessin
  const startDrawing = useCallback((e: MouseEvent | TouchEvent) => {
    if (currentTool === 'select') return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    
    // Sauvegarder l'état avant de commencer à dessiner
    saveState();

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

    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    // Configuration du style de dessin
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
        // Pour le bucket fill, on utilisera une approche différente
        bucketFill(ctx, x, y, brushColor);
        setIsDrawing(false);
        return;
    }

    ctx.beginPath();
    ctx.moveTo(x, y);
  }, [currentTool, brushSize, brushColor, brushOpacity, saveState, bucketFill]);

  const draw = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDrawing || currentTool === 'select' || currentTool === 'bucket') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

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

    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    ctx.lineTo(x, y);
    ctx.stroke();
  }, [isDrawing, currentTool]);

  const stopDrawing = useCallback(() => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(false);
    ctx.beginPath();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }, [isDrawing]);

  return {
    canvasRef,
    handleSave,
    handleUndo,
    handleRedo,
    saveState,
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
    isDrawing
  };
};