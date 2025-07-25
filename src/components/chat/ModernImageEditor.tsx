
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Canvas as FabricCanvas, Circle, Rect, FabricImage, PencilBrush, FabricText } from 'fabric';
import { X, Download, Palette, Type, Square, Circle as CircleIcon, Minus, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface ModernImageEditorProps {
  imageUrl: string;
  onSave: (editedImageUrl: string) => void;
  onClose: () => void;
}

const ModernImageEditor: React.FC<ModernImageEditorProps> = ({
  imageUrl,
  onSave,
  onClose
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<FabricCanvas | null>(null);
  const [selectedColor, setSelectedColor] = useState('#ff0000');
  const [isLoading, setIsLoading] = useState(true);

  const colors = [
    '#ff0000', '#00ff00', '#0000ff', '#ffff00', 
    '#ff00ff', '#00ffff', '#000000', '#ffffff',
    '#orange', '#purple', '#pink', '#brown'
  ];

  const initializeCanvas = useCallback(async () => {
    if (!canvasRef.current || fabricCanvasRef.current) return;

    try {
      console.log('Initializing canvas...');
      
      // Créer un nouveau canvas Fabric
      const canvas = new FabricCanvas(canvasRef.current, {
        width: 800,
        height: 600,
        backgroundColor: 'white'
      });

      fabricCanvasRef.current = canvas;
      console.log('Canvas created successfully');

      // Charger l'image
      console.log('Loading image:', imageUrl);
      
      try {
        const img = await FabricImage.fromURL(imageUrl, { crossOrigin: 'anonymous' });
        console.log('Image loaded successfully');

        if (!canvas || !img) {
          console.error('Canvas or image is null');
          setIsLoading(false);
          return;
        }

        // Redimensionner l'image pour s'adapter au canvas
        const canvasWidth = canvas.getWidth();
        const canvasHeight = canvas.getHeight();
        const imgWidth = img.width || 1;
        const imgHeight = img.height || 1;

        const scale = Math.min(canvasWidth / imgWidth, canvasHeight / imgHeight);
        
        img.scale(scale);
        img.set({
          left: (canvasWidth - imgWidth * scale) / 2,
          top: (canvasHeight - imgHeight * scale) / 2,
          selectable: false,
          evented: false
        });

        canvas.add(img);
        canvas.renderAll();
        setIsLoading(false);
        console.log('Image added to canvas successfully');
        
      } catch (imageError) {
        console.error('Error loading image:', imageError);
        toast.error('Erreur lors du chargement de l\'image');
        setIsLoading(false);
      }

    } catch (error) {
      console.error('Error initializing canvas:', error);
      toast.error('Erreur lors de l\'initialisation de l\'éditeur');
      setIsLoading(false);
    }
  }, [imageUrl]);

  useEffect(() => {
    initializeCanvas();

    return () => {
      if (fabricCanvasRef.current) {
        try {
          fabricCanvasRef.current.dispose();
          fabricCanvasRef.current = null;
        } catch (error) {
          console.error('Error disposing canvas:', error);
        }
      }
    };
  }, [initializeCanvas]);

  const addText = () => {
    if (!fabricCanvasRef.current) return;

    try {
      const text = new FabricText('Texte', {
        left: 100,
        top: 100,
        fontFamily: 'Arial',
        fontSize: 20,
        fill: selectedColor
      });

      fabricCanvasRef.current.add(text);
      fabricCanvasRef.current.setActiveObject(text);
    } catch (error) {
      console.error('Error adding text:', error);
      toast.error('Erreur lors de l\'ajout du texte');
    }
  };

  const addRectangle = () => {
    if (!fabricCanvasRef.current) return;

    try {
      const rect = new Rect({
        left: 100,
        top: 100,
        width: 100,
        height: 60,
        fill: 'transparent',
        stroke: selectedColor,
        strokeWidth: 2
      });

      fabricCanvasRef.current.add(rect);
      fabricCanvasRef.current.setActiveObject(rect);
    } catch (error) {
      console.error('Error adding rectangle:', error);
      toast.error('Erreur lors de l\'ajout du rectangle');
    }
  };

  const addCircle = () => {
    if (!fabricCanvasRef.current) return;

    try {
      const circle = new Circle({
        left: 100,
        top: 100,
        radius: 50,
        fill: 'transparent',
        stroke: selectedColor,
        strokeWidth: 2
      });

      fabricCanvasRef.current.add(circle);
      fabricCanvasRef.current.setActiveObject(circle);
    } catch (error) {
      console.error('Error adding circle:', error);
      toast.error('Erreur lors de l\'ajout du cercle');
    }
  };

  const enableDrawing = () => {
    if (!fabricCanvasRef.current) return;

    try {
      fabricCanvasRef.current.isDrawingMode = !fabricCanvasRef.current.isDrawingMode;
      if (fabricCanvasRef.current.isDrawingMode) {
        const brush = new PencilBrush(fabricCanvasRef.current);
        brush.color = selectedColor;
        brush.width = 3;
        fabricCanvasRef.current.freeDrawingBrush = brush;
      }
    } catch (error) {
      console.error('Error enabling drawing:', error);
      toast.error('Erreur lors de l\'activation du dessin');
    }
  };

  const clearCanvas = () => {
    if (!fabricCanvasRef.current) return;

    try {
      const objects = fabricCanvasRef.current.getObjects();
      // Garder seulement l'image de fond (premier objet)
      const backgroundImage = objects[0];
      fabricCanvasRef.current.clear();
      if (backgroundImage) {
        fabricCanvasRef.current.add(backgroundImage);
      }
      fabricCanvasRef.current.renderAll();
    } catch (error) {
      console.error('Error clearing canvas:', error);
      toast.error('Erreur lors de l\'effacement');
    }
  };

  const handleSave = () => {
    if (!fabricCanvasRef.current) return;

    try {
      const dataURL = fabricCanvasRef.current.toDataURL({
        format: 'png',
        quality: 0.9,
        multiplier: 1
      });
      
      onSave(dataURL);
      toast.success('Image sauvegardée avec succès !');
    } catch (error) {
      console.error('Error saving image:', error);
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  const handleDownload = () => {
    if (!fabricCanvasRef.current) return;

    try {
      const dataURL = fabricCanvasRef.current.toDataURL({
        format: 'png',
        quality: 0.9,
        multiplier: 1
      });
      
      const link = document.createElement('a');
      link.download = 'image-editee.png';
      link.href = dataURL;
      link.click();
      
      toast.success('Image téléchargée !');
    } catch (error) {
      console.error('Error downloading image:', error);
      toast.error('Erreur lors du téléchargement');
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Chargement de l'éditeur...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">Éditeur d'image</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X size={20} />
          </Button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3 p-4 border-b bg-gray-50 flex-wrap">
          <div className="flex flex-col items-center gap-1">
            <Button variant="outline" size="sm" onClick={addText} title="Ajouter du texte">
              <Type size={16} />
            </Button>
            <span className="text-xs text-gray-600">Texte</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Button variant="outline" size="sm" onClick={addRectangle} title="Ajouter un rectangle">
              <Square size={16} />
            </Button>
            <span className="text-xs text-gray-600">Rectangle</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Button variant="outline" size="sm" onClick={addCircle} title="Ajouter un cercle">
              <CircleIcon size={16} />
            </Button>
            <span className="text-xs text-gray-600">Cercle</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Button variant="outline" size="sm" onClick={enableDrawing} title="Dessiner">
              <Minus size={16} />
            </Button>
            <span className="text-xs text-gray-600">Dessiner</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Button variant="outline" size="sm" onClick={clearCanvas} title="Effacer les annotations">
              <RotateCcw size={16} />
            </Button>
            <span className="text-xs text-gray-600">Effacer</span>
          </div>

          <div className="flex items-center gap-1 ml-4">
            <Palette size={16} className="text-gray-600" />
            {colors.map((color) => (
              <button
                key={color}
                className={`w-6 h-6 rounded border-2 ${
                  selectedColor === color ? 'border-gray-800' : 'border-gray-300'
                }`}
                style={{ backgroundColor: color }}
                onClick={() => setSelectedColor(color)}
                title={`Couleur ${color}`}
              />
            ))}
          </div>
        </div>

        {/* Canvas */}
        <div className="p-4 flex justify-center bg-gray-100" style={{ maxHeight: 'calc(90vh - 200px)', overflow: 'auto' }}>
          <canvas
            ref={canvasRef}
            className="border border-gray-300 bg-white shadow-lg"
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t">
          <Button variant="outline" onClick={handleDownload}>
            <Download size={16} className="mr-2" />
            Télécharger
          </Button>
          <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
            Sauvegarder
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ModernImageEditor;
