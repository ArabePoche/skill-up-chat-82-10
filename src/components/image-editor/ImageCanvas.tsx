import React, { forwardRef, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface ImageCanvasProps {
  imageUrl: string;
  activeTool: string;
  className?: string;
  onStartDrawing?: (e: MouseEvent | TouchEvent) => void;
  onDraw?: (e: MouseEvent | TouchEvent) => void;
  onStopDrawing?: () => void;
  onToolChange?: (tool: string) => void;
}

const ImageCanvas = forwardRef<HTMLCanvasElement, ImageCanvasProps>(
  ({ imageUrl, activeTool, className, onStartDrawing, onDraw, onStopDrawing, onToolChange }, ref) => {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
      const canvas = ref as React.RefObject<HTMLCanvasElement>;
      if (!canvas?.current) return;

      setIsLoading(true);
      setError(null);

      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        const ctx = canvas.current?.getContext('2d');
        if (!ctx || !canvas.current) return;

        // Set canvas size to image size
        canvas.current.width = img.width;
        canvas.current.height = img.height;
        
        // Draw the image
        ctx.drawImage(img, 0, 0);
        setIsLoading(false);
      };

      img.onerror = () => {
        setError('Erreur lors du chargement de l\'image');
        setIsLoading(false);
      };

      img.src = imageUrl;
    }, [imageUrl, ref]);

    // Gestion des événements de dessin
    useEffect(() => {
      const canvas = ref as React.RefObject<HTMLCanvasElement>;
      if (!canvas?.current) return;

      onToolChange?.(activeTool);

      const handleMouseDown = (e: MouseEvent) => {
        e.preventDefault();
        onStartDrawing?.(e);
      };

      const handleMouseMove = (e: MouseEvent) => {
        e.preventDefault();
        onDraw?.(e);
      };

      const handleMouseUp = (e: MouseEvent) => {
        e.preventDefault();
        onStopDrawing?.();
      };

      const handleTouchStart = (e: TouchEvent) => {
        e.preventDefault();
        onStartDrawing?.(e);
      };

      const handleTouchMove = (e: TouchEvent) => {
        e.preventDefault();
        onDraw?.(e);
      };

      const handleTouchEnd = (e: TouchEvent) => {
        e.preventDefault();
        onStopDrawing?.();
      };

      const canvasElement = canvas.current;
      
      // Event listeners pour souris
      canvasElement.addEventListener('mousedown', handleMouseDown);
      canvasElement.addEventListener('mousemove', handleMouseMove);
      canvasElement.addEventListener('mouseup', handleMouseUp);
      canvasElement.addEventListener('mouseleave', handleMouseUp);

      // Event listeners pour touch
      canvasElement.addEventListener('touchstart', handleTouchStart);
      canvasElement.addEventListener('touchmove', handleTouchMove);
      canvasElement.addEventListener('touchend', handleTouchEnd);
      canvasElement.addEventListener('touchcancel', handleTouchEnd);

      return () => {
        canvasElement.removeEventListener('mousedown', handleMouseDown);
        canvasElement.removeEventListener('mousemove', handleMouseMove);
        canvasElement.removeEventListener('mouseup', handleMouseUp);
        canvasElement.removeEventListener('mouseleave', handleMouseUp);
        canvasElement.removeEventListener('touchstart', handleTouchStart);
        canvasElement.removeEventListener('touchmove', handleTouchMove);
        canvasElement.removeEventListener('touchend', handleTouchEnd);
        canvasElement.removeEventListener('touchcancel', handleTouchEnd);
      };
    }, [activeTool, onStartDrawing, onDraw, onStopDrawing, onToolChange, ref]);

    const getCursorStyle = () => {
      switch (activeTool) {
        case 'pencil':
        case 'highlighter':
          return 'crosshair';
        case 'eraser':
          return 'grab';
        case 'bucket':
          return 'pointer';
        default:
          return 'default';
      }
    };

    if (error) {
      return (
        <div className={cn("flex items-center justify-center bg-muted", className)}>
          <div className="text-center">
            <p className="text-destructive">{error}</p>
          </div>
        </div>
      );
    }

    return (
      <div className={cn("flex items-center justify-center bg-muted p-4 overflow-auto", className)}>
        {isLoading && (
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">Chargement...</span>
          </div>
        )}
        
        <canvas
          ref={ref}
          className={cn(
            "max-w-full max-h-full border border-border shadow-lg bg-background",
            !isLoading && "block"
          )}
          style={{ 
            cursor: getCursorStyle(),
            display: isLoading ? 'none' : 'block'
          }}
        />
      </div>
    );
  }
);

ImageCanvas.displayName = 'ImageCanvas';

export default ImageCanvas;