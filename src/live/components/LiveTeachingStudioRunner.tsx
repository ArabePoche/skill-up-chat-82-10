import React, { useRef, useEffect, useState, useCallback } from 'react';
import { BookOpen, FileText, NotebookPen, Eraser, Type, Download, Play, Pause, Maximize, RotateCcw, ImagePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { LiveTeachingStudio } from '@/live/types';

export type WhiteboardTool = 'pen' | 'eraser' | 'type';

interface WhiteboardProps {
  isHost: boolean;
  onWhiteboardAction?: (action: any) => void;
  remoteWhiteboardAction?: any;
}

const Whiteboard: React.FC<WhiteboardProps> = ({ isHost, onWhiteboardAction, remoteWhiteboardAction }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<WhiteboardTool>('pen');
  const [color, setColor] = useState('#38bdf8');
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [currentStroke, setCurrentStroke] = useState<any>(null);
  const [textInput, setTextInput] = useState<{x: number, y: number, value: string} | null>(null);
  const [history, setHistory] = useState<any[]>([]);

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0, clientX: 0, clientY: 0, rect: { left: 0, top: 0 } as DOMRect };
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }
    const x = (clientX - rect.left) * (canvas.width / rect.width);
    const y = (clientY - rect.top) * (canvas.height / rect.height);
    return { x, y, clientX, clientY, rect };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isHost) return;
    const { x, y, clientX, clientY, rect } = getCoordinates(e);

    if (tool === 'type') {
      setTextInput({ x: clientX - rect.left, y: clientY - rect.top, value: '' });
      return;
    }

    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.beginPath();
    ctx.moveTo(x, y);

    setCurrentStroke({ tool, color, strokeWidth, points: [{ x, y }] });
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !isHost || tool === 'type') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.lineWidth = tool === 'eraser' ? strokeWidth * 6 : strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
    
    const { x, y } = getCoordinates(e);

    ctx.strokeStyle = color;
    ctx.lineTo(x, y);
    ctx.stroke();

    if (currentStroke) {
      setCurrentStroke((prev: any) => ({ ...prev, points: [...prev.points, { x, y }] }));
    }
  };

  const endDrawing = () => {
    if (isDrawing && currentStroke) {
      setHistory(prev => [...prev, { type: 'stroke', payload: currentStroke }]);
      if (onWhiteboardAction) {
        onWhiteboardAction({ type: 'stroke', payload: currentStroke });
      }
    }
    setIsDrawing(false);
    setCurrentStroke(null);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHistory([]);
    if (isHost && onWhiteboardAction) {
      onWhiteboardAction({ type: 'clear' });
    }
  };

  const drawStroke = (ctx: CanvasRenderingContext2D, stroke: any) => {
    if (!stroke || !stroke.points || stroke.points.length === 0) return;
    ctx.beginPath();
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
    ctx.lineWidth = stroke.tool === 'eraser' ? stroke.strokeWidth * 6 : stroke.strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalCompositeOperation = stroke.tool === 'eraser' ? 'destination-out' : 'source-over';
    ctx.strokeStyle = stroke.color;

    for (let i = 1; i < stroke.points.length; i++) {
       ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
    }
    ctx.stroke();
  };

  const drawText = (ctx: CanvasRenderingContext2D, textData: any) => {
    ctx.globalCompositeOperation = 'source-over';
    ctx.font = `bold ${textData.fontSize}px sans-serif`;
    ctx.fillStyle = textData.color;
    ctx.fillText(textData.text, textData.x, textData.y);
  };

  const handleTextSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && textInput) {
       const canvas = canvasRef.current;
       if (!canvas) return;
       const rect = canvas.getBoundingClientRect();
       const canvasX = textInput.x * (canvas.width / rect.width);
       const canvasY = textInput.y * (canvas.height / rect.height);
       
       const ctx = canvas.getContext('2d');
       if (ctx && textInput.value) {
         const textData = {
           text: textInput.value,
           x: canvasX,
           y: canvasY + 28, // adjust baseline below the top of text
           color,
           fontSize: 36
         };
         drawText(ctx, textData);
         setHistory(prev => [...prev, { type: 'text', payload: textData }]);
         if (isHost && onWhiteboardAction) {
           onWhiteboardAction({ type: 'text', payload: textData });
         }
       }
       setTextInput(null);
       setTool('pen');
    }
    if (e.key === 'Escape') {
      setTextInput(null);
      setTool('pen');
    }
  };

  const redrawHistory = (ctx: CanvasRenderingContext2D, items: any[]) => {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    items.forEach(action => {
      if (action.type === 'stroke') drawStroke(ctx, action.payload);
      else if (action.type === 'text') drawText(ctx, action.payload);
    });
  };

  useEffect(() => {
    if (!remoteWhiteboardAction || isHost) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (remoteWhiteboardAction.type === 'clear') {
       setHistory([]);
       ctx.clearRect(0, 0, canvas.width, canvas.height);
    } else if (remoteWhiteboardAction.type === 'stroke') {
       setHistory(prev => [...prev, remoteWhiteboardAction]);
       drawStroke(ctx, remoteWhiteboardAction.payload);
    } else if (remoteWhiteboardAction.type === 'text') {
       setHistory(prev => [...prev, remoteWhiteboardAction]);
       drawText(ctx, remoteWhiteboardAction.payload);
    } else if (remoteWhiteboardAction.type === 'sync_full') {
       const newHistory = remoteWhiteboardAction.history || [];
       setHistory(newHistory);
       redrawHistory(ctx, newHistory);
    }
  }, [remoteWhiteboardAction, isHost]);
  
  // Setup sizing
  const historyRef = useRef<any[]>([]);
  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Set a fixed logical resolution for all clients so strokes align perfectly
    const resizeCanvas = () => {
      canvas.width = 1920;
      canvas.height = 1080;
      
      const ctx = canvas.getContext('2d');
      if (ctx) redrawHistory(ctx, historyRef.current);
    };
    
    resizeCanvas();
    
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      // Wait a tick for the browser layout to complete in fullscreen before redraw
      setTimeout(resizeCanvas, 100);
    };
    
    window.addEventListener('resize', resizeCanvas);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await containerRef.current?.requestFullscreen();
        if (window.screen && window.screen.orientation) {
           await window.screen.orientation.lock('landscape').catch(() => {});
        }
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex h-full w-full flex-col bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10">
      {isHost && (
        <div className="flex items-center justify-between bg-zinc-950 p-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTool('pen')}
              className={cn("h-8 w-8 rounded-lg", tool === 'pen' && "bg-sky-500/20 text-sky-400")}
              title="Stylo"
            >
              <NotebookPen className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTool('type')}
              className={cn("h-8 w-8 rounded-lg", tool === 'type' && "bg-indigo-500/20 text-indigo-400")}
              title="Texte"
            >
              <Type className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTool('eraser')}
              className={cn("h-8 w-8 rounded-lg text-rose-400", tool === 'eraser' && "bg-rose-500/20")}
              title="Gomme"
            >
              <Eraser className="h-4 w-4" />
            </Button>
            
            <div className="h-4 w-[1px] bg-white/10 mx-2" />
            
            {/* Colors */}
            {['#ffffff', '#f87171', '#34d399', '#38bdf8', '#fbbf24', '#f472b6'].map((c) => (
              <button
                key={c}
                onClick={() => { setColor(c); if(tool === 'eraser') setTool('pen'); }}
                className={cn(
                  "h-6 w-6 rounded-full border-2 transition-transform", 
                  color === c && tool !== 'eraser' ? "border-white scale-110" : "border-transparent"
                )}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>

          <Button 
            variant="outline" 
            size="sm" 
            onClick={clearCanvas}
            className="h-8 border-rose-500/30 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
          >
            <RotateCcw className="mr-2 h-3.5 w-3.5" />
            Effacer tout
          </Button>
        </div>
      )}
      
      <div ref={containerRef} className="relative flex flex-1 items-center justify-center bg-zinc-950 cursor-crosshair overflow-hidden touch-none h-full w-full">
        {/* Aspect Ratio Container for Perfect Coordinate Mapping */}
        <div className="relative w-full max-w-full max-h-full aspect-video shadow-2xl bg-zinc-900 overflow-hidden ring-1 ring-white/10">
          <div 
            className="absolute inset-0 pointer-events-none opacity-20"
            style={{
              backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.4) 1px, transparent 0)',
              backgroundSize: '24px 24px'
            }}
          />
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={endDrawing}
            onMouseOut={endDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={endDrawing}
            onTouchCancel={endDrawing}
            className="w-full h-full block"
          />
        
          {textInput && (
             <input
               autoFocus
               type="text"
               value={textInput.value}
               onChange={(e) => setTextInput({ ...textInput, value: e.target.value })}
               onKeyDown={handleTextSubmit}
               onBlur={() => { 
                 if (textInput.value.trim()) {
                   handleTextSubmit({ key: 'Enter' } as any);
                 } else {
                   setTextInput(null); 
                   setTool('pen'); 
                 }
               }}
               className="absolute bg-transparent border-b border-dashed border-indigo-500 text-xl md:text-2xl lg:text-3xl p-0 m-0 z-50 focus:outline-none focus:ring-0"
               style={{ 
                 left: `${textInput.x}px`, 
                 top: `${textInput.y}px`, 
                 color, 
                 fontFamily: 'sans-serif'
               }}
               placeholder="Taper... (Entrée)"
             />
          )}

          {!isHost && (
            <div className="absolute top-4 left-4 rounded-full bg-black/60 px-3 py-1.5 text-xs font-semibold text-sky-400 backdrop-blur-md shadow-xl flex items-center z-50">
              <NotebookPen className="h-3.5 w-3.5 mr-2" />
              Vue en direct de l'enseignant
            </div>
          )}
        </div>
        
        {/* Fullscreen Toggle */}
        <Button
           variant="ghost"
           size="icon"
           onClick={toggleFullscreen}
           className="absolute bottom-4 right-4 h-10 w-10 bg-black/40 hover:bg-black/60 text-white rounded-full backdrop-blur-md z-50"
        >
          <Maximize className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};

export interface LiveTeachingStudioRunnerProps {
  studio: LiveTeachingStudio;
  isHost: boolean;
  onSceneChange?: (sceneId: string) => void;
  onWhiteboardAction?: (action: any) => void;
  remoteWhiteboardAction?: any;
}

export const LiveTeachingStudioRunner: React.FC<LiveTeachingStudioRunnerProps> = ({ studio, isHost, onSceneChange, onWhiteboardAction, remoteWhiteboardAction }) => {
  const activeScene = studio.scenes.find((s) => s.id === studio.activeSceneId) || studio.scenes[0];

  if (!activeScene || activeScene.elements.length === 0) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center rounded-2xl bg-zinc-950 p-8 text-center text-zinc-500">
        <Maximize className="mb-4 h-12 w-12 opacity-50" />
        <h3 className="text-xl font-bold text-zinc-300">Studio Vide</h3>
        <p className="mt-2 text-sm max-w-md">L'enseignant n'a pas encore configuré cette scène de classe.</p>
        {isHost && studio.scenes.length > 1 && (
          <div className="mt-4 flex flex-wrap gap-2 justify-center">
            {studio.scenes.map(s => (
              <Button key={s.id} variant="outline" size="sm" onClick={() => onSceneChange?.(s.id)}>{s.name}</Button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Handle multi layout
  return (
    <div className="flex h-full w-full flex-col">
      {isHost && studio.scenes.length > 1 && (
        <div className="flex gap-2 p-2 bg-zinc-950/80 backdrop-blur-md border-b border-white/10 overflow-x-auto w-full z-10 shrink-0">
          {studio.scenes.map(scene => (
            <Button
              key={scene.id}
              variant={scene.id === activeScene.id ? "default" : "secondary"}
              size="sm"
              onClick={() => onSceneChange?.(scene.id)}
              className={`whitespace-nowrap px-4 rounded-full ${scene.id === activeScene.id ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-zinc-800 text-zinc-300 hover:text-white'}`}
            >
              {scene.name}
            </Button>
          ))}
        </div>
      )}
      <div className="flex-1 flex w-full items-stretch justify-center gap-4 p-4 transition-all">
      {activeScene.elements.map((element) => {
        if (element.type === 'whiteboard') {
          return (
             <div key={element.id} className="flex-1 min-w-0 h-full max-h-full">
               <Whiteboard 
                 isHost={isHost} 
                 onWhiteboardAction={onWhiteboardAction} 
                 remoteWhiteboardAction={remoteWhiteboardAction} 
               />
             </div>
          );
        }

        if (element.type === 'document' && element.document_url) {
          return (
             <div key={element.id} className="flex-1 min-w-0 h-full max-h-full bg-white rounded-2xl overflow-hidden shadow-2xl relative">
                <iframe src={element.document_url} title={element.document_name || "Document"} className="w-full h-full border-0" />
             </div>
          );
        }

        if (element.type === 'notes') {
          return (
            <div key={element.id} className="w-80 min-w-0 h-full max-h-full bg-zinc-900 border border-white/10 rounded-2xl p-6 shadow-2xl flex flex-col gap-4 overflow-y-auto">
              <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                <BookOpen className="h-6 w-6 text-amber-400" />
                <h3 className="text-lg font-bold text-white">Notes du cours</h3>
              </div>
              <div className="text-sm leading-relaxed text-zinc-300 whitespace-pre-wrap">
                {element.content || "Aucune note ajoutée."}
              </div>
            </div>
          );
        }

        return null;
      })}
      </div>
    </div>
  );
};