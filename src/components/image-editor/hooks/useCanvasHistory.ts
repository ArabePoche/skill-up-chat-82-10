import { useState, useCallback } from 'react';

interface UseCanvasHistoryProps {
  onUndoRedoChange?: (canUndo: boolean, canRedo: boolean) => void;
}

export const useCanvasHistory = ({ onUndoRedoChange }: UseCanvasHistoryProps) => {
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyStep, setHistoryStep] = useState(0);

  const saveState = useCallback((canvasRef: React.RefObject<HTMLCanvasElement>) => {
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

  const handleUndo = useCallback((canvasRef: React.RefObject<HTMLCanvasElement>) => {
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

  const handleRedo = useCallback((canvasRef: React.RefObject<HTMLCanvasElement>) => {
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

  return {
    saveState,
    handleUndo,
    handleRedo
  };
};
