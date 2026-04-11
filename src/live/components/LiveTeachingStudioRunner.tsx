import React, { useRef, useEffect, useState } from 'react';
import { BookOpen, FileText, Download, Play, Pause, X, Minus, PanelBottomOpen, GripHorizontal, NotebookPen, Maximize } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import LiveStudioWhiteboard from '@/live/components/studio-live/LiveStudioWhiteboard';
import StudioDocumentViewer from '@/live/components/studio-live/StudioDocumentViewer';
import StudioNotesPanel from '@/live/components/studio-live/StudioNotesPanel';
import type { WhiteboardHistoryAction, WhiteboardSyncedAction } from '@/live/lib/liveWhiteboard';
import type { LiveTeachingStudio, LiveTeachingStudioDocumentHighlightStroke, LiveTeachingStudioElement, LiveTeachingStudioElementWindowState } from '@/live/types';

export interface LiveTeachingStudioRunnerProps {
  studio: LiveTeachingStudio;
  isHost: boolean;
  onSceneChange?: (sceneId: string) => void;
  onStudioChange?: (studio: LiveTeachingStudio) => void;
  onWhiteboardAction?: (action: WhiteboardSyncedAction) => void;
  remoteWhiteboardAction?: WhiteboardSyncedAction | null;
  remoteWhiteboardHistories?: Record<string, WhiteboardHistoryAction[]>;
}

interface StudioWindowLayout {
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  minimized: boolean;
}

interface WindowInteractionState {
  elementId: string;
  mode: 'move' | 'resize';
  startX: number;
  startY: number;
  startLayout: StudioWindowLayout;
}

export const LiveTeachingStudioRunner: React.FC<LiveTeachingStudioRunnerProps> = ({ studio, isHost, onSceneChange, onStudioChange, onWhiteboardAction, remoteWhiteboardAction, remoteWhiteboardHistories = {} }) => {
  const activeScene = studio.scenes.find((s) => s.id === studio.activeSceneId) || studio.scenes[0];
  const desktopRef = useRef<HTMLDivElement>(null);
  const nextZIndexRef = useRef(4);
  const [windowLayouts, setWindowLayouts] = useState<Record<string, StudioWindowLayout>>({});
  const [interaction, setInteraction] = useState<WindowInteractionState | null>(null);
  const [activeDocumentHighlighterId, setActiveDocumentHighlighterId] = useState<string | null>(null);
  const [documentHighlightRedoMap, setDocumentHighlightRedoMap] = useState<Record<string, LiveTeachingStudioDocumentHighlightStroke[]>>({});

  const createDefaultLayout = (element: LiveTeachingStudioElement, index: number): StudioWindowLayout => {
    if (element.window_state) {
      return {
        x: element.window_state.x,
        y: element.window_state.y,
        width: element.window_state.width,
        height: element.window_state.height,
        zIndex: element.window_state.zIndex,
        minimized: element.window_state.minimized,
      };
    }

    if (element.type === 'whiteboard') {
      return { x: 2, y: 4, width: 66, height: 78, zIndex: 2, minimized: false };
    }

    if (element.type === 'notes') {
      return { x: 70, y: 8 + index * 3, width: 28, height: 38, zIndex: 3 + index, minimized: false };
    }

    return { x: 64, y: 48, width: 34, height: 34, zIndex: 3 + index, minimized: false };
  };

  const publishWindowLayouts = (layoutMap: Record<string, StudioWindowLayout>) => {
    if (!isHost || !onStudioChange) {
      return;
    }

    const nextStudio: LiveTeachingStudio = {
      ...studio,
      scenes: studio.scenes.map((scene) => ({
        ...scene,
        elements: scene.elements.map((element) => ({
          ...element,
          window_state: layoutMap[element.id]
            ? {
                x: layoutMap[element.id].x,
                y: layoutMap[element.id].y,
                width: layoutMap[element.id].width,
                height: layoutMap[element.id].height,
                zIndex: layoutMap[element.id].zIndex,
                minimized: layoutMap[element.id].minimized,
              }
            : element.window_state || null,
        })),
      })),
    };

    onStudioChange(nextStudio);
  };

  const updateStudioElement = (elementId: string, updates: Partial<LiveTeachingStudioElement>) => {
    if (!isHost || !onStudioChange) {
      return;
    }

    const nextStudio: LiveTeachingStudio = {
      ...studio,
      scenes: studio.scenes.map((scene) => ({
        ...scene,
        elements: scene.elements.map((element) => (
          element.id === elementId ? { ...element, ...updates } : element
        )),
      })),
    };

    onStudioChange(nextStudio);
  };

  useEffect(() => {
    if (!activeScene) {
      return;
    }

    nextZIndexRef.current = Math.max(activeScene.elements.length + 4, 6);
    setWindowLayouts((current) => {
      const nextLayouts: Record<string, StudioWindowLayout> = {};

      activeScene.elements.forEach((element, index) => {
        nextLayouts[element.id] = createDefaultLayout(element, index);
      });

      return nextLayouts;
    });
  }, [activeScene]);

  useEffect(() => {
    if (!activeDocumentHighlighterId) {
      return;
    }

    const activeDocument = activeScene?.elements.find((element) => element.id === activeDocumentHighlighterId && element.type === 'document');
    if (!activeDocument) {
      setActiveDocumentHighlighterId(null);
    }
  }, [activeDocumentHighlighterId, activeScene]);

  useEffect(() => {
    setDocumentHighlightRedoMap((current) => {
      const activeDocumentIds = new Set(
        studio.scenes.flatMap((scene) => scene.elements.filter((element) => element.type === 'document').map((element) => element.id))
      );

      return Object.fromEntries(Object.entries(current).filter(([elementId]) => activeDocumentIds.has(elementId)));
    });
  }, [studio]);

  useEffect(() => {
    if (!interaction) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const desktop = desktopRef.current;
      if (!desktop) {
        return;
      }

      const bounds = desktop.getBoundingClientRect();
      if (!bounds.width || !bounds.height) {
        return;
      }

      const deltaX = ((event.clientX - interaction.startX) / bounds.width) * 100;
      const deltaY = ((event.clientY - interaction.startY) / bounds.height) * 100;

      setWindowLayouts((current) => {
        const target = current[interaction.elementId];
        if (!target) {
          return current;
        }

        const nextLayout = { ...target };

        if (interaction.mode === 'move') {
          nextLayout.x = Math.max(0, Math.min(100 - nextLayout.width, interaction.startLayout.x + deltaX));
          nextLayout.y = Math.max(0, Math.min(90 - nextLayout.height, interaction.startLayout.y + deltaY));
        } else {
          nextLayout.width = Math.max(20, Math.min(100 - interaction.startLayout.x, interaction.startLayout.width + deltaX));
          nextLayout.height = Math.max(18, Math.min(90 - interaction.startLayout.y, interaction.startLayout.height + deltaY));
        }

        const nextMap = {
          ...current,
          [interaction.elementId]: nextLayout,
        };

        publishWindowLayouts(nextMap);
        return nextMap;
      });
    };

    const handlePointerUp = () => {
      setInteraction(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [interaction]);

  const focusWindow = (elementId: string) => {
    setWindowLayouts((current) => {
      const target = current[elementId];
      if (!target) {
        return current;
      }

      const nextZIndex = nextZIndexRef.current + 1;
      nextZIndexRef.current = nextZIndex;

      const nextMap = {
        ...current,
        [elementId]: {
          ...target,
          zIndex: nextZIndex,
          minimized: false,
        },
      };

      publishWindowLayouts(nextMap);
      return nextMap;
    });
  };

  const minimizeWindow = (elementId: string) => {
    setWindowLayouts((current) => {
      const target = current[elementId];
      if (!target) {
        return current;
      }

      const nextMap = {
        ...current,
        [elementId]: {
          ...target,
          minimized: true,
        },
      };

      publishWindowLayouts(nextMap);
      return nextMap;
    });
  };

  const startWindowInteraction = (
    event: React.PointerEvent<HTMLDivElement>,
    elementId: string,
    mode: 'move' | 'resize'
  ) => {
    if (!isHost) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const layout = windowLayouts[elementId];
    if (!layout) {
      return;
    }

    focusWindow(elementId);
    setInteraction({
      elementId,
      mode,
      startX: event.clientX,
      startY: event.clientY,
      startLayout: layout,
    });
  };

  const getElementIcon = (type: LiveTeachingStudio['scenes'][number]['elements'][number]['type']) => {
    if (type === 'whiteboard') return NotebookPen;
    if (type === 'notes') return BookOpen;
    return FileText;
  };

  const updateDocumentZoom = (element: LiveTeachingStudioElement, nextZoom: number) => {
    updateStudioElement(element.id, {
      document_zoom: Math.max(0.75, Math.min(2.5, Number(nextZoom.toFixed(2)))),
    });
  };

  const pushDocumentHighlight = (element: LiveTeachingStudioElement, stroke: LiveTeachingStudioDocumentHighlightStroke) => {
    const currentHighlights = element.document_highlights || [];
    updateStudioElement(element.id, { document_highlights: [...currentHighlights, stroke] });
    setDocumentHighlightRedoMap((current) => ({
      ...current,
      [element.id]: [],
    }));
  };

  const undoDocumentHighlight = (element: LiveTeachingStudioElement) => {
    const currentHighlights = element.document_highlights || [];
    if (!currentHighlights.length) {
      return;
    }

    const removedStroke = currentHighlights[currentHighlights.length - 1];
    updateStudioElement(element.id, { document_highlights: currentHighlights.slice(0, -1) });
    setDocumentHighlightRedoMap((current) => ({
      ...current,
      [element.id]: [...(current[element.id] || []), removedStroke],
    }));
  };

  const redoDocumentHighlight = (element: LiveTeachingStudioElement) => {
    const redoHighlights = documentHighlightRedoMap[element.id] || [];
    const strokeToRestore = redoHighlights[redoHighlights.length - 1];
    if (!strokeToRestore) {
      return;
    }

    const currentHighlights = element.document_highlights || [];
    updateStudioElement(element.id, { document_highlights: [...currentHighlights, strokeToRestore] });
    setDocumentHighlightRedoMap((current) => ({
      ...current,
      [element.id]: redoHighlights.slice(0, -1),
    }));
  };

  const clearDocumentHighlights = (element: LiveTeachingStudioElement) => {
    updateStudioElement(element.id, { document_highlights: [] });
    setDocumentHighlightRedoMap((current) => ({
      ...current,
      [element.id]: [],
    }));
  };

  const renderSceneElement = (element: LiveTeachingStudio['scenes'][number]['elements'][number]) => {
    if (element.type === 'whiteboard') {
      const boardId = `${activeScene.id}:${element.id}`;

      return (
        <LiveStudioWhiteboard
          boardId={boardId}
          isHost={isHost}
          onWhiteboardAction={onWhiteboardAction}
          remoteWhiteboardAction={remoteWhiteboardAction}
          historySnapshot={remoteWhiteboardHistories[boardId] || []}
        />
      );
    }

    if (element.type === 'document' && element.document_url) {
      const redoHighlights = documentHighlightRedoMap[element.id] || [];
      const isHighlightMode = activeDocumentHighlighterId === element.id;

      return (
        <StudioDocumentViewer
          element={element}
          isHost={isHost}
          isHighlightMode={isHighlightMode}
          redoHighlights={redoHighlights}
          onToggleHighlightMode={() => setActiveDocumentHighlighterId((current) => current === element.id ? null : element.id)}
          onZoomChange={(nextZoom) => updateDocumentZoom(element, nextZoom)}
          onAddStroke={(stroke) => pushDocumentHighlight(element, stroke)}
          onUndoHighlight={() => undoDocumentHighlight(element)}
          onRedoHighlight={() => redoDocumentHighlight(element)}
          onClearHighlights={() => clearDocumentHighlights(element)}
        />
      );
    }

    if (element.type === 'document') {
      return <StudioDocumentViewer element={element} isHost={isHost} isHighlightMode={false} redoHighlights={[]} onToggleHighlightMode={() => {}} onZoomChange={() => {}} onAddStroke={() => {}} onUndoHighlight={() => {}} onRedoHighlight={() => {}} onClearHighlights={() => {}} />;
    }

    if (element.type === 'notes') {
      return <StudioNotesPanel element={element} />;
    }

    return null;
  };

  if (!activeScene || activeScene.elements.length === 0) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center rounded-2xl bg-zinc-950 p-8 text-center text-zinc-500">
        <Maximize className="mb-4 h-12 w-12 opacity-50" />
        <h3 className="text-xl font-bold text-zinc-300">Studio Vide</h3>
        <p className="mt-2 text-sm max-w-md">L'enseignant n'a pas encore configuré cette scène de classe.</p>
        {isHost && studio.scenes.length > 1 && (
          <div className="mt-4 flex flex-wrap gap-2 justify-center">
            {studio.scenes.map(s => (
              <Button key={s.id} variant="outline" size="sm" onClick={() => onSceneChange?.(s.id)}>{s.name}</Button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-[1.5rem] bg-zinc-950">
      {isHost && (
      <div className="flex items-center justify-between gap-4 border-b border-white/10 bg-zinc-950/95 px-4 py-3 backdrop-blur-md">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500">Studio live</p>
          <h2 className="truncate text-lg font-bold text-white">{studio.title || 'Teaching Studio'}</h2>
        </div>
        <div className="flex flex-1 items-center justify-end gap-2 overflow-x-auto">
          {studio.scenes.map((scene, index) => (
            <Button
              key={scene.id}
              variant="ghost"
              size="sm"
              onClick={() => onSceneChange?.(scene.id)}
              className={cn(
                'h-10 rounded-xl border px-4 text-sm font-semibold whitespace-nowrap',
                scene.id === activeScene.id
                  ? 'border-sky-400/40 bg-sky-500/15 text-sky-200'
                  : 'border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white'
              )}
            >
              <span className="mr-2 text-[10px] uppercase tracking-[0.2em] text-zinc-500">S{index + 1}</span>
              {scene.name}
            </Button>
          ))}
        </div>
      </div>
      )}

      <div ref={desktopRef} className="relative flex-1 overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.12),transparent_28%),linear-gradient(180deg,rgba(24,24,27,0.96),rgba(9,9,11,1))] p-3 md:p-4">
        <div className="pointer-events-none absolute inset-0 opacity-[0.08]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        {activeScene.elements.map((element) => {
          const layout = windowLayouts[element.id] || createDefaultLayout(element, 0);
          const Icon = getElementIcon(element.type);

          if (layout.minimized) {
            return null;
          }

          return (
            <div
              key={element.id}
              className="absolute overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/90 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl"
              style={{
                left: `${layout.x}%`,
                top: `${layout.y}%`,
                width: `${layout.width}%`,
                height: `${layout.height}%`,
                zIndex: layout.zIndex,
              }}
              onPointerDownCapture={() => focusWindow(element.id)}
            >
              <div
                className={cn(
                  'flex h-12 items-center justify-between border-b border-white/10 px-4',
                  isHost ? 'cursor-grab active:cursor-grabbing' : ''
                )}
                onPointerDown={(event) => startWindowInteraction(event, element.id, 'move')}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/8 text-zinc-200">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">{element.title}</p>
                    <p className="truncate text-[11px] uppercase tracking-[0.2em] text-zinc-500">{element.type}</p>
                  </div>
                </div>
                {isHost && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white"
                    onClick={(event) => {
                      event.stopPropagation();
                      minimizeWindow(element.id);
                    }}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="h-[calc(100%-3rem)] w-full">{renderSceneElement(element)}</div>

              {isHost && (
                <div
                  className="absolute bottom-2 right-2 flex h-6 w-6 cursor-se-resize items-center justify-center rounded bg-white/10 text-zinc-300"
                  onPointerDown={(event) => startWindowInteraction(event, element.id, 'resize')}
                >
                  <GripHorizontal className="h-3.5 w-3.5 rotate-45" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {isHost && (
      <div className="flex items-center gap-2 overflow-x-auto border-t border-white/10 bg-zinc-950/95 px-3 py-3 backdrop-blur-md">
        {activeScene.elements.map((element) => {
          const layout = windowLayouts[element.id] || createDefaultLayout(element, 0);
          const Icon = getElementIcon(element.type);

          return (
            <button
              key={element.id}
              type="button"
              onClick={() => focusWindow(element.id)}
              className={cn(
                'flex min-w-[140px] items-center gap-3 rounded-xl border px-3 py-2 text-left transition-colors',
                layout.minimized
                  ? 'border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white'
                  : 'border-sky-400/30 bg-sky-500/15 text-sky-100'
              )}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-black/25">
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{element.title}</p>
                <p className="truncate text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                  {layout.minimized ? 'Réouvrir' : 'Ouvert'}
                </p>
              </div>
              {layout.minimized ? <PanelBottomOpen className="h-4 w-4 shrink-0" /> : <Minus className="h-4 w-4 shrink-0" />}
            </button>
          );
        })}
      </div>
      )}
    </div>
  );
};