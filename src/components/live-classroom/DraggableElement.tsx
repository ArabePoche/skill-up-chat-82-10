// Composant d'élément déplaçable pour la scène
import React, { useState, useRef, useCallback } from 'react';
import { Move, Eye, EyeOff, X, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SceneElement } from './hooks/useSceneControl';

interface DraggableElementProps {
  element: SceneElement;
  onUpdate: (updates: Partial<SceneElement>) => void;
  onRemove: () => void;
  isSelected?: boolean;
  onSelect?: () => void;
  children: React.ReactNode;
}

const DraggableElement: React.FC<DraggableElementProps> = ({
  element,
  onUpdate,
  onRemove,
  isSelected,
  onSelect,
  children
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const elementRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target === elementRef.current || (e.target as HTMLElement).closest('.drag-handle')) {
      e.preventDefault();
      setIsDragging(true);
      setDragStart({
        x: e.clientX - element.position.x,
        y: e.clientY - element.position.y
      });
      onSelect?.();
    }
  }, [element.position, onSelect]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      const newPosition = {
        x: Math.max(0, e.clientX - dragStart.x),
        y: Math.max(0, e.clientY - dragStart.y)
      };
      onUpdate({ position: newPosition });
    }
  }, [isDragging, dragStart, onUpdate]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
  }, []);

  const handleResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    onSelect?.();
  }, [onSelect]);

  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (isResizing && elementRef.current) {
      const rect = elementRef.current.getBoundingClientRect();
      const newSize = {
        width: Math.max(100, e.clientX - rect.left),
        height: Math.max(100, e.clientY - rect.top)
      };
      onUpdate({ size: newSize });
    }
  }, [isResizing, onUpdate]);

  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, handleMouseMove, handleResizeMove, handleMouseUp]);

  return (
    <div
      ref={elementRef}
      className={`absolute border-2 transition-all duration-200 ${
        isSelected 
          ? 'border-blue-500 shadow-lg shadow-blue-500/25' 
          : 'border-gray-500 hover:border-gray-400'
      } ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      style={{
        left: element.position.x,
        top: element.position.y,
        width: element.size.width,
        height: element.size.height,
        display: element.visible ? 'block' : 'none'
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Barre de contrôle */}
      {isSelected && (
        <div className="absolute -top-8 left-0 flex items-center space-x-1 bg-gray-800 px-2 py-1 rounded text-xs">
          <div className="drag-handle cursor-move text-gray-300 hover:text-white">
            <Move size={12} />
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onUpdate({ visible: !element.visible })}
            className="p-1 h-auto text-gray-300 hover:text-white"
          >
            {element.visible ? <Eye size={12} /> : <EyeOff size={12} />}
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="p-1 h-auto text-red-400 hover:text-red-300"
          >
            <X size={12} />
          </Button>
        </div>
      )}

      {/* Contenu de l'élément */}
      <div className="w-full h-full overflow-hidden">
        {children}
      </div>

      {/* Poignée de redimensionnement */}
      {isSelected && (
        <div 
          className="absolute bottom-0 right-0 w-3 h-3 bg-blue-500 cursor-nw-resize"
          onMouseDown={handleResize}
        />
      )}
    </div>
  );
};

export default DraggableElement;