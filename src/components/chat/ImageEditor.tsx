
import React, { useEffect, useRef, useState } from 'react';
import { Canvas as FabricCanvas, Circle, Rect, FabricImage, PencilBrush, FabricText } from 'fabric';
import ResponsiveAnnotationToolbar from './ResponsiveAnnotationToolbar';
import ResponsiveAnnotationNotes from './ResponsiveAnnotationNotes';
import { toast } from 'sonner';
import jsPDF from 'jspdf';

interface Note {
  id: string;
  x: number;
  y: number;
  text: string;
  author: string;
  timestamp: string;
}

interface ImageEditorProps {
  imageUrl: string;
  fileName: string;
  messageId: string;
  isTeacher: boolean;
  isSaving: boolean;
  onSaveAnnotations: (annotatedImageUrl: string) => void;
}

type Tool = 'select' | 'draw' | 'highlight' | 'text' | 'note' | 'circle' | 'rectangle';

const ImageEditor: React.FC<ImageEditorProps> = ({
  imageUrl,
  fileName,
  messageId,
  isTeacher,
  isSaving,
  onSaveAnnotations
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

  const calculateResponsiveDimensions = () => {
    if (!containerRef.current) return { width: 800, height: 600 };
    
    const container = containerRef.current;
    const containerWidth = container.clientWidth - 40; // padding
    const containerHeight = window.innerHeight * 0.6; // 60vh on mobile
    
    // On mobile, use full container width
    if (window.innerWidth < 768) {
      return {
        width: Math.min(containerWidth, 400),
        height: Math.min(containerHeight, 300)
      };
    }
    
    // On desktop, allow larger sizes
    return {
      width: Math.min(containerWidth, 800),
      height: Math.min(containerHeight, 600)
    };
  };

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const dimensions = calculateResponsiveDimensions();
    setCanvasDimensions(dimensions);

    const canvas = new FabricCanvas(canvasRef.current, {
      width: dimensions.width,
      height: dimensions.height,
      backgroundColor: '#ffffff',
    });

    // Load image with responsive scaling
    FabricImage.fromURL(imageUrl, { crossOrigin: 'anonymous' })
      .then((img) => {
        const scale = Math.min(
          dimensions.width / img.width!, 
          dimensions.height / img.height!
        );
        
        // Update canvas size to match scaled image
        const scaledWidth = img.width! * scale;
        const scaledHeight = img.height! * scale;
        
        canvas.setDimensions({
          width: scaledWidth,
          height: scaledHeight
        });

        img.set({
          scaleX: scale,
          scaleY: scale,
          selectable: false,
          evented: false
        });
        
        canvas.backgroundImage = img;
        canvas.renderAll();
        
        toast.success('Image chargée, vous pouvez commencer à annoter !');
      })
      .catch((error) => {
        console.error('Error loading image:', error);
        toast.error('Erreur lors du chargement de l\'image');
      });

    setFabricCanvas(canvas);

    // Handle window resize
    const handleResize = () => {
      if (canvas && canvas.backgroundImage) {
        const newDimensions = calculateResponsiveDimensions();
        const img = canvas.backgroundImage as FabricImage;
        const scale = Math.min(
          newDimensions.width / img.width!, 
          newDimensions.height / img.height!
        );
        
        const scaledWidth = img.width! * scale;
        const scaledHeight = img.height! * scale;
        
        canvas.setDimensions({
          width: scaledWidth,
          height: scaledHeight
        });
        
        img.set({
          scaleX: scale,
          scaleY: scale
        });
        
        canvas.renderAll();
        setCanvasDimensions({ width: scaledWidth, height: scaledHeight });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      canvas.dispose();
    };
  }, [imageUrl]);

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
        const text = new FabricText('Tapez votre texte...', {
          left: pointer.x,
          top: pointer.y,
          fontSize: fontSize,
          fill: activeColor,
        });
        fabricCanvas.add(text);
        fabricCanvas.setActiveObject(text);
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
    }
  };

  const handleUndo = () => {
    if (!fabricCanvas) return;
    
    const objects = fabricCanvas.getObjects();
    if (objects.length > 0) {
      fabricCanvas.remove(objects[objects.length - 1]);
      fabricCanvas.renderAll();
    }
  };

  const handleClear = () => {
    if (!fabricCanvas) return;
    
    fabricCanvas.clear();
    
    FabricImage.fromURL(imageUrl, { crossOrigin: 'anonymous' })
      .then((img) => {
        const scale = Math.min(
          canvasDimensions.width / img.width!, 
          canvasDimensions.height / img.height!
        );
        
        img.set({
          scaleX: scale,
          scaleY: scale,
          selectable: false,
          evented: false
        });
        
        fabricCanvas.backgroundImage = img;
        fabricCanvas.renderAll();
      });
    
    setNotes([]);
    toast.success('Annotations effacées');
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
    toast.success('Note ajoutée');
  };

  const handleSave = async () => {
    if (!fabricCanvas) return;

    try {
      const dataURL = fabricCanvas.toDataURL({
        format: 'png',
        quality: 1,
        multiplier: 1
      });
      
      await onSaveAnnotations(dataURL);
      toast.success('Annotations sauvegardées');
    } catch (error) {
      console.error('Error saving annotations:', error);
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  const handleDownloadImage = () => {
    if (!fabricCanvas) return;

    const dataURL = fabricCanvas.toDataURL({
      format: 'png',
      quality: 1,
      multiplier: 1
    });

    const link = document.createElement('a');
    link.download = `annotated_${fileName}`;
    link.href = dataURL;
    link.click();
    
    toast.success('Image téléchargée');
  };

  const handleDownloadPDF = () => {
    if (!fabricCanvas) return;

    const dataURL = fabricCanvas.toDataURL({
      format: 'png',
      quality: 1,
      multiplier: 1
    });

    const pdf = new jsPDF();
    const imgWidth = 190;
    const imgHeight = (fabricCanvas.height! * imgWidth) / fabricCanvas.width!;
    
    pdf.addImage(dataURL, 'PNG', 10, 10, imgWidth, imgHeight);
    
    if (notes.length > 0) {
      pdf.addPage();
      pdf.setFontSize(16);
      pdf.text('Notes d\'annotation:', 10, 20);
      
      let yPosition = 40;
      pdf.setFontSize(12);
      
      notes.forEach((note, index) => {
        pdf.text(`${index + 1}. ${note.text}`, 10, yPosition);
        pdf.text(`   - ${note.author}, ${note.timestamp}`, 10, yPosition + 5);
        yPosition += 15;
      });
    }
    
    pdf.save(`annotated_${fileName}.pdf`);
    toast.success('PDF téléchargé');
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <ResponsiveAnnotationToolbar
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
        isSaving={isSaving}
      />
      
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        <div 
          ref={containerRef}
          className="flex-1 flex items-center justify-center p-4 bg-gray-50 overflow-auto"
        >
          <div className="flex items-center justify-center">
            <canvas 
              ref={canvasRef} 
              className="border border-gray-300 shadow-lg rounded-lg bg-white max-w-full max-h-full"
              style={{
                touchAction: 'none', // Prevent scrolling on touch devices
                width: canvasDimensions.width,
                height: canvasDimensions.height
              }}
            />
          </div>
        </div>
        
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
    </div>
  );
};

export default ImageEditor;
