
import React, { useRef, useState, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ResponsiveCanvasContainerProps {
  children: React.ReactNode;
  canvasWidth: number;
  canvasHeight: number;
}

const ResponsiveCanvasContainer: React.FC<ResponsiveCanvasContainerProps> = ({
  children,
  canvasWidth,
  canvasHeight
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerSize({
          width: rect.width,
          height: Math.min(window.innerHeight * 0.6, rect.height)
        });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const needsScroll = canvasWidth > containerSize.width || canvasHeight > containerSize.height;

  if (needsScroll) {
    return (
      <div 
        ref={containerRef}
        className="flex-1 bg-gray-50 max-h-[60vh] md:max-h-[70vh]"
      >
        <ScrollArea className="h-full w-full">
          <div 
            className="flex items-center justify-center p-4"
            style={{ 
              minWidth: canvasWidth + 32,
              minHeight: canvasHeight + 32
            }}
          >
            {children}
          </div>
        </ScrollArea>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="flex-1 flex items-center justify-center p-4 bg-gray-50 max-h-[60vh] md:max-h-[70vh] overflow-hidden"
    >
      {children}
    </div>
  );
};

export default ResponsiveCanvasContainer;
