// Composant de tableau blanc interactif
import React, { useRef, useEffect, useState } from 'react';
import { Pen, Eraser, Square, Circle, Type, Undo, Redo, Trash2, Minus, Move } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WhiteboardProps {
  className?: string;
}

const Whiteboard: React.FC<WhiteboardProps> = ({ className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<'pen' | 'eraser' | 'rectangle' | 'circle' | 'text' | 'line'>('pen');
  const [strokeColor, setStrokeColor] = useState('#ffffff');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Configuration du canvas
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    
    ctx.fillStyle = '#1f2937'; // bg-gray-800
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Sauvegarder l'état initial
    saveToHistory(ctx);
  }, []);

  const saveToHistory = (ctx: CanvasRenderingContext2D) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(imageData);
    
    if (newHistory.length > 20) { // Limiter l'historique
      newHistory.shift();
    } else {
      setHistoryIndex(historyIndex + 1);
    }
    
    setHistory(newHistory);
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    
    if (tool === 'pen') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = strokeWidth;
      ctx.lineCap = 'round';
    } else if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = strokeWidth * 2;
      ctx.lineCap = 'round';
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (tool === 'pen' || tool === 'eraser') {
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    
    setIsDrawing(false);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx) {
      saveToHistory(ctx);
    }
  };

  const undo = () => {
    if (historyIndex > 0) {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;

      setHistoryIndex(historyIndex - 1);
      const imageData = history[historyIndex - 1];
      ctx.putImageData(imageData, 0, 0);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;

      setHistoryIndex(historyIndex + 1);
      const imageData = history[historyIndex + 1];
      ctx.putImageData(imageData, 0, 0);
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    ctx.fillStyle = '#1f2937';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    saveToHistory(ctx);
  };

  const colors = ['#ffffff', '#000000', '#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

  return (
    <div className={`w-full h-full bg-gray-800 rounded ${className}`}>
      {/* Barre d'outils */}
      <div className="flex items-center space-x-2 p-2 bg-gray-700 rounded-t">
        <Button
          variant={tool === 'pen' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTool('pen')}
          className="p-1"
        >
          <Pen size={14} />
        </Button>
        
        <Button
          variant={tool === 'eraser' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTool('eraser')}
          className="p-1"
        >
          <Eraser size={14} />
        </Button>

        <Button
          variant={tool === 'line' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTool('line')}
          className="p-1"
        >
          <Minus size={14} />
        </Button>

        <Button
          variant={tool === 'rectangle' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTool('rectangle')}
          className="p-1"
        >
          <Square size={14} />
        </Button>

        <Button
          variant={tool === 'circle' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTool('circle')}
          className="p-1"
        >
          <Circle size={14} />
        </Button>

        <div className="w-px h-4 bg-gray-500" />

        <Button
          variant="outline"
          size="sm"
          onClick={undo}
          disabled={historyIndex <= 0}
          className="p-1"
        >
          <Undo size={14} />
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={redo}
          disabled={historyIndex >= history.length - 1}
          className="p-1"
        >
          <Redo size={14} />
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={clearCanvas}
          className="p-1 text-red-400 hover:text-red-300"
        >
          <Trash2 size={14} />
        </Button>

        <div className="w-px h-4 bg-gray-500" />

        {/* Couleurs */}
        <div className="flex space-x-1">
          {colors.map(color => (
            <button
              key={color}
              className={`w-6 h-6 rounded border-2 ${
                strokeColor === color ? 'border-white' : 'border-gray-500'
              }`}
              style={{ backgroundColor: color }}
              onClick={() => setStrokeColor(color)}
            />
          ))}
        </div>

        <div className="w-px h-4 bg-gray-500" />

        {/* Taille du pinceau */}
        <div className="flex items-center space-x-1">
          <span className="text-xs text-gray-300">Taille:</span>
          <input
            type="range"
            min="1"
            max="20"
            value={strokeWidth}
            onChange={(e) => setStrokeWidth(Number(e.target.value))}
            className="w-16"
          />
          <span className="text-xs text-gray-300 w-6">{strokeWidth}</span>
        </div>
      </div>

      {/* Zone de dessin */}
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-crosshair"
        style={{ height: 'calc(100% - 48px)' }}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
      />
    </div>
  );
};

export default Whiteboard;