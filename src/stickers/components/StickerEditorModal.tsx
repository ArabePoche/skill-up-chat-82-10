/**
 * StickerEditorModal — éditeur canvas complet avant upload.
 * Outils : dessin libre, texte, gomme, choix de couleur/taille, suppression de fond.
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Toggle } from '@/components/ui/toggle';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Pen, Type, Eraser, Undo2, Trash2, Check, X, Loader2, Sparkles, ImageOff,
  MousePointer2,
} from 'lucide-react';
import { toast } from 'sonner';

/* ── types ── */
type Tool = 'select' | 'draw' | 'text' | 'eraser';

interface Props {
  file: File | null;
  onConfirm: (result: File) => void;
  onCancel: () => void;
  removeBg: (file: File) => Promise<File>;
}

/* ── palette ── */
const COLORS = [
  '#000000', '#ffffff', '#ef4444', '#f97316', '#eab308',
  '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4',
];

const MAX_CANVAS_WIDTH = 520;
const MAX_CANVAS_HEIGHT = 380;

const StickerEditorModal: React.FC<Props> = ({ file, onConfirm, onCancel, removeBg }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dialogContentRef = useRef<HTMLDivElement>(null);
  const fabricRef = useRef<any>(null);

  const [tool, setTool] = useState<Tool>('select');
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(6);
  const [bgRemoved, setBgRemoved] = useState(false);
  const [removingBg, setRemovingBg] = useState(false);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [noBgFile, setNoBgFile] = useState<File | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const historyRef = useRef<string[]>([]);
  const blockSave = useRef(false);

  /* ── init fabric canvas ── */
  useEffect(() => {
    if (!file || !canvasRef.current) return;

    let canvas: any;

    (async () => {
      const { Canvas, Image: FabricImage, PencilBrush } = await import('fabric');

      canvas = new Canvas(canvasRef.current!, {
        width: MAX_CANVAS_WIDTH,
        height: MAX_CANVAS_HEIGHT,
        backgroundColor: 'transparent',
        preserveObjectStacking: true,
        enableRetinaScaling: false,
      });
      fabricRef.current = canvas;
      canvas.__PencilBrush = PencilBrush;

      /* sauvegarde historique */
      const saveState = () => {
        if (blockSave.current) return;
        historyRef.current.push(canvas.toJSON());
      };
      canvas.on('object:added', saveState);
      canvas.on('object:modified', saveState);
      canvas.on('object:removed', saveState);

      /* charge l'image */
      const loadImage = (f: File) =>
        new Promise<void>((resolve, reject) => {
          const url = URL.createObjectURL(f);
          FabricImage.fromURL(url, { crossOrigin: 'anonymous' }, {}).then((img: any) => {
            const width = img.width || MAX_CANVAS_WIDTH;
            const height = img.height || MAX_CANVAS_HEIGHT;
            const scale = Math.min(MAX_CANVAS_WIDTH / width, MAX_CANVAS_HEIGHT / height, 1);
            const canvasWidth = Math.max(1, Math.round(width * scale));
            const canvasHeight = Math.max(1, Math.round(height * scale));

            canvas.setDimensions({
              width: canvasWidth,
              height: canvasHeight,
            });

            img.set({
              left: 0,
              top: 0,
              originX: 'left',
              originY: 'top',
              scaleX: scale,
              scaleY: scale,
              selectable: false,
              evented: false,
              erasable: true,
              name: '__bg__',
            });
            canvas.add(img);
            canvas.sendObjectToBack(img);
            canvas.renderAll();
            saveState();
            URL.revokeObjectURL(url);
            resolve();
          }).catch((error: unknown) => {
            URL.revokeObjectURL(url);
            reject(error);
          });
        });

      try {
        await loadImage(file);
        setOriginalFile(file);
      } catch (error) {
        toast.error("Impossible d'afficher l'image dans l'éditeur.");
        console.error('StickerEditorModal image load failed', error);
      }
    })();

    return () => {
      try { canvas?.dispose(); } catch (_) {}
    };
  }, [file]);

  /* ── sync outil → canvas ── */
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    const { PencilBrush } = canvas.__PencilBrush ? { PencilBrush: canvas.__PencilBrush } : { PencilBrush: null };

    if (tool === 'draw' || tool === 'eraser') {
      canvas.isDrawingMode = true;
      canvas.selection = false;
      if (PencilBrush) {
        const brush = new PencilBrush(canvas);
        brush.color = tool === 'eraser' ? '#000000' : color;
        brush.width = tool === 'eraser' ? brushSize * 3 : brushSize;
        if (tool === 'eraser') {
          const originalCreatePath = brush.createPath.bind(brush);
          brush.createPath = (pathData: string) => {
            const path = originalCreatePath(pathData);
            path.globalCompositeOperation = 'destination-out';
            return path;
          };
        }
        canvas.freeDrawingBrush = brush;
      }
    } else {
      canvas.isDrawingMode = false;
      canvas.selection = tool === 'select';
    }
  }, [tool, color, brushSize]);

  /* ── ajout texte au clic ── */
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas || tool !== 'text') return;

    const handleClick = async (opt: any) => {
      const { IText } = await import('fabric');
      const pointer = canvas.getPointer(opt.e);
      const text = new IText('Votre texte', {
        left: pointer.x,
        top: pointer.y,
        fontSize: 28,
        fill: color,
        fontFamily: 'Arial',
        fontWeight: 'bold',
        stroke: color === '#ffffff' ? '#000' : undefined,
        strokeWidth: color === '#ffffff' ? 0.5 : 0,
        editable: true,
        hiddenTextareaContainer: dialogContentRef.current,
      });
      canvas.add(text);
      canvas.setActiveObject(text);
      canvas.renderAll();
      requestAnimationFrame(() => {
        text.enterEditing(opt.e);
        text.selectAll();
      });
    };

    canvas.on('mouse:down', handleClick);
    return () => canvas.off('mouse:down', handleClick);
  }, [tool, color]);

  /* ── suppression de fond ── */
  const handleToggleBg = useCallback(async () => {
    const canvas = fabricRef.current;
    if (!canvas || !originalFile) return;

    if (bgRemoved) {
      /* remettre original */
      setBgRemoved(false);
      const { Image: FabricImage } = await import('fabric');
      const url = URL.createObjectURL(originalFile);
      FabricImage.fromURL(url, { crossOrigin: 'anonymous' }, {}).then((img: any) => {
        const width = img.width || MAX_CANVAS_WIDTH;
        const height = img.height || MAX_CANVAS_HEIGHT;
        const scale = Math.min(MAX_CANVAS_WIDTH / width, MAX_CANVAS_HEIGHT / height, 1);
        const canvasWidth = Math.max(1, Math.round(width * scale));
        const canvasHeight = Math.max(1, Math.round(height * scale));
        canvas.setDimensions({
          width: canvasWidth,
          height: canvasHeight,
        });
        img.set({ left: 0, top: 0, originX: 'left', originY: 'top', scaleX: scale, scaleY: scale, selectable: false, evented: false, erasable: true, name: '__bg__' });
        canvas.getObjects().filter((o: any) => o.name === '__bg__').forEach((o: any) => canvas.remove(o));
        canvas.add(img);
        canvas.sendObjectToBack(img);
        canvas.renderAll();
        URL.revokeObjectURL(url);
      });
      return;
    }

    /* supprimer le fond */
    setRemovingBg(true);
    try {
      let processed = noBgFile;
      if (!processed) {
        processed = await removeBg(originalFile);
        setNoBgFile(processed);
      }

      const { Image: FabricImage } = await import('fabric');
      const url = URL.createObjectURL(processed);
      FabricImage.fromURL(url, { crossOrigin: 'anonymous' }, {}).then((img: any) => {
        const width = img.width || MAX_CANVAS_WIDTH;
        const height = img.height || MAX_CANVAS_HEIGHT;
        const scale = Math.min(MAX_CANVAS_WIDTH / width, MAX_CANVAS_HEIGHT / height, 1);
        const canvasWidth = Math.max(1, Math.round(width * scale));
        const canvasHeight = Math.max(1, Math.round(height * scale));
        canvas.setDimensions({
          width: canvasWidth,
          height: canvasHeight,
        });
        img.set({ left: 0, top: 0, originX: 'left', originY: 'top', scaleX: scale, scaleY: scale, selectable: false, evented: false, erasable: true, name: '__bg__' });
        canvas.getObjects().filter((o: any) => o.name === '__bg__').forEach((o: any) => canvas.remove(o));
        canvas.add(img);
        canvas.sendObjectToBack(img);
        canvas.renderAll();
        URL.revokeObjectURL(url);
      });
      setBgRemoved(true);
    } catch (err: any) {
      toast.error('Suppression de fond échouée: ' + (err?.message ?? 'erreur'));
    } finally {
      setRemovingBg(false);
    }
  }, [bgRemoved, originalFile, noBgFile, removeBg]);

  /* ── annuler dernière action ── */
  const handleUndo = useCallback(async () => {
    const canvas = fabricRef.current;
    if (!canvas || historyRef.current.length <= 1) return;
    historyRef.current.pop();
    const prev = historyRef.current[historyRef.current.length - 1];
    if (!prev) return;
    blockSave.current = true;
    await new Promise<void>((res) => canvas.loadFromJSON(prev, () => { canvas.renderAll(); res(); }));
    blockSave.current = false;
  }, []);

  /* ── tout effacer (dessins seulement) ── */
  const handleClear = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    canvas.getObjects().filter((o: any) => o.name !== '__bg__').forEach((o: any) => canvas.remove(o));
    canvas.renderAll();
  }, []);

  /* ── exporter & confirmer ── */
  const handleConfirm = useCallback(async () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    setIsExporting(true);
    try {
      /* désélectionner pour ne pas exporter le cadre de sélection */
      canvas.discardActiveObject();
      canvas.renderAll();

      const dataUrl = canvas.toDataURL({ format: 'png', quality: 1, multiplier: 1 });
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const outFile = new File([blob], (file?.name ?? 'sticker').replace(/\.[^.]+$/, '.png'), { type: 'image/png' });
      onConfirm(outFile);
    } catch (err: any) {
      toast.error('Export échoué: ' + (err?.message ?? ''));
    } finally {
      setIsExporting(false);
    }
  }, [file, onConfirm]);

  if (!file) return null;

  return (
    <Dialog open onOpenChange={(o) => !o && onCancel()}>
        <DialogContent ref={dialogContentRef} className="max-w-[600px] p-0 gap-0 overflow-hidden rounded-2xl">
        <DialogHeader className="px-5 pt-5 pb-3 border-b bg-slate-50">
          <DialogTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-500" />
            Éditeur de sticker — {file.name}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-0">
          {/* ── barre d'outils ── */}
          <div className="flex items-center gap-2 px-4 py-2.5 bg-white border-b flex-wrap">
            <TooltipProvider delayDuration={300}>

              {/* outils */}
              {([
                { id: 'select', icon: MousePointer2, label: 'Sélectionner' },
                { id: 'draw',   icon: Pen,           label: 'Dessin libre' },
                { id: 'text',   icon: Type,           label: 'Texte' },
                { id: 'eraser', icon: Eraser,         label: 'Gomme' },
              ] as { id: Tool; icon: any; label: string }[]).map(({ id, icon: Icon, label }) => (
                <Tooltip key={id}>
                  <TooltipTrigger asChild>
                    <Toggle
                      size="sm"
                      pressed={tool === id}
                      onPressedChange={() => setTool(id)}
                      className="h-8 w-8 p-0 data-[state=on]:bg-violet-100 data-[state=on]:text-violet-700"
                    >
                      <Icon className="h-4 w-4" />
                    </Toggle>
                  </TooltipTrigger>
                  <TooltipContent>{label}</TooltipContent>
                </Tooltip>
              ))}

              <div className="w-px h-6 bg-slate-200 mx-1" />

              {/* palette de couleurs */}
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  title={c}
                  className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${color === c ? 'border-violet-500 scale-110' : 'border-slate-200'}`}
                  style={{ backgroundColor: c }}
                />
              ))}

              {/* couleur custom */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <label className="w-6 h-6 rounded-full border-2 border-dashed border-slate-300 cursor-pointer flex items-center justify-center hover:border-violet-400 overflow-hidden" title="Couleur personnalisée">
                    <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="opacity-0 absolute w-0 h-0" />
                    <div className="w-full h-full rounded-full" style={{ backgroundColor: color }} />
                  </label>
                </TooltipTrigger>
                <TooltipContent>Couleur personnalisée</TooltipContent>
              </Tooltip>

              <div className="w-px h-6 bg-slate-200 mx-1" />

              {/* taille pinceau */}
              <div className="flex items-center gap-2 w-24">
                <span className="text-xs text-slate-500 shrink-0">Taille</span>
                <Slider
                  min={1} max={40} step={1}
                  value={[brushSize]}
                  onValueChange={([v]) => setBrushSize(v)}
                  className="flex-1"
                />
              </div>

              <div className="w-px h-6 bg-slate-200 mx-1" />

              {/* undo / clear */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleUndo}>
                    <Undo2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Annuler</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50" onClick={handleClear}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Effacer les dessins</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* ── canvas ── */}
          <div
            className="flex items-center justify-center bg-[image:repeating-conic-gradient(#e5e7eb_0%_25%,white_0%_50%)] bg-[length:16px_16px] relative"
            style={{ height: 380 }}
          >
            <canvas
              ref={canvasRef}
              style={{ display: 'block', touchAction: 'none' }}
            />
            {removingBg && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm gap-3">
                <Loader2 className="h-8 w-8 text-white animate-spin" />
                <p className="text-white text-sm font-medium">Suppression du fond en cours…</p>
              </div>
            )}
          </div>

          {/* ── footer ── */}
          <div className="flex items-center justify-between gap-3 px-4 py-3 bg-slate-50 border-t">
            {/* toggle fond */}
            <button
              onClick={handleToggleBg}
              disabled={removingBg}
              className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium border transition-colors ${
                bgRemoved
                  ? 'bg-violet-100 border-violet-300 text-violet-700'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-violet-300'
              }`}
            >
              {removingBg ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : bgRemoved ? (
                <Sparkles className="h-4 w-4" />
              ) : (
                <ImageOff className="h-4 w-4" />
              )}
              {bgRemoved ? 'Fond supprimé ✓' : 'Supprimer le fond'}
            </button>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="rounded-xl" onClick={onCancel} disabled={isExporting}>
                <X className="h-4 w-4 mr-1" /> Annuler
              </Button>
              <Button size="sm" className="rounded-xl bg-violet-600 hover:bg-violet-700 text-white" onClick={handleConfirm} disabled={isExporting || removingBg}>
                {isExporting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
                Ajouter au pack
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StickerEditorModal;
