import React, { useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import type { LiveTeachingStudioDocumentHighlightStroke } from '@/live/types';

interface DocumentHighlightOverlayProps {
  strokes: LiveTeachingStudioDocumentHighlightStroke[];
  isHost: boolean;
  isActive: boolean;
  onAddStroke?: (stroke: LiveTeachingStudioDocumentHighlightStroke) => void;
}

const buildHighlightPath = (points: LiveTeachingStudioDocumentHighlightStroke['points']) => {
  if (!points.length) {
    return '';
  }

  if (points.length === 1) {
    const point = points[0];
    return `M ${point.x * 100} ${point.y * 100} L ${(point.x * 100) + 0.01} ${(point.y * 100) + 0.01}`;
  }

  return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x * 100} ${point.y * 100}`).join(' ');
};

const DocumentHighlightOverlay: React.FC<DocumentHighlightOverlayProps> = ({ strokes, isHost, isActive, onAddStroke }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const draftStrokeRef = useRef<LiveTeachingStudioDocumentHighlightStroke | null>(null);
  const [draftStroke, setDraftStroke] = useState<LiveTeachingStudioDocumentHighlightStroke | null>(null);

  const getPoint = (event: React.PointerEvent<HTMLDivElement>) => {
    const bounds = containerRef.current?.getBoundingClientRect();
    if (!bounds || !bounds.width || !bounds.height) {
      return null;
    }

    return {
      x: Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width)),
      y: Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height)),
    };
  };

  const startStroke = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isHost || !isActive) {
      return;
    }

    const point = getPoint(event);
    if (!point) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);

    const nextStroke: LiveTeachingStudioDocumentHighlightStroke = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      color: 'rgba(250, 204, 21, 0.42)',
      strokeWidth: 18,
      points: [point],
    };

    draftStrokeRef.current = nextStroke;
    setDraftStroke(nextStroke);
  };

  const moveStroke = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!draftStrokeRef.current || !isHost || !isActive) {
      return;
    }

    const point = getPoint(event);
    if (!point) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const current = draftStrokeRef.current;
    const lastPoint = current.points[current.points.length - 1];
    if (lastPoint && Math.abs(lastPoint.x - point.x) < 0.002 && Math.abs(lastPoint.y - point.y) < 0.002) {
      return;
    }

    const nextStroke = {
      ...current,
      points: [...current.points, point],
    };

    draftStrokeRef.current = nextStroke;
    setDraftStroke(nextStroke);
  };

  const endStroke = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!draftStrokeRef.current || !isHost || !isActive) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    const finalizedStroke = draftStrokeRef.current;
    draftStrokeRef.current = null;
    setDraftStroke(null);

    if (finalizedStroke.points.length) {
      onAddStroke?.(finalizedStroke);
    }
  };

  const allStrokes = draftStroke ? [...strokes, draftStroke] : strokes;

  return (
    <div
      ref={containerRef}
      className={cn('absolute inset-0 z-20', isHost && isActive ? 'pointer-events-auto cursor-crosshair' : 'pointer-events-none')}
      onPointerDown={startStroke}
      onPointerMove={moveStroke}
      onPointerUp={endStroke}
      onPointerCancel={endStroke}
      onPointerLeave={endStroke}
    >
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
        {allStrokes.map((stroke) => (
          <path
            key={stroke.id}
            d={buildHighlightPath(stroke.points)}
            fill="none"
            stroke={stroke.color}
            strokeWidth={stroke.strokeWidth / 10}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </svg>
    </div>
  );
};

export default DocumentHighlightOverlay;