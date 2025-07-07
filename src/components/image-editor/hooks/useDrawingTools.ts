import { useState, useCallback } from 'react';
import { bucketFill } from '../utils/bucketFillUtils';

interface UseDrawingToolsProps {
  brushColor: string;
  brushSize: number;
  brushOpacity: number;
  saveState: (canvasRef: React.RefObject<HTMLCanvasElement>) => void;
}

export const useDrawingTools = ({ 
  brushColor, 
  brushSize, 
  brushOpacity, 
  saveState 
}: UseDrawingToolsProps) => {
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentTool, setCurrentTool] = useState('select');
  const [isDrawingShape, setIsDrawingShape] = useState(false);
  const [shapeStartPos, setShapeStartPos] = useState<{x: number, y: number} | null>(null);
  const [tempCanvas, setTempCanvas] = useState<HTMLCanvasElement | null>(null);

  const addText = useCallback((canvasRef: React.RefObject<HTMLCanvasElement>, x: number, y: number, text: string = 'Texte', fontSize: number = 24) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    saveState(canvasRef);
    
    ctx.font = `${fontSize}px Arial`;
    ctx.fillStyle = brushColor;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(text, x, y);
  }, [brushColor, saveState]);

  const drawShape = useCallback((canvasRef: React.RefObject<HTMLCanvasElement>, startX: number, startY: number, endX: number, endY: number, shape: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = brushColor;
    ctx.lineWidth = brushSize;
    ctx.globalAlpha = brushOpacity;

    switch (shape) {
      case 'rectangle':
        const width = endX - startX;
        const height = endY - startY;
        ctx.strokeRect(startX, startY, width, height);
        break;
      case 'circle':
        const radius = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
        ctx.beginPath();
        ctx.arc(startX, startY, radius, 0, 2 * Math.PI);
        ctx.stroke();
        break;
      case 'arrow':
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        
        // Pointe de flèche
        const angle = Math.atan2(endY - startY, endX - startX);
        const arrowLength = 15;
        const arrowAngle = Math.PI / 6;
        
        ctx.lineTo(
          endX - arrowLength * Math.cos(angle - arrowAngle),
          endY - arrowLength * Math.sin(angle - arrowAngle)
        );
        ctx.moveTo(endX, endY);
        ctx.lineTo(
          endX - arrowLength * Math.cos(angle + arrowAngle),
          endY - arrowLength * Math.sin(angle + arrowAngle)
        );
        ctx.stroke();
        break;
    }
  }, [brushColor, brushSize, brushOpacity]);

  return {
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
  };
};
