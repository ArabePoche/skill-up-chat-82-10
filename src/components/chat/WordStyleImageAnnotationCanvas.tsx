
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Canvas as FabricCanvas, Circle, Rect, FabricImage, PencilBrush, FabricText } from 'fabric';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import ImprovedCanvasImageLoader from './ImprovedCanvasImageLoader';
import CanvasHeader from './CanvasHeader';
import CompactAnnotationToolbar from './CompactAnnotationToolbar';
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

interface WordStyleImageAnnotationCanvasProps {
  imageUrl: string;
  fileName: string;
  messageId: string;
  isTeacher: boolean;
  isSaving: boolean;
  onSaveAnnotations: (annotatedImageUrl: string) => void;
  onClose?: () => void;
}

type Tool = 'select' | 'draw' | 'highlight' | 'text' | 'note' | 'circle' | 'rectangle' | 'crop' | 'rotate';

const WordStyleImageAnnotationCanvas: React.FC<WordStyleImageAnnotationCanvasProps> = ({
  imageUrl,
  fileName,
  messageId,
  isTeacher,
  isSaving,
  onSaveAnnotations,
  onClose
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
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
  const [rotation, setRotation] = useState(0);

  const calculateOptimalDimensions = (img: HTMLImageElement) => {
    const maxWidth = Math.min(window.innerWidth - 80, 1200);
    const maxHeight = Math.min(window.innerHeight - 400, 700); // Plus d'espace pour la barre d'outils
    
    const scale = Math.min(
      maxWidth / img.width,
      maxHeight / img.height,
      1
    );
    
    return {
      width: Math.floor(img.width * scale),
      height: Math.floor(img.height * scale),
      scale
    };
  };

  const handleImageLoad = useCallback((img: HTMLImageElement) => {
    if (!canvasRef.current) return;

    const { width, height, scale } = calculateOptimalDimensions(img);
    setCanvasDimensions({ width, height });

    if (fabricCanvas) {
      fabricCanvas.dispose();
      setFabricCanvas(null);
    }

    const canvasElement = canvasRef.current;
    canvasElement.removeAttribute('class');
    canvasElement.style.cssText = '';

    const canvas = new FabricCanvas(canvasRef.current, {
      width,
      height,
      backgroundColor: '#ffffff',
    });

    FabricImage.fromObject({
      src: img.src,
      scaleX: scale,
      scaleY: scale,
      selectable: false,
      evented: false,
      angle: rotation
    }).then((fabricImg) => {
      canvas.backgroundImage = fabricImg;
      canvas.renderAll();
      setImageLoaded(true);
      setImageLoadError(false);
      toast.success('Image chargée et prête pour annotation! 🎨');
    }).catch((error) => {
      console.error('Error creating Fabric image:', error);
      setImageLoadError(true);
      toast.error('Erreur lors de la création de l\'image');
    });

    setFabricCanvas(canvas);
  }, [rotation, fabricCanvas]);

  const handleImageError = (error: string) => {
    setImageLoadError(true);
    toast.error(error);
  };

  useEffect(() => {
    return () => {
      if (fabricCanvas) {
        fabricCanvas.dispose();
        setFabricCanvas(null);
      }
    };
  }, []);

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

    const handleTextDoubleClick = (event: any) => {
      const activeObject = fabricCanvas.getActiveObject();
      if (activeObject && (activeObject.type === 'textbox' || activeObject.type === 'text')) {
        (activeObject as any).set('editable', true);
        fabricCanvas.renderAll();
        toast.info('Mode édition activé - tapez votre texte');
      }
    };

    if (activeTool === 'note' || activeTool === 'text') {
      fabricCanvas.on('mouse:down', handleCanvasClick);
    } else {
      fabricCanvas.off('mouse:down', handleCanvasClick);
    }

    fabricCanvas.on('mouse:dblclick', handleTextDoubleClick);

    return () => {
      fabricCanvas.off('mouse:down', handleCanvasClick);
      fabricCanvas.off('mouse:dblclick', handleTextDoubleClick);
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
    }
  };

  const handleRotate = () => {
    if (!fabricCanvas || !fabricCanvas.backgroundImage) return;

    const newRotation = (rotation + 90) % 360;
    setRotation(newRotation);
    
    fabricCanvas.backgroundImage.set('angle', newRotation);
    fabricCanvas.renderAll();
    toast.success(`Image rotée de 90°`);
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
    
    fabricCanvas.clear();
    
    if (imageLoaded) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const { scale } = calculateOptimalDimensions(img);
        FabricImage.fromObject({
          src: img.src,
          scaleX: scale,
          scaleY: scale,
          selectable: false,
          evented: false,
          angle: rotation
        }).then((fabricImg) => {
          fabricCanvas.backgroundImage = fabricImg;
          fabricCanvas.renderAll();
        });
      };
      img.src = imageUrl;
    }
    
    setNotes([]);
    toast.success('Canvas nettoyé!');
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
      // Forcer le rendu avant de générer le dataURL
      fabricCanvas.renderAll();
      
      const dataURL = fabricCanvas.toDataURL({
        format: 'png',
        quality: 1,
        multiplier: 2
      });
      
      console.log('Generated dataURL length:', dataURL.length);
      
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

  const handleCrop = () => {
    if (!fabricCanvas) return;
    
    const activeObject = fabricCanvas.getActiveObject();
    if (!activeObject) {
      toast.info('Sélectionnez d\'abord un élément à rogner');
      return;
    }
    
    try {
      const boundingRect = activeObject.getBoundingRect();
      const croppedCanvas = document.createElement('canvas');
      croppedCanvas.width = boundingRect.width;
      croppedCanvas.height = boundingRect.height;
      
      const ctx = croppedCanvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(
          fabricCanvas.getElement(),
          boundingRect.left,
          boundingRect.top,
          boundingRect.width,
          boundingRect.height,
          0,
          0,
          boundingRect.width,
          boundingRect.height
        );
        
        toast.success('Élément rogné! Utilisez Télécharger pour sauvegarder');
      }
    } catch (error) {
      console.error('Error cropping:', error);
      toast.error('Erreur lors du rognage');
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <CanvasHeader fileName={fileName} onClose={onClose} />
      
      {/* Conteneur scrollable pour l'image */}
      <div className="flex-1 overflow-y-auto">
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
                className="border border-gray-300 shadow-xl rounded-lg bg-white max-w-full"
                style={{
                  display: imageLoaded ? 'block' : 'none',
                  touchAction: 'none'
                }}
              />
            </div>
          </div>
        </ScrollArea>
      </div>

      {isAddingNote && (
        <div className="fixed top-0 right-0 w-80 h-full bg-white shadow-2xl z-40 border-l">
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
      
      <CompactAnnotationToolbar
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
        onSave={handleSave}
        onDownloadImage={handleDownloadImage}
        onDownloadPDF={handleDownloadPDF}
        onCrop={handleCrop}
        onRotate={handleRotate}
        isSaving={isSaving}
      />
    </div>
  );
};

export default WordStyleImageAnnotationCanvas;
