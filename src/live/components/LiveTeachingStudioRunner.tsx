import React, { useRef, useEffect, useState } from 'react';
import { BookOpen, FileText, NotebookPen, Eraser, Download, Play, Pause, Maximize, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { LiveTeachingStudio } from '@/live/types';

interface WhiteboardProps {
  isHost: boolean;
}

const Whiteboard: React.FC<WhiteboardProps> = ({ isHost }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
  const [color, setColor] = useState('#38bdf8');
  const [strokeWidth, setStrokeWidth] = useState(4);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isHost) return;
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Get correct coordinates considering CSS scaling
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    const x = (clientX - rect.left) * (canvas.width / rect.width);
    const y = (clientY - rect.top) * (canvas.height / rect.height);
    
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !isHost) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Smooth drawing settings
    ctx.lineWidth = tool === 'eraser' ? strokeWidth * 6 : strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
    
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    const x = (clientX - rect.left) * (canvas.width / rect.width);
    const y = (clientY - rect.top) * (canvas.height / rect.height);

    ctx.strokeStyle = color;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const endDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };
  
  // Setup sizing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Set internal resolution much higher for sharpness
    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth * 2;
        canvas.height = parent.clientHeight * 2;
      }
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

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
                onClick={() => { setColor(c); setTool('pen'); }}
                className={cn(
                  "h-6 w-6 rounded-full border-2 transition-transform", 
                  color === c && tool === 'pen' ? "border-white scale-110" : "border-transparent"
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
      
      <div className="relative flex-1 bg-zinc-900 cursor-crosshair overflow-hidden touch-none">
        {/* Subtle grid background */}
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
          style={{ width: '100%', height: '100%' }}
        />
        
        {!isHost && (
          <div className="absolute top-4 left-4 rounded-full bg-black/60 px-3 py-1.5 text-xs font-semibold text-sky-400 backdrop-blur-md shadow-xl flex items-center">
            <NotebookPen className="h-3.5 w-3.5 mr-2" />
            Vue en direct de l'enseignant
          </div>
        )}
      </div>
    </div>
  );
};

export interface LiveTeachingStudioRunnerProps {
  studio: LiveTeachingStudio;
  isHost: boolean;
  onSceneChange?: (sceneId: string) => void;
}

export const LiveTeachingStudioRunner: React.FC<LiveTeachingStudioRunnerProps> = ({ studio, isHost, onSceneChange }) => {
  const activeScene = studio.scenes.find((s) => s.is_active) || studio.scenes[0];

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
               <Whiteboard isHost={isHost} />
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