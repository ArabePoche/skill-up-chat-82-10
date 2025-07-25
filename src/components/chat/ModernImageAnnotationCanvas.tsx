import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Canvas as FabricCanvas, Circle, Rect, FabricImage, PencilBrush, FabricText, Point } from 'fabric';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import ImprovedCanvasImageLoader from './ImprovedCanvasImageLoader';
import ModernCanvasHeader from './ModernCanvasHeader';
import ModernAnnotationToolbar from './ModernAnnotationToolbar';
import ResponsiveAnnotationNotes from './ResponsiveAnnotationNotes';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Note {
  id: string;
  x: number;
  y: number;
  text: string;
  author: string;
  timestamp: string;
}

interface ModernImageAnnotationCanvasProps {
  imageUrl: string;
  fileName: string;
  messageId: string;
  isTeacher: boolean;
  isSaving: boolean;
  onSaveAnnotations: (annotatedImageUrl: string) => void;
  onClose?: () => void;
}

type Tool = 'select' | 'draw' | 'highlight' | 'text' | 'note' | 'circle' | 'rectangle' | 'arrow' | 'crop';

const ModernImageAnnotationCanvas: React.FC<ModernImageAnnotationCanvasProps> = ({
  imageUrl,
  fileName,
  messageId,
  isTeacher,
  isSaving,
  onSaveAnnotations,
  onClose
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [activeTool, setActiveTool] = useState<Tool>('select');
  const [activeColor, setActiveColor] = useState('#ff0000');
  const [brushSize, setBrushSize] = useState(3);
  const [fontSize, setFontSize] = useState(24);
  const [notes, setNotes] = useState<Note[]>([]);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [notePosition, setNotePosition] = useState<{ x: number; y: number } | null>(null);
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 800, height: 600 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageLoadError, setImageLoadError] = useState(false);
  const [zoom, setZoom] = useState(1);

  const calculateOptimalDimensions = (img: HTMLImageElement) => {
    const containerWidth = containerRef.current?.clientWidth || window.innerWidth - 100;
    const containerHeight = window.innerHeight - 300;
    
    const scale = Math.min(
      (containerWidth - 50) / img.width,
      (containerHeight - 50) / img.height,
      2 // Maximum scale pour éviter les images trop grandes
    );
    
    return {
      width: Math.floor(img.width * scale),
      height: Math.floor(img.height * scale),
      scale
    };
  };

  const handleImageLoad = useCallback((img: HTMLImageElement) => {
    if (!canvasRef.current || !containerRef.current) return;

    const { width, height, scale } = calculateOptimalDimensions(img);
    setCanvasDimensions({ width, height });

    if (fabricCanvas) {
      fabricCanvas.dispose();
      setFabricCanvas(null);
    }

    const canvas = new FabricCanvas(canvasRef.current, {
      width,
      height,
      backgroundColor: '#ffffff',
    });

    // Activer le zoom avec la molette
    canvas.on('mouse:wheel', (opt) => {
      const delta = opt.e.deltaY;
      let zoom = canvas.getZoom();
      zoom *= 0.999 ** delta;
      if (zoom > 5) zoom = 5;
      if (zoom < 0.1) zoom = 0.1;
      canvas.zoomToPoint(new Point(opt.e.offsetX, opt.e.offsetY), zoom);
      setZoom(zoom);
      opt.e.preventDefault();
      opt.e.stopPropagation();
    });

    // Activer le pan avec la molette du milieu ou Ctrl+glisser
    canvas.on('mouse:down', (opt) => {
      const evt = opt.e;
      const isMiddleButton = 'button' in evt && evt.button === 1;
      const isCtrlClick = evt.ctrlKey;
      
      if (isMiddleButton || isCtrlClick) {
        (canvas as any).isDragging = true;
        canvas.selection = false;
        (canvas as any).lastPosX = 'clientX' in evt ? evt.clientX : evt.touches?.[0]?.clientX || 0;
        (canvas as any).lastPosY = 'clientY' in evt ? evt.clientY : evt.touches?.[0]?.clientY || 0;
      }
    });

    canvas.on('mouse:move', (opt) => {
      if ((canvas as any).isDragging) {
        const e = opt.e;
        const vpt = canvas.viewportTransform!;
        const clientX = 'clientX' in e ? e.clientX : e.touches?.[0]?.clientX || 0;
        const clientY = 'clientY' in e ? e.clientY : e.touches?.[0]?.clientY || 0;
        
        vpt[4] += clientX - (canvas as any).lastPosX;
        vpt[5] += clientY - (canvas as any).lastPosY;
        canvas.requestRenderAll();
        (canvas as any).lastPosX = clientX;
        (canvas as any).lastPosY = clientY;
      }
    });

    canvas.on('mouse:up', () => {
      canvas.setViewportTransform(canvas.viewportTransform!);
      (canvas as any).isDragging = false;
      canvas.selection = true;
    });

    FabricImage.fromObject({
      src: img.src,
      scaleX: scale,
      scaleY: scale,
      selectable: false,
      evented: false
    }).then((fabricImg) => {
      canvas.backgroundImage = fabricImg;
      canvas.renderAll();
      setImageLoaded(true);
      setImageLoadError(false);
      toast.success('Image chargée! Utilisez Ctrl+molette pour zoomer et Ctrl+glisser pour naviguer 🎨');
    }).catch((error) => {
      console.error('Error creating Fabric image:', error);
      setImageLoadError(true);
      toast.error('Erreur lors de la création de l\'image');
    });

    setFabricCanvas(canvas);
  }, [fabricCanvas]);

  const handleImageError = (error: string) => {
    setImageLoadError(true);
    toast.error(error);
  };

  // Nettoyage
  useEffect(() => {
    return () => {
      if (fabricCanvas) {
        fabricCanvas.dispose();
        setFabricCanvas(null);
      }
    };
  }, []);

  // Gestion des outils
  useEffect(() => {
    if (!fabricCanvas) return;

    fabricCanvas.isDrawingMode = activeTool === 'draw' || activeTool === 'highlight';
    
    if (fabricCanvas.isDrawingMode) {
      const brush = new PencilBrush(fabricCanvas);
      brush.color = activeTool === 'highlight' ? 
        `${activeColor}80` : activeColor;
      brush.width = activeTool === 'highlight' ? 
        brushSize * 2 : brushSize;
      
      fabricCanvas.freeDrawingBrush = brush;
    }

    const handleCanvasClick = (event: any) => {
      const pointer = fabricCanvas.getPointer(event.e);
      
      if (activeTool === 'note') {
        setNotePosition({ x: pointer.x, y: pointer.y });
        setIsAddingNote(true);
      } else if (activeTool === 'text') {
        const text = new FabricText('Cliquez pour modifier', {
          left: pointer.x,
          top: pointer.y,
          fontSize: fontSize,
          fill: activeColor,
          editable: true,
        });
        
        fabricCanvas.add(text);
        fabricCanvas.setActiveObject(text);
        toast.info('Double-cliquez sur le texte pour le modifier');
      }
    };

    if (activeTool === 'note' || activeTool === 'text') {
      fabricCanvas.on('mouse:down', handleCanvasClick);
    } else {
      fabricCanvas.off('mouse:down', handleCanvasClick);
    }

    return () => {
      fabricCanvas.off('mouse:down', handleCanvasClick);
    };
  }, [activeTool, activeColor, brushSize, fontSize, fabricCanvas]);

  const handleToolChange = (tool: Tool) => {
    setActiveTool(tool);
    
    if (!fabricCanvas) return;

    if (tool === 'circle') {
      const circle = new Circle({
        left: 100,
        top: 100,
        radius: 30,
        fill: 'transparent',
        stroke: activeColor,
        strokeWidth: 2,
      });
      fabricCanvas.add(circle);
    } else if (tool === 'rectangle') {
      const rect = new Rect({
        left: 100,
        top: 100,
        width: 100,
        height: 60,
        fill: 'transparent',
        stroke: activeColor,
        strokeWidth: 2,
      });
      fabricCanvas.add(rect);
    } else if (tool === 'crop') {
      toast.info('Sélectionnez la zone à rogner, puis cliquez sur Actions > Rogner');
    }
  };

  const handleRotate = () => {
    if (!fabricCanvas || !fabricCanvas.backgroundImage) return;

    const currentAngle = fabricCanvas.backgroundImage.get('angle') || 0;
    const newAngle = (currentAngle + 90) % 360;
    
    fabricCanvas.backgroundImage.set('angle', newAngle);
    fabricCanvas.renderAll();
    toast.success(`Image rotée de 90° (${newAngle}°)`);
  };

  const handleCrop = () => {
    if (!fabricCanvas) return;
    
    const activeObject = fabricCanvas.getActiveObject();
    if (!activeObject) {
      toast.info('Veuillez d\'abord sélectionner la zone à rogner');
      return;
    }
    
    try {
      const boundingRect = activeObject.getBoundingRect();
      
      // Créer un nouveau canvas avec les dimensions de la zone sélectionnée
      const croppedCanvas = document.createElement('canvas');
      croppedCanvas.width = boundingRect.width;
      croppedCanvas.height = boundingRect.height;
      
      const ctx = croppedCanvas.getContext('2d');
      if (ctx) {
        const canvasElement = fabricCanvas.getElement();
        ctx.drawImage(
          canvasElement,
          boundingRect.left,
          boundingRect.top,
          boundingRect.width,
          boundingRect.height,
          0,
          0,
          boundingRect.width,
          boundingRect.height
        );
        
        // Remplacer le contenu du canvas principal
        const dataURL = croppedCanvas.toDataURL();
        const img = new Image();
        img.onload = () => {
          fabricCanvas.clear();
          FabricImage.fromObject({
            src: dataURL,
            selectable: false,
            evented: false
          }).then((fabricImg) => {
            fabricCanvas.backgroundImage = fabricImg;
            fabricCanvas.setDimensions({
              width: boundingRect.width,
              height: boundingRect.height
            });
            fabricCanvas.renderAll();
            toast.success('Image rognée avec succès!');
          });
        };
        img.src = dataURL;
      }
    } catch (error) {
      console.error('Error cropping:', error);
      toast.error('Erreur lors du rognage');
    }
  };

  const handleUndo = () => {
    if (!fabricCanvas) return;
    
    const objects = fabricCanvas.getObjects();
    if (objects.length > 0) {
      fabricCanvas.remove(objects[objects.length - 1]);
      fabricCanvas.renderAll();
      toast.success('Dernière action annulée');
    }
  };

  const handleClear = () => {
    if (!fabricCanvas) return;
    
    // Garder seulement l'image de fond
    const objects = fabricCanvas.getObjects();
    objects.forEach(obj => fabricCanvas.remove(obj));
    
    setNotes([]);
    fabricCanvas.renderAll();
    toast.success('Annotations effacées!');
  };

  const handleAddNote = (text: string) => {
    if (!notePosition) return;

    const newNote: Note = {
      id: Date.now().toString(),
      x: notePosition.x,
      y: notePosition.y,
      text,
      author: isTeacher ? 'Professeur' : 'Élève',
      timestamp: new Date().toLocaleString()
    };

    setNotes(prev => [...prev, newNote]);
    
    if (fabricCanvas) {
      const marker = new Circle({
        left: notePosition.x - 8,
        top: notePosition.y - 8,
        radius: 8,
        fill: '#ff6b35',
        stroke: '#ffffff',
        strokeWidth: 2,
        selectable: false,
        evented: false
      });
      fabricCanvas.add(marker);
    }

    setIsAddingNote(false);
    setNotePosition(null);
    toast.success('Note ajoutée avec succès!');
  };

  const handleSave = async () => {
    if (!fabricCanvas) {
      toast.error('Canvas non initialisé');
      return;
    }

    try {
      fabricCanvas.renderAll();
      
      const dataURL = fabricCanvas.toDataURL({
        format: 'png',
        quality: 1,
        multiplier: 2
      });
      
      if (!dataURL || dataURL === 'data:,') {
        throw new Error('Impossible de générer l\'image');
      }
      
      await onSaveAnnotations(dataURL);
      toast.success('Annotations sauvegardées avec succès! ✅');
    } catch (error) {
      console.error('Error saving annotations:', error);
      toast.error('Erreur lors de la sauvegarde des annotations');
    }
  };

  const handleDownloadImage = () => {
    if (!fabricCanvas) {
      toast.error('Canvas non disponible');
      return;
    }

    try {
      fabricCanvas.renderAll();
      
      const dataURL = fabricCanvas.toDataURL({
        format: 'png',
        quality: 1,
        multiplier: 2
      });

      if (!dataURL || dataURL === 'data:,') {
        throw new Error('Impossible de générer l\'image');
      }

      const link = document.createElement('a');
      link.download = `annotated_${fileName.replace(/\.[^/.]+$/, '')}.png`;
      link.href = dataURL;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Image téléchargée avec succès! 📥');
    } catch (error) {
      console.error('Error downloading image:', error);
      toast.error('Erreur lors du téléchargement de l\'image');
    }
  };

  const handleDownloadPDF = () => {
    if (!fabricCanvas) {
      toast.error('Canvas non disponible');
      return;
    }

    try {
      fabricCanvas.renderAll();
      
      const dataURL = fabricCanvas.toDataURL({
        format: 'png',
        quality: 1,
        multiplier: 1
      });

      if (!dataURL || dataURL === 'data:,') {
        throw new Error('Impossible de générer l\'image');
      }

      const pdf = new jsPDF({
        orientation: fabricCanvas.width! > fabricCanvas.height! ? 'landscape' : 'portrait',
        unit: 'px',
        format: [fabricCanvas.width!, fabricCanvas.height!]
      });
      
      const imgWidth = pdf.internal.pageSize.getWidth();
      const imgHeight = pdf.internal.pageSize.getHeight();
      
      pdf.addImage(dataURL, 'PNG', 0, 0, imgWidth, imgHeight);
      
      if (notes.length > 0) {
        pdf.addPage();
        pdf.setFontSize(16);
        pdf.text('Notes d\'annotation:', 20, 30);
        
        let yPosition = 50;
        pdf.setFontSize(12);
        
        notes.forEach((note, index) => {
          const lines = pdf.splitTextToSize(`${index + 1}. ${note.text}`, imgWidth - 40);
          pdf.text(lines, 20, yPosition);
          yPosition += lines.length * 15 + 5;
          
          pdf.setFontSize(10);
          pdf.text(`   - ${note.author}, ${note.timestamp}`, 20, yPosition);
          yPosition += 20;
          pdf.setFontSize(12);
        });
      }
      
      pdf.save(`annotated_${fileName.replace(/\.[^/.]+$/, '')}.pdf`);
      toast.success('PDF téléchargé avec succès! 📄');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Erreur lors du téléchargement du PDF');
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <ModernCanvasHeader
        onSave={handleSave}
        onDownloadImage={handleDownloadImage}
        onDownloadPDF={handleDownloadPDF}
        onClose={onClose}
        isSaving={isSaving}
      />
      
      <ModernAnnotationToolbar
        activeTool={activeTool}
        activeColor={activeColor}
        brushSize={brushSize}
        fontSize={fontSize}
        onToolChange={handleToolChange}
        onColorChange={setActiveColor}
        onBrushSizeChange={setBrushSize}
        onFontSizeChange={setFontSize}
        onUndo={handleUndo}
        onClear={handleClear}
        onRotate={handleRotate}
        onCrop={handleCrop}
      />
      
      <div className="flex-1 flex overflow-hidden">
        <div ref={containerRef} className="flex-1">
          <ScrollArea className="w-full h-full">
            <div className="flex items-center justify-center min-h-full p-4">
              <div className="relative">
                {(!imageLoaded && !imageLoadError) && (
                  <ImprovedCanvasImageLoader
                    imageUrl={imageUrl}
                    fileName={fileName}
                    onImageLoad={handleImageLoad}
                    onError={handleImageError}
                  />
                )}
                
                {imageLoadError && (
                  <div className="flex items-center justify-center p-8">
                    <ImprovedCanvasImageLoader
                      imageUrl={imageUrl}
                      fileName={fileName}
                      onImageLoad={handleImageLoad}
                      onError={handleImageError}
                    />
                  </div>
                )}
                
                <canvas 
                  ref={canvasRef} 
                  className="border border-gray-300 shadow-xl rounded-lg bg-white cursor-crosshair"
                  style={{
                    display: imageLoaded ? 'block' : 'none',
                    touchAction: 'none'
                  }}
                />

                {imageLoaded && (
                  <div className="absolute top-2 right-2 bg-black/60 text-white px-2 py-1 rounded text-xs">
                    Zoom: {Math.round(zoom * 100)}%
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        </div>

        {isAddingNote && (
          <div className="w-80 bg-white shadow-2xl border-l">
            <ResponsiveAnnotationNotes
              notes={notes}
              isAddingNote={isAddingNote}
              onAddNote={handleAddNote}
              onCancelNote={() => {
                setIsAddingNote(false);
                setNotePosition(null);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ModernImageAnnotationCanvas;
