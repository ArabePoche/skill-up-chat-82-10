// Composant de tableau blanc interactif — propulsé par Fabric.js
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Canvas as FabricCanvas, PencilBrush, IText, FabricImage } from 'fabric';
import { Pen, Eraser, Type, Undo, Redo, Trash2, Image as ImageIcon, MousePointer } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WhiteboardProps {
  className?: string;
}

const BG_COLOR = '#1f2937';
const MAX_HISTORY = 30;

type Tool = 'select' | 'pen' | 'eraser' | 'text';

const Whiteboard: React.FC<WhiteboardProps> = ({ className = '' }) => {
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fabricRef = useRef<FabricCanvas | null>(null);

  // Keep current tool/color/size accessible inside Fabric event callbacks via refs
  const toolRef = useRef<Tool>('pen');
  const colorRef = useRef('#ffffff');
  const widthRef = useRef(3);
  const fontSizeRef = useRef(20);

  const [tool, setToolState] = useState<Tool>('pen');
  const [strokeColor, setStrokeColorState] = useState('#ffffff');
  const [strokeWidth, setStrokeWidthState] = useState(3);
  const [fontSize, setFontSizeState] = useState(20);

  // History stored as serialized JSON strings
  const historyRef = useRef<string[]>([]);
  const historyIdxRef = useRef<number>(-1);
  const suppressHistoryRef = useRef(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // ---------- helpers ----------

  const syncHistoryButtons = useCallback(() => {
    setCanUndo(historyIdxRef.current > 0);
    setCanRedo(historyIdxRef.current < historyRef.current.length - 1);
  }, []);

  const saveSnapshot = useCallback(() => {
    if (suppressHistoryRef.current) return;
    const fc = fabricRef.current;
    if (!fc) return;
    const json = JSON.stringify(fc.toJSON());
    // Discard any redo states
    historyRef.current = historyRef.current.slice(0, historyIdxRef.current + 1);
    historyRef.current.push(json);
    if (historyRef.current.length > MAX_HISTORY) {
      historyRef.current.shift();
    } else {
      historyIdxRef.current += 1;
    }
    syncHistoryButtons();
  }, [syncHistoryButtons]);

  const restoreSnapshot = useCallback(async (json: string) => {
    const fc = fabricRef.current;
    if (!fc) return;
    suppressHistoryRef.current = true;
    await fc.loadFromJSON(JSON.parse(json));
    fc.renderAll();
    suppressHistoryRef.current = false;
    syncHistoryButtons();
  }, [syncHistoryButtons]);

  // ---------- tool application ----------

  const applyTool = useCallback((t: Tool) => {
    const fc = fabricRef.current;
    if (!fc) return;

    if (t === 'pen') {
      fc.isDrawingMode = true;
      fc.selection = false;
      const brush = new PencilBrush(fc);
      brush.color = colorRef.current;
      brush.width = widthRef.current;
      fc.freeDrawingBrush = brush;
    } else if (t === 'eraser') {
      fc.isDrawingMode = true;
      fc.selection = false;
      const brush = new PencilBrush(fc);
      // Paint over with the background color to simulate erasing
      brush.color = BG_COLOR;
      brush.width = widthRef.current * 3;
      fc.freeDrawingBrush = brush;
    } else {
      fc.isDrawingMode = false;
      fc.selection = t === 'select';
    }
  }, []);

  // Sync setters: update state + ref + fabric brush
  const setTool = useCallback((t: Tool) => {
    toolRef.current = t;
    setToolState(t);
    applyTool(t);
  }, [applyTool]);

  const setStrokeColor = useCallback((c: string) => {
    colorRef.current = c;
    setStrokeColorState(c);
    const fc = fabricRef.current;
    if (!fc) return;
    if (toolRef.current === 'pen' && fc.freeDrawingBrush) {
      fc.freeDrawingBrush.color = c;
    }
    // Update selected text color
    const obj = fc.getActiveObject();
    if (obj?.type === 'i-text') {
      (obj as IText).set('fill', c);
      fc.renderAll();
    }
  }, []);

  const setStrokeWidth = useCallback((w: number) => {
    widthRef.current = w;
    setStrokeWidthState(w);
    const fc = fabricRef.current;
    if (!fc) return;
    if ((toolRef.current === 'pen' || toolRef.current === 'eraser') && fc.freeDrawingBrush) {
      fc.freeDrawingBrush.width = toolRef.current === 'eraser' ? w * 3 : w;
    }
  }, []);

  const setFontSize = useCallback((s: number) => {
    fontSizeRef.current = s;
    setFontSizeState(s);
    const fc = fabricRef.current;
    if (!fc) return;
    const obj = fc.getActiveObject();
    if (obj?.type === 'i-text') {
      (obj as IText).set('fontSize', s);
      fc.renderAll();
    }
  }, []);

  // ---------- canvas init ----------

  useEffect(() => {
    const canvasEl = canvasElRef.current;
    const container = containerRef.current;
    if (!canvasEl || !container) return;

    const fc = new FabricCanvas(canvasEl, {
      width: container.clientWidth,
      height: container.clientHeight,
      backgroundColor: BG_COLOR,
      isDrawingMode: true,
      selection: false,
    });

    fc.freeDrawingBrush = new PencilBrush(fc);
    fc.freeDrawingBrush.color = colorRef.current;
    fc.freeDrawingBrush.width = widthRef.current;

    fabricRef.current = fc;

    // Save initial empty state
    saveSnapshot();

    // History on stroke / object changes
    fc.on('path:created', () => saveSnapshot());
    fc.on('object:modified', () => saveSnapshot());
    fc.on('object:removed', () => saveSnapshot());
    fc.on('object:added', (e) => {
      // 'path:created' fires after path objects, avoid double-save
      if (e.target?.type !== 'path') saveSnapshot();
    });

    // Click on empty canvas with text tool → add a new text box
    fc.on('mouse:down', (opt) => {
      if (toolRef.current !== 'text') return;
      // If a target was clicked (existing object), let Fabric handle it
      if (opt.target) return;

      const pointer = fc.getScenePoint(opt.e);
      const textBox = new IText('Tapez votre texte...', {
        left: pointer.x,
        top: pointer.y,
        fontSize: fontSizeRef.current,
        fill: colorRef.current,
        fontFamily: 'Arial',
        editable: true,
        selectable: true,
        hasControls: true,
        hasBorders: true,
        lockUniScaling: false,
      });

      fc.add(textBox);
      fc.setActiveObject(textBox);
      // Enter edit mode so the user can immediately type
      textBox.enterEditing();
      textBox.selectAll();
      fc.renderAll();
    });

    // ResizeObserver to keep canvas dimensions in sync with container
    const observer = new ResizeObserver(() => {
      if (!container || !fc) return;
      fc.setWidth(container.clientWidth);
      fc.setHeight(container.clientHeight);
      fc.renderAll();
    });
    observer.observe(container);

    return () => {
      observer.disconnect();
      fc.dispose();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- undo / redo ----------

  const undo = useCallback(async () => {
    if (historyIdxRef.current <= 0) return;
    historyIdxRef.current -= 1;
    await restoreSnapshot(historyRef.current[historyIdxRef.current]);
  }, [restoreSnapshot]);

  const redo = useCallback(async () => {
    if (historyIdxRef.current >= historyRef.current.length - 1) return;
    historyIdxRef.current += 1;
    await restoreSnapshot(historyRef.current[historyIdxRef.current]);
  }, [restoreSnapshot]);

  // ---------- clear ----------

  const clearCanvas = useCallback(() => {
    const fc = fabricRef.current;
    if (!fc) return;
    fc.clear();
    fc.backgroundColor = BG_COLOR;
    fc.renderAll();
    saveSnapshot();
  }, [saveSnapshot]);

  // ---------- image upload ----------

  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fc = fabricRef.current;
    if (!fc) return;

    const url = URL.createObjectURL(file);
    const img = await FabricImage.fromURL(url);

    // Scale down if image is larger than the canvas
    const maxW = fc.getWidth() * 0.6;
    const maxH = fc.getHeight() * 0.6;
    const imgW = img.width && img.width > 0 ? img.width : maxW;
    const imgH = img.height && img.height > 0 ? img.height : maxH;
    const scale = Math.min(1, maxW / imgW, maxH / imgH);
    img.scale(scale);

    img.set({
      left: (fc.getWidth() - imgW * scale) / 2,
      top: (fc.getHeight() - imgH * scale) / 2,
      selectable: true,
      hasControls: true,
      hasBorders: true,
    });

    fc.add(img);
    fc.setActiveObject(img);
    fc.renderAll();

    // Clean up object URL
    URL.revokeObjectURL(url);
    // Reset file input so the same file can be re-imported
    e.target.value = '';
  }, []);

  // ---------- delete selected ----------

  const deleteSelected = useCallback(() => {
    const fc = fabricRef.current;
    if (!fc) return;
    const active = fc.getActiveObjects();
    active.forEach((obj) => fc.remove(obj));
    fc.discardActiveObject();
    fc.renderAll();
  }, []);

  // ---------- keyboard shortcuts ----------

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const fc = fabricRef.current;
        if (!fc) return;
        // Don't delete while editing text
        const active = fc.getActiveObject() as IText | null;
        if (active?.isEditing) return;
        deleteSelected();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        void undo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
        e.preventDefault();
        void redo();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [undo, redo, deleteSelected]);

  // ---------- render ----------

  const colors = ['#ffffff', '#000000', '#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

  const toolButton = (t: Tool, icon: React.ReactNode, title: string) => (
    <Button
      variant={tool === t ? 'default' : 'outline'}
      size="sm"
      onClick={() => setTool(t)}
      className="p-1"
      title={title}
    >
      {icon}
    </Button>
  );

  return (
    <div className={`w-full h-full bg-gray-800 rounded flex flex-col ${className}`}>
      {/* Barre d'outils */}
      <div className="flex flex-wrap items-center gap-1 p-2 bg-gray-700 rounded-t shrink-0">

        {/* Outils de dessin / sélection */}
        {toolButton('select', <MousePointer size={14} />, 'Sélectionner / Déplacer')}
        {toolButton('pen', <Pen size={14} />, 'Stylo')}
        {toolButton('eraser', <Eraser size={14} />, 'Gomme')}
        {toolButton('text', <Type size={14} />, 'Zone de texte')}

        <div className="w-px h-4 bg-gray-500" />

        {/* Image */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          className="p-1"
          title="Insérer une image"
        >
          <ImageIcon size={14} />
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageUpload}
        />

        <div className="w-px h-4 bg-gray-500" />

        {/* Undo / Redo / Clear */}
        <Button variant="outline" size="sm" onClick={undo} disabled={!canUndo} className="p-1" title="Annuler (Ctrl+Z)">
          <Undo size={14} />
        </Button>
        <Button variant="outline" size="sm" onClick={redo} disabled={!canRedo} className="p-1" title="Rétablir (Ctrl+Y)">
          <Redo size={14} />
        </Button>
        <Button variant="outline" size="sm" onClick={clearCanvas} className="p-1 text-red-400 hover:text-red-300" title="Effacer tout">
          <Trash2 size={14} />
        </Button>

        <div className="w-px h-4 bg-gray-500" />

        {/* Couleurs */}
        <div className="flex gap-1">
          {colors.map(color => (
            <button
              key={color}
              title={color}
              className={`w-6 h-6 rounded border-2 transition-transform hover:scale-110 ${
                strokeColor === color ? 'border-white scale-110' : 'border-gray-500'
              }`}
              style={{ backgroundColor: color }}
              onClick={() => setStrokeColor(color)}
            />
          ))}
        </div>

        <div className="w-px h-4 bg-gray-500" />

        {/* Taille du pinceau / texte */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-300">
            {tool === 'text' ? 'Taille:' : 'Épaisseur:'}
          </span>
          {tool === 'text' ? (
            <>
              <input
                type="range"
                min="10"
                max="80"
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="w-16"
              />
              <span className="text-xs text-gray-300 w-6">{fontSize}</span>
            </>
          ) : (
            <>
              <input
                type="range"
                min="1"
                max="20"
                value={strokeWidth}
                onChange={(e) => setStrokeWidth(Number(e.target.value))}
                className="w-16"
              />
              <span className="text-xs text-gray-300 w-6">{strokeWidth}</span>
            </>
          )}
        </div>

        {/* Hint for text/select tool */}
        {tool === 'text' && (
          <span className="text-xs text-yellow-300 ml-2">Cliquez sur le tableau pour ajouter un texte</span>
        )}
        {tool === 'select' && (
          <span className="text-xs text-blue-300 ml-2">Cliquez sur un élément pour le sélectionner / déplacer</span>
        )}
      </div>

      {/* Zone de dessin */}
      <div ref={containerRef} className="flex-1 overflow-hidden">
        <canvas ref={canvasElRef} />
      </div>
    </div>
  );
};

export default Whiteboard;