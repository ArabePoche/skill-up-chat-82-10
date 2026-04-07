import React, { useRef, useEffect, useState } from 'react';
import { BookOpen, FileText, NotebookPen, Eraser, Type, Download, Play, Pause, Maximize, RotateCcw, ImagePlus, Move, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { LiveTeachingStudio } from '@/live/types';

export type WhiteboardTool = 'pen' | 'eraser' | 'type' | 'move';

interface WhiteboardProps {
  isHost: boolean;
  onWhiteboardAction?: (action: any) => void;
  remoteWhiteboardAction?: any;
}

interface WhiteboardPoint {
  x: number;
  y: number;
}

interface WhiteboardStroke {
  id: string;
  tool: 'pen' | 'eraser';
  color: string;
  strokeWidth: number;
  points: WhiteboardPoint[];
}

interface WhiteboardText {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  fontSize: number;
}

interface WhiteboardImage {
  id: string;
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

type WhiteboardHistoryAction =
  | { type: 'stroke'; payload: WhiteboardStroke }
  | { type: 'text'; payload: WhiteboardText }
  | { type: 'image'; payload: WhiteboardImage };

interface TextDraft {
  canvasX: number;
  canvasY: number;
  screenX: number;
  screenY: number;
  value: string;
}

interface DragState {
  imageId: string;
  offsetX: number;
  offsetY: number;
}

const Whiteboard: React.FC<WhiteboardProps> = ({ isHost, onWhiteboardAction, remoteWhiteboardAction }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const historyRef = useRef<WhiteboardHistoryAction[]>([]);
  const currentStrokeRef = useRef<WhiteboardStroke | null>(null);
  const imageInsertModeRef = useRef<'full' | 'floating'>('full');
  const drawSequenceRef = useRef(0);
  const imageCacheRef = useRef<Record<string, HTMLImageElement>>({});
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<WhiteboardTool>('pen');
  const [color, setColor] = useState('#38bdf8');
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [textDraft, setTextDraft] = useState<TextDraft | null>(null);
  const [history, setHistory] = useState<WhiteboardHistoryAction[]>([]);
  const [dragState, setDragState] = useState<DragState | null>(null);

  const createActionId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  const commitHistory = (nextHistory: WhiteboardHistoryAction[]) => {
    historyRef.current = nextHistory;
    setHistory(nextHistory);
  };

  const appendToHistory = (action: WhiteboardHistoryAction) => {
    const nextHistory = [...historyRef.current, action];
    commitHistory(nextHistory);
    return nextHistory;
  };

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

  const getImageElement = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
    const cached = imageCacheRef.current[src];
    if (cached && cached.complete && cached.naturalWidth > 0) {
      resolve(cached);
      return;
    }

    const image = cached || new Image();
    imageCacheRef.current[src] = image;
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Image whiteboard load failed'));

    if (image.src !== src) {
      image.src = src;
    } else if (image.complete && image.naturalWidth > 0) {
      resolve(image);
    }
  });

  const drawStroke = (ctx: CanvasRenderingContext2D, stroke: WhiteboardStroke) => {
    if (!stroke.points.length) return;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
    ctx.lineWidth = stroke.tool === 'eraser' ? stroke.strokeWidth * 6 : stroke.strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalCompositeOperation = stroke.tool === 'eraser' ? 'destination-out' : 'source-over';
    ctx.strokeStyle = stroke.color;

    for (let index = 1; index < stroke.points.length; index += 1) {
      ctx.lineTo(stroke.points[index].x, stroke.points[index].y);
    }

    if (stroke.points.length === 1) {
      ctx.lineTo(stroke.points[0].x + 0.01, stroke.points[0].y + 0.01);
    }

    ctx.stroke();
    ctx.restore();
  };

  const drawText = (ctx: CanvasRenderingContext2D, textData: WhiteboardText) => {
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.font = `700 ${textData.fontSize}px sans-serif`;
    ctx.textBaseline = 'top';
    ctx.fillStyle = textData.color;
    ctx.fillText(textData.text, textData.x, textData.y);
    ctx.restore();
  };

  const drawImageAction = async (ctx: CanvasRenderingContext2D, imageData: WhiteboardImage) => {
    const image = await getImageElement(imageData.src);
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(image, imageData.x, imageData.y, imageData.width, imageData.height);
    ctx.restore();
  };

  const renderAction = async (ctx: CanvasRenderingContext2D, action: WhiteboardHistoryAction) => {
    if (action.type === 'stroke') {
      drawStroke(ctx, action.payload);
      return;
    }

    if (action.type === 'text') {
      drawText(ctx, action.payload);
      return;
    }

    await drawImageAction(ctx, action.payload);
  };

  const redrawHistory = async (items: WhiteboardHistoryAction[], previewStroke?: WhiteboardStroke | null) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const sequence = ++drawSequenceRef.current;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const action of items) {
      await renderAction(ctx, action);
      if (sequence !== drawSequenceRef.current) {
        return;
      }
    }

    if (previewStroke) {
      drawStroke(ctx, previewStroke);
    }
  };

  const findImageAtPoint = (x: number, y: number) => {
    for (let index = historyRef.current.length - 1; index >= 0; index -= 1) {
      const action = historyRef.current[index];
      if (action.type !== 'image') {
        continue;
      }

      const { payload } = action;
      const isInside = x >= payload.x && x <= payload.x + payload.width && y >= payload.y && y <= payload.y + payload.height;
      if (isInside) {
        return payload;
      }
    }

    return null;
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isHost) return;
    const { x, y, clientX, clientY, rect } = getCoordinates(e);

    if (tool === 'type') {
      setTextDraft({
        canvasX: x,
        canvasY: y,
        screenX: clientX - rect.left,
        screenY: clientY - rect.top,
        value: '',
      });
      return;
    }

    if (tool === 'move') {
      const image = findImageAtPoint(x, y);
      if (image) {
        setDragState({
          imageId: image.id,
          offsetX: x - image.x,
          offsetY: y - image.y,
        });
      }
      return;
    }

    setIsDrawing(true);
    const nextStroke: WhiteboardStroke = {
      id: createActionId(),
      tool: tool === 'eraser' ? 'eraser' : 'pen',
      color,
      strokeWidth,
      points: [{ x, y }],
    };

    currentStrokeRef.current = nextStroke;
    void redrawHistory(historyRef.current, nextStroke);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const { x, y } = getCoordinates(e);

    if (dragState) {
      const nextHistory = historyRef.current.map((action) => {
        if (action.type !== 'image' || action.payload.id !== dragState.imageId) {
          return action;
        }

        return {
          ...action,
          payload: {
            ...action.payload,
            x: x - dragState.offsetX,
            y: y - dragState.offsetY,
          },
        };
      }) as WhiteboardHistoryAction[];

      commitHistory(nextHistory);
      void redrawHistory(nextHistory);
      return;
    }

    if (!isDrawing || !isHost || tool === 'type' || tool === 'move') return;

    const currentStroke = currentStrokeRef.current;
    if (!currentStroke) return;

    const lastPoint = currentStroke.points[currentStroke.points.length - 1];
    if (lastPoint?.x === x && lastPoint?.y === y) {
      return;
    }

    const updatedStroke: WhiteboardStroke = {
      ...currentStroke,
      points: [...currentStroke.points, { x, y }],
    };

    currentStrokeRef.current = updatedStroke;
    void redrawHistory(historyRef.current, updatedStroke);

    if (onWhiteboardAction) {
      onWhiteboardAction({ type: 'stroke_update', payload: updatedStroke });
    }
  };

  const endDrawing = () => {
    if (dragState) {
      if (onWhiteboardAction) {
        onWhiteboardAction({ type: 'sync_full', history: historyRef.current });
      }
      setDragState(null);
      return;
    }

    if (isDrawing && currentStrokeRef.current) {
      const finalizedStrokeAction: WhiteboardHistoryAction = {
        type: 'stroke',
        payload: currentStrokeRef.current,
      };
      appendToHistory(finalizedStrokeAction);
      if (onWhiteboardAction) {
        onWhiteboardAction(finalizedStrokeAction);
      }
      currentStrokeRef.current = null;
      void redrawHistory(historyRef.current);
    }

    setIsDrawing(false);
  };

  const clearCanvas = () => {
    commitHistory([]);
    void redrawHistory([]);
    if (isHost && onWhiteboardAction) {
      onWhiteboardAction({ type: 'clear' });
    }
  };

  const commitTextDraft = () => {
    if (!textDraft) return;

    const value = textDraft.value.trim();
    if (!value) {
      setTextDraft(null);
      setTool('pen');
      return;
    }

    const nextTextAction: WhiteboardHistoryAction = {
      type: 'text',
      payload: {
        id: createActionId(),
        text: value,
        x: textDraft.canvasX,
        y: textDraft.canvasY,
        color,
        fontSize: 42,
      },
    };

    appendToHistory(nextTextAction);
    void redrawHistory(historyRef.current);
    if (isHost && onWhiteboardAction) {
      onWhiteboardAction(nextTextAction);
    }

    setTextDraft(null);
    setTool('pen');
  };

  const cancelTextDraft = () => {
    setTextDraft(null);
    setTool('pen');
  };

  useEffect(() => {
    if (!remoteWhiteboardAction || isHost) return;

    if (remoteWhiteboardAction.type === 'clear') {
      commitHistory([]);
      void redrawHistory([]);
      return;
    }

    if (remoteWhiteboardAction.type === 'stroke_update') {
      void redrawHistory(historyRef.current, remoteWhiteboardAction.payload as WhiteboardStroke);
      return;
    }

    if (remoteWhiteboardAction.type === 'sync_full') {
      const nextHistory = Array.isArray(remoteWhiteboardAction.history) ? remoteWhiteboardAction.history : [];
      commitHistory(nextHistory);
      void redrawHistory(nextHistory);
      return;
    }

    if (remoteWhiteboardAction.type === 'stroke' || remoteWhiteboardAction.type === 'text' || remoteWhiteboardAction.type === 'image') {
      const nextHistory = [...historyRef.current, remoteWhiteboardAction as WhiteboardHistoryAction];
      commitHistory(nextHistory);
      void redrawHistory(nextHistory);
    }
  }, [remoteWhiteboardAction, isHost]);

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
      void redrawHistory(historyRef.current, currentStrokeRef.current);
    };
    
    resizeCanvas();
    const handleFullscreenChange = () => window.setTimeout(resizeCanvas, 100);
    
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

  const openImagePicker = (mode: 'full' | 'floating') => {
    imageInsertModeRef.current = mode;
    fileInputRef.current?.click();
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const canvas = canvasRef.current;
    if (!file || !canvas) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const src = typeof reader.result === 'string' ? reader.result : null;
      if (!src) {
        return;
      }

      const image = new Image();
      image.onload = () => {
        const mode = imageInsertModeRef.current;
        const maxWidth = mode === 'full' ? canvas.width * 0.88 : canvas.width * 0.34;
        const maxHeight = mode === 'full' ? canvas.height * 0.88 : canvas.height * 0.34;
        const scale = Math.min(maxWidth / image.width, maxHeight / image.height, 1);
        const width = image.width * scale;
        const height = image.height * scale;

        const imageAction: WhiteboardHistoryAction = {
          type: 'image',
          payload: {
            id: createActionId(),
            src,
            x: (canvas.width - width) / 2,
            y: (canvas.height - height) / 2,
            width,
            height,
          },
        };

        appendToHistory(imageAction);
        void redrawHistory(historyRef.current);

        if (onWhiteboardAction) {
          onWhiteboardAction(imageAction);
        }

        if (mode === 'floating') {
          setTool('move');
        }
      };
      image.src = src;
    };

    reader.readAsDataURL(file);
    event.target.value = '';
  };

  return (
    <div className="flex h-full w-full flex-col bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10">
      {isHost && (
        <div className="flex items-center justify-between bg-zinc-950 p-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
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
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTool('move')}
              className={cn("h-8 w-8 rounded-lg", tool === 'move' && "bg-amber-500/20 text-amber-300")}
              title="Déplacer une image"
            >
              <Move className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => openImagePicker('full')}
              className="h-8 border-white/10 bg-white/5 text-white hover:bg-white/10"
            >
              <ImagePlus className="mr-2 h-3.5 w-3.5" />
              Image plein tableau
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => openImagePicker('floating')}
              className="h-8 border-white/10 bg-white/5 text-white hover:bg-white/10"
            >
              <Move className="mr-2 h-3.5 w-3.5" />
              Image libre
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
        
          {textDraft && (
            <div
              className="absolute z-50 rounded-xl border border-indigo-400/30 bg-zinc-950/90 p-2 shadow-2xl backdrop-blur-md"
              style={{
                left: `${Math.min(textDraft.screenX, 1540)}px`,
                top: `${Math.min(textDraft.screenY, 960)}px`,
              }}
            >
              <input
                autoFocus
                type="text"
                value={textDraft.value}
                onChange={(event) => setTextDraft((current) => current ? { ...current, value: event.target.value } : current)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    commitTextDraft();
                  }
                  if (event.key === 'Escape') {
                    event.preventDefault();
                    cancelTextDraft();
                  }
                }}
                className="w-56 bg-transparent text-base text-white placeholder:text-zinc-500 focus:outline-none"
                placeholder="Écrire puis valider"
              />
              <div className="mt-2 flex items-center justify-end gap-2">
                <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-zinc-300 hover:text-white" onClick={cancelTextDraft}>
                  <X className="h-4 w-4" />
                </Button>
                <Button type="button" size="icon" className="h-8 w-8 bg-indigo-600 hover:bg-indigo-500" onClick={commitTextDraft}>
                  <Check className="h-4 w-4" />
                </Button>
              </div>
            </div>
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