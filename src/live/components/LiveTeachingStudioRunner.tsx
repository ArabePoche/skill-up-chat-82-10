import React, { useRef, useEffect, useState } from 'react';
import { BookOpen, FileText, NotebookPen, Eraser, Type, Download, Play, Pause, Maximize, RotateCcw, ImagePlus, Move, Check, X, Minus, PanelBottomOpen, GripHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { LiveTeachingStudio, LiveTeachingStudioElement, LiveTeachingStudioElementWindowState } from '@/live/types';

export type WhiteboardTool = 'pen' | 'eraser' | 'type' | 'move';

interface WhiteboardProps {
  boardId: string;
  isHost: boolean;
  onWhiteboardAction?: (action: any) => void;
  remoteWhiteboardAction?: any;
  historySnapshot?: WhiteboardHistoryAction[];
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
  targetId: string;
  targetType: 'image' | 'text';
  mode: 'move' | 'resize';
  offsetX: number;
  offsetY: number;
  originX: number;
  originY: number;
  originWidth?: number;
  originHeight?: number;
}

interface SelectionState {
  id: string;
  type: 'image' | 'text';
}

type WhiteboardRuntimeAction =
  | WhiteboardHistoryAction
  | { type: 'stroke_update'; payload: WhiteboardStroke }
  | {
      type: 'item_transform';
      payload: {
        targetId: string;
        targetType: 'image' | 'text';
        updates: Partial<WhiteboardImage & WhiteboardText>;
      };
    }
  | { type: 'sync_full'; history: WhiteboardHistoryAction[] }
  | { type: 'clear' };

const Whiteboard: React.FC<WhiteboardProps> = ({ boardId, isHost, onWhiteboardAction, remoteWhiteboardAction, historySnapshot = [] }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const historyRef = useRef<WhiteboardHistoryAction[]>([]);
  const currentStrokeRef = useRef<WhiteboardStroke | null>(null);
  const imageInsertModeRef = useRef<'full' | 'floating'>('full');
  const drawSequenceRef = useRef(0);
  const imageCacheRef = useRef<Record<string, HTMLImageElement>>({});
  const selectedItemRef = useRef<SelectionState | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<WhiteboardTool>('pen');
  const [color, setColor] = useState('#38bdf8');
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [textDraft, setTextDraft] = useState<TextDraft | null>(null);
  const [history, setHistory] = useState<WhiteboardHistoryAction[]>([]);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [selectedItem, setSelectedItem] = useState<SelectionState | null>(null);

  const emitWhiteboardAction = (action: WhiteboardRuntimeAction | WhiteboardHistoryAction | { type: 'clear' }) => {
    onWhiteboardAction?.({
      ...action,
      boardId,
    });
  };

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

  const updateHistoryItem = (
    targetId: string,
    targetType: 'image' | 'text',
    updates: Partial<WhiteboardImage & WhiteboardText>
  ) => {
    const nextHistory = historyRef.current.map((action) => {
      if (action.type !== targetType || action.payload.id !== targetId) {
        return action;
      }

      return {
        ...action,
        payload: {
          ...action.payload,
          ...updates,
        },
      } as WhiteboardHistoryAction;
    });

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

  const measureTextBounds = (ctx: CanvasRenderingContext2D, textData: WhiteboardText) => {
    ctx.save();
    ctx.font = `700 ${textData.fontSize}px sans-serif`;
    const metrics = ctx.measureText(textData.text);
    ctx.restore();

    return {
      x: textData.x,
      y: textData.y,
      width: Math.max(metrics.width, 24),
      height: textData.fontSize,
    };
  };

  const getSelectionBounds = (ctx: CanvasRenderingContext2D, selection: SelectionState | null) => {
    if (!selection) return null;

    const action = historyRef.current.find((entry) => entry.type === selection.type && entry.payload.id === selection.id);
    if (!action) return null;

    if (action.type === 'image') {
      return {
        x: action.payload.x,
        y: action.payload.y,
        width: action.payload.width,
        height: action.payload.height,
      };
    }

    return measureTextBounds(ctx, action.payload);
  };

  const drawSelectionOverlay = (ctx: CanvasRenderingContext2D) => {
    if (!isHost || tool !== 'move') return;

    const bounds = getSelectionBounds(ctx, selectedItemRef.current);
    if (!bounds) return;

    ctx.save();
    ctx.strokeStyle = 'rgba(250, 204, 21, 0.95)';
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 8]);
    ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
    ctx.setLineDash([]);

    const handleSize = 16;
    ctx.fillStyle = 'rgba(250, 204, 21, 1)';
    ctx.fillRect(bounds.x + bounds.width - handleSize / 2, bounds.y + bounds.height - handleSize / 2, handleSize, handleSize);
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

    drawSelectionOverlay(ctx);
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

  const findTextAtPoint = (x: number, y: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return null;

    for (let index = historyRef.current.length - 1; index >= 0; index -= 1) {
      const action = historyRef.current[index];
      if (action.type !== 'text') {
        continue;
      }

      const bounds = measureTextBounds(ctx, action.payload);
      const isInside = x >= bounds.x && x <= bounds.x + bounds.width && y >= bounds.y && y <= bounds.y + bounds.height;
      if (isInside) {
        return action.payload;
      }
    }

    return null;
  };

  const isOnResizeHandle = (x: number, y: number, image: WhiteboardImage) => {
    const handleSize = 28;
    return (
      x >= image.x + image.width - handleSize &&
      x <= image.x + image.width + handleSize &&
      y >= image.y + image.height - handleSize &&
      y <= image.y + image.height + handleSize
    );
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
        const mode = isOnResizeHandle(x, y, image) ? 'resize' : 'move';
        const nextSelection = { id: image.id, type: 'image' as const };
        selectedItemRef.current = nextSelection;
        setSelectedItem(nextSelection);
        setDragState({
          targetId: image.id,
          targetType: 'image',
          mode,
          offsetX: x - image.x,
          offsetY: y - image.y,
          originX: image.x,
          originY: image.y,
          originWidth: image.width,
          originHeight: image.height,
        });
        void redrawHistory(historyRef.current);
        return;
      }

      const text = findTextAtPoint(x, y);
      if (text) {
        const nextSelection = { id: text.id, type: 'text' as const };
        selectedItemRef.current = nextSelection;
        setSelectedItem(nextSelection);
        setDragState({
          targetId: text.id,
          targetType: 'text',
          mode: 'move',
          offsetX: x - text.x,
          offsetY: y - text.y,
          originX: text.x,
          originY: text.y,
        });
        void redrawHistory(historyRef.current);
      } else {
        selectedItemRef.current = null;
        setSelectedItem(null);
        void redrawHistory(historyRef.current);
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
      const updates = dragState.mode === 'resize'
        ? {
            width: Math.max(80, (dragState.originWidth || 0) + (x - dragState.originX - (dragState.originWidth || 0))),
            height: Math.max(80, (dragState.originHeight || 0) + (y - dragState.originY - (dragState.originHeight || 0))),
          }
        : {
            x: x - dragState.offsetX,
            y: y - dragState.offsetY,
          };

      const nextHistory = updateHistoryItem(dragState.targetId, dragState.targetType, updates);
      void redrawHistory(nextHistory);

      emitWhiteboardAction({
        type: 'item_transform',
        payload: {
          targetId: dragState.targetId,
          targetType: dragState.targetType,
          updates,
        },
      });
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

    emitWhiteboardAction({ type: 'stroke_update', payload: updatedStroke });
  };

  const endDrawing = () => {
    if (dragState) {
      setDragState(null);
      return;
    }

    if (isDrawing && currentStrokeRef.current) {
      const finalizedStrokeAction: WhiteboardHistoryAction = {
        type: 'stroke',
        payload: currentStrokeRef.current,
      };
      appendToHistory(finalizedStrokeAction);
      emitWhiteboardAction(finalizedStrokeAction);
      currentStrokeRef.current = null;
      void redrawHistory(historyRef.current);
    }

    setIsDrawing(false);
  };

  const clearCanvas = () => {
    commitHistory([]);
    void redrawHistory([]);
    if (isHost) {
      emitWhiteboardAction({ type: 'clear' });
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
    selectedItemRef.current = { id: nextTextAction.payload.id, type: 'text' };
    setSelectedItem({ id: nextTextAction.payload.id, type: 'text' });
    void redrawHistory(historyRef.current);
    if (isHost) {
      emitWhiteboardAction(nextTextAction);
    }

    setTextDraft(null);
    setTool('pen');
  };

  const cancelTextDraft = () => {
    setTextDraft(null);
    setTool('pen');
  };

  useEffect(() => {
    commitHistory(historySnapshot);
    void redrawHistory(historySnapshot, currentStrokeRef.current);
  }, [historySnapshot]);

  useEffect(() => {
    if (!remoteWhiteboardAction) return;
    if (remoteWhiteboardAction.boardId !== boardId) return;
    if (remoteWhiteboardAction.type !== 'stroke_update') return;

    void redrawHistory(historyRef.current, remoteWhiteboardAction.payload as WhiteboardStroke);
  }, [boardId, remoteWhiteboardAction]);

  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  useEffect(() => {
    selectedItemRef.current = selectedItem;
  }, [selectedItem]);

  useEffect(() => {
    if (tool !== 'move') {
      selectedItemRef.current = null;
      setSelectedItem(null);
      setDragState(null);
      void redrawHistory(historyRef.current, currentStrokeRef.current);
    }
  }, [tool]);

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
        selectedItemRef.current = { id: imageAction.payload.id, type: 'image' };
        setSelectedItem({ id: imageAction.payload.id, type: 'image' });
        void redrawHistory(historyRef.current);

        emitWhiteboardAction(imageAction);

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
  onStudioChange?: (studio: LiveTeachingStudio) => void;
  onWhiteboardAction?: (action: any) => void;
  remoteWhiteboardAction?: any;
  remoteWhiteboardHistories?: Record<string, WhiteboardHistoryAction[]>;
}

interface StudioWindowLayout {
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  minimized: boolean;
}

interface WindowInteractionState {
  elementId: string;
  mode: 'move' | 'resize';
  startX: number;
  startY: number;
  startLayout: StudioWindowLayout;
}

export const LiveTeachingStudioRunner: React.FC<LiveTeachingStudioRunnerProps> = ({ studio, isHost, onSceneChange, onStudioChange, onWhiteboardAction, remoteWhiteboardAction, remoteWhiteboardHistories = {} }) => {
  const activeScene = studio.scenes.find((s) => s.id === studio.activeSceneId) || studio.scenes[0];
  const desktopRef = useRef<HTMLDivElement>(null);
  const nextZIndexRef = useRef(4);
  const [windowLayouts, setWindowLayouts] = useState<Record<string, StudioWindowLayout>>({});
  const [interaction, setInteraction] = useState<WindowInteractionState | null>(null);

  const createDefaultLayout = (element: LiveTeachingStudioElement, index: number): StudioWindowLayout => {
    if (element.window_state) {
      return {
        x: element.window_state.x,
        y: element.window_state.y,
        width: element.window_state.width,
        height: element.window_state.height,
        zIndex: element.window_state.zIndex,
        minimized: element.window_state.minimized,
      };
    }

    if (element.type === 'whiteboard') {
      return { x: 2, y: 4, width: 66, height: 78, zIndex: 2, minimized: false };
    }

    if (element.type === 'notes') {
      return { x: 70, y: 8 + index * 3, width: 28, height: 38, zIndex: 3 + index, minimized: false };
    }

    return { x: 64, y: 48, width: 34, height: 34, zIndex: 3 + index, minimized: false };
  };

  const publishWindowLayouts = (layoutMap: Record<string, StudioWindowLayout>) => {
    if (!isHost || !onStudioChange) {
      return;
    }

    const nextStudio: LiveTeachingStudio = {
      ...studio,
      scenes: studio.scenes.map((scene) => ({
        ...scene,
        elements: scene.elements.map((element) => ({
          ...element,
          window_state: layoutMap[element.id]
            ? {
                x: layoutMap[element.id].x,
                y: layoutMap[element.id].y,
                width: layoutMap[element.id].width,
                height: layoutMap[element.id].height,
                zIndex: layoutMap[element.id].zIndex,
                minimized: layoutMap[element.id].minimized,
              }
            : element.window_state || null,
        })),
      })),
    };

    onStudioChange(nextStudio);
  };

  useEffect(() => {
    if (!activeScene) {
      return;
    }

    nextZIndexRef.current = Math.max(activeScene.elements.length + 4, 6);
    setWindowLayouts((current) => {
      const nextLayouts: Record<string, StudioWindowLayout> = {};

      activeScene.elements.forEach((element, index) => {
        nextLayouts[element.id] = createDefaultLayout(element, index);
      });

      return nextLayouts;
    });
  }, [activeScene]);

  useEffect(() => {
    if (!interaction) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const desktop = desktopRef.current;
      if (!desktop) {
        return;
      }

      const bounds = desktop.getBoundingClientRect();
      if (!bounds.width || !bounds.height) {
        return;
      }

      const deltaX = ((event.clientX - interaction.startX) / bounds.width) * 100;
      const deltaY = ((event.clientY - interaction.startY) / bounds.height) * 100;

      setWindowLayouts((current) => {
        const target = current[interaction.elementId];
        if (!target) {
          return current;
        }

        const nextLayout = { ...target };

        if (interaction.mode === 'move') {
          nextLayout.x = Math.max(0, Math.min(100 - nextLayout.width, interaction.startLayout.x + deltaX));
          nextLayout.y = Math.max(0, Math.min(90 - nextLayout.height, interaction.startLayout.y + deltaY));
        } else {
          nextLayout.width = Math.max(20, Math.min(100 - interaction.startLayout.x, interaction.startLayout.width + deltaX));
          nextLayout.height = Math.max(18, Math.min(90 - interaction.startLayout.y, interaction.startLayout.height + deltaY));
        }

        const nextMap = {
          ...current,
          [interaction.elementId]: nextLayout,
        };

        publishWindowLayouts(nextMap);
        return nextMap;
      });
    };

    const handlePointerUp = () => {
      setInteraction(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [interaction]);

  const focusWindow = (elementId: string) => {
    setWindowLayouts((current) => {
      const target = current[elementId];
      if (!target) {
        return current;
      }

      const nextZIndex = nextZIndexRef.current + 1;
      nextZIndexRef.current = nextZIndex;

      const nextMap = {
        ...current,
        [elementId]: {
          ...target,
          zIndex: nextZIndex,
          minimized: false,
        },
      };

      publishWindowLayouts(nextMap);
      return nextMap;
    });
  };

  const minimizeWindow = (elementId: string) => {
    setWindowLayouts((current) => {
      const target = current[elementId];
      if (!target) {
        return current;
      }

      const nextMap = {
        ...current,
        [elementId]: {
          ...target,
          minimized: true,
        },
      };

      publishWindowLayouts(nextMap);
      return nextMap;
    });
  };

  const startWindowInteraction = (
    event: React.PointerEvent<HTMLDivElement>,
    elementId: string,
    mode: 'move' | 'resize'
  ) => {
    if (!isHost) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const layout = windowLayouts[elementId];
    if (!layout) {
      return;
    }

    focusWindow(elementId);
    setInteraction({
      elementId,
      mode,
      startX: event.clientX,
      startY: event.clientY,
      startLayout: layout,
    });
  };

  const getElementIcon = (type: LiveTeachingStudio['scenes'][number]['elements'][number]['type']) => {
    if (type === 'whiteboard') return NotebookPen;
    if (type === 'notes') return BookOpen;
    return FileText;
  };

  const renderSceneElement = (element: LiveTeachingStudio['scenes'][number]['elements'][number]) => {
    if (element.type === 'whiteboard') {
      const boardId = `${activeScene.id}:${element.id}`;

      return (
        <Whiteboard
          boardId={boardId}
          isHost={isHost}
          onWhiteboardAction={onWhiteboardAction}
          remoteWhiteboardAction={remoteWhiteboardAction}
          historySnapshot={remoteWhiteboardHistories[boardId] || []}
        />
      );
    }

    if (element.type === 'document' && element.document_url) {
      return (
        <div className="h-full w-full overflow-hidden rounded-b-2xl bg-white">
          <iframe src={element.document_url} title={element.document_name || 'Document'} className="h-full w-full border-0" />
        </div>
      );
    }

    if (element.type === 'notes') {
      return (
        <div className="flex h-full w-full flex-col gap-4 overflow-y-auto rounded-b-2xl bg-zinc-900 p-6 text-zinc-300">
          <div className="flex items-center gap-3 border-b border-white/5 pb-4">
            <BookOpen className="h-6 w-6 text-amber-400" />
            <h3 className="text-lg font-bold text-white">Notes du cours</h3>
          </div>
          <div className="whitespace-pre-wrap text-sm leading-relaxed">
            {element.content || 'Aucune note ajoutée.'}
          </div>
        </div>
      );
    }

    return null;
  };

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

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-[1.5rem] bg-zinc-950">
      {isHost && (
      <div className="flex items-center justify-between gap-4 border-b border-white/10 bg-zinc-950/95 px-4 py-3 backdrop-blur-md">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500">Studio live</p>
          <h2 className="truncate text-lg font-bold text-white">{studio.title || 'Teaching Studio'}</h2>
        </div>
        <div className="flex flex-1 items-center justify-end gap-2 overflow-x-auto">
          {studio.scenes.map((scene, index) => (
            <Button
              key={scene.id}
              variant="ghost"
              size="sm"
              onClick={() => onSceneChange?.(scene.id)}
              className={cn(
                'h-10 rounded-xl border px-4 text-sm font-semibold whitespace-nowrap',
                scene.id === activeScene.id
                  ? 'border-sky-400/40 bg-sky-500/15 text-sky-200'
                  : 'border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white'
              )}
            >
              <span className="mr-2 text-[10px] uppercase tracking-[0.2em] text-zinc-500">S{index + 1}</span>
              {scene.name}
            </Button>
          ))}
        </div>
      </div>
      )}

      <div ref={desktopRef} className="relative flex-1 overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.12),transparent_28%),linear-gradient(180deg,rgba(24,24,27,0.96),rgba(9,9,11,1))] p-3 md:p-4">
        <div className="pointer-events-none absolute inset-0 opacity-[0.08]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        {activeScene.elements.map((element) => {
          const layout = windowLayouts[element.id] || createDefaultLayout(element, 0);
          const Icon = getElementIcon(element.type);

          if (layout.minimized) {
            return null;
          }

          return (
            <div
              key={element.id}
              className="absolute overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/90 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl"
              style={{
                left: `${layout.x}%`,
                top: `${layout.y}%`,
                width: `${layout.width}%`,
                height: `${layout.height}%`,
                zIndex: layout.zIndex,
              }}
              onMouseDown={() => focusWindow(element.id)}
            >
              <div
                className={cn(
                  'flex h-12 items-center justify-between border-b border-white/10 px-4',
                  isHost ? 'cursor-grab active:cursor-grabbing' : ''
                )}
                onPointerDown={(event) => startWindowInteraction(event, element.id, 'move')}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/8 text-zinc-200">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">{element.title}</p>
                    <p className="truncate text-[11px] uppercase tracking-[0.2em] text-zinc-500">{element.type}</p>
                  </div>
                </div>
                {isHost && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white"
                    onClick={(event) => {
                      event.stopPropagation();
                      minimizeWindow(element.id);
                    }}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="h-[calc(100%-3rem)] w-full">{renderSceneElement(element)}</div>

              {isHost && (
                <div
                  className="absolute bottom-2 right-2 flex h-6 w-6 cursor-se-resize items-center justify-center rounded bg-white/10 text-zinc-300"
                  onPointerDown={(event) => startWindowInteraction(event, element.id, 'resize')}
                >
                  <GripHorizontal className="h-3.5 w-3.5 rotate-45" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {isHost && (
      <div className="flex items-center gap-2 overflow-x-auto border-t border-white/10 bg-zinc-950/95 px-3 py-3 backdrop-blur-md">
        {activeScene.elements.map((element) => {
          const layout = windowLayouts[element.id] || createDefaultLayout(element, 0);
          const Icon = getElementIcon(element.type);

          return (
            <button
              key={element.id}
              type="button"
              onClick={() => focusWindow(element.id)}
              className={cn(
                'flex min-w-[140px] items-center gap-3 rounded-xl border px-3 py-2 text-left transition-colors',
                layout.minimized
                  ? 'border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white'
                  : 'border-sky-400/30 bg-sky-500/15 text-sky-100'
              )}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-black/25">
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{element.title}</p>
                <p className="truncate text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                  {layout.minimized ? 'Réouvrir' : 'Ouvert'}
                </p>
              </div>
              {layout.minimized ? <PanelBottomOpen className="h-4 w-4 shrink-0" /> : <Minus className="h-4 w-4 shrink-0" />}
            </button>
          );
        })}
      </div>
      )}
    </div>
  );
};