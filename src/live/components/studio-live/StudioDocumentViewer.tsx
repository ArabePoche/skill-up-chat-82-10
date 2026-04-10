import React from 'react';
import { FileText, Highlighter, Redo2, Trash2, Undo2, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import DocumentHighlightOverlay from '@/live/components/studio-live/DocumentHighlightOverlay';
import type { LiveTeachingStudioDocumentHighlightStroke, LiveTeachingStudioElement } from '@/live/types';

interface StudioDocumentViewerProps {
  element: LiveTeachingStudioElement;
  isHost: boolean;
  isHighlightMode: boolean;
  redoHighlights: LiveTeachingStudioDocumentHighlightStroke[];
  onToggleHighlightMode: () => void;
  onZoomChange: (nextZoom: number) => void;
  onAddStroke: (stroke: LiveTeachingStudioDocumentHighlightStroke) => void;
  onUndoHighlight: () => void;
  onRedoHighlight: () => void;
  onClearHighlights: () => void;
}

const isPdfDocumentUrl = (documentUrl: string) => {
  try {
    const parsedUrl = new URL(documentUrl);
    return parsedUrl.pathname.toLowerCase().endsWith('.pdf');
  } catch {
    return documentUrl.toLowerCase().includes('.pdf');
  }
};

const getEmbeddedDocumentUrl = (documentUrl: string) => {
  if (isPdfDocumentUrl(documentUrl)) {
    return `${documentUrl}${documentUrl.includes('#') ? '&' : '#'}toolbar=0&navpanes=0&scrollbar=0`;
  }

  return documentUrl;
};

const StudioDocumentViewer: React.FC<StudioDocumentViewerProps> = ({
  element,
  isHost,
  isHighlightMode,
  redoHighlights,
  onToggleHighlightMode,
  onZoomChange,
  onAddStroke,
  onUndoHighlight,
  onRedoHighlight,
  onClearHighlights,
}) => {
  if (!element.document_url) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 rounded-b-2xl bg-zinc-900 p-6 text-center text-zinc-400">
        <FileText className="h-10 w-10 text-emerald-300" />
        <div>
          <p className="text-sm font-semibold text-white">{element.title || 'Document'}</p>
          <p className="mt-1 text-xs text-zinc-500">Aucun document n'a encore été uploadé.</p>
        </div>
      </div>
    );
  }

  const embeddedDocumentUrl = getEmbeddedDocumentUrl(element.document_url);
  const isPdfDocument = isPdfDocumentUrl(element.document_url);
  const documentHighlights = element.document_highlights || [];
  const documentZoom = element.document_zoom || 1;
  const canDownloadForViewers = Boolean(element.document_allow_download);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-b-2xl bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3 text-zinc-700">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-zinc-900">{element.document_name || element.title || 'Document'}</p>
          {element.content && <p className="truncate text-xs text-zinc-500">{element.content}</p>}
        </div>
        <div className="flex items-center gap-2">
          {isHost && (
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-40"
                title="Zoom arrière"
                disabled={documentZoom <= 0.75}
                onClick={() => onZoomChange(documentZoom - 0.25)}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="min-w-[3rem] text-center text-xs font-semibold text-zinc-500">
                {Math.round(documentZoom * 100)}%
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-40"
                title="Zoom avant"
                disabled={documentZoom >= 2.5}
                onClick={() => onZoomChange(documentZoom + 0.25)}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={cn('h-8 w-8 text-amber-600 hover:bg-amber-100 hover:text-amber-700', isHighlightMode && 'bg-amber-100 text-amber-700')}
                title="Surligneur"
                onClick={onToggleHighlightMode}
              >
                <Highlighter className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-40"
                title="Annuler le dernier surlignage"
                disabled={documentHighlights.length === 0}
                onClick={onUndoHighlight}
              >
                <Undo2 className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-40"
                title="Rétablir le dernier surlignage"
                disabled={redoHighlights.length === 0}
                onClick={onRedoHighlight}
              >
                <Redo2 className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-zinc-500 hover:bg-zinc-100 hover:text-rose-600 disabled:opacity-40"
                title="Effacer les surlignages"
                disabled={documentHighlights.length === 0}
                onClick={onClearHighlights}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
          {isHost ? (
            <a href={element.document_url} target="_blank" rel="noreferrer" className="shrink-0 text-xs font-semibold text-sky-600 hover:text-sky-700">
              Ouvrir
            </a>
          ) : canDownloadForViewers ? (
            <a href={element.document_url} target="_blank" rel="noreferrer" download={element.document_name || 'document.pdf'} className="shrink-0 text-xs font-semibold text-sky-600 hover:text-sky-700">
              Télécharger
            </a>
          ) : null}
        </div>
      </div>
      <div className="relative h-full w-full overflow-auto bg-zinc-50">
        <div
          className="relative min-h-full min-w-full bg-zinc-50"
          style={{
            width: `${documentZoom * 100}%`,
            height: `${documentZoom * 100}%`,
          }}
        >
          {isPdfDocument ? (
            <iframe
              key={embeddedDocumentUrl}
              src={embeddedDocumentUrl}
              title={element.document_name || 'Document PDF'}
              className="h-full w-full border-0 bg-white"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-zinc-50 p-6 text-center">
              <FileText className="h-10 w-10 text-emerald-500" />
              <div>
                <p className="text-sm font-semibold text-zinc-900">Seuls les PDF sont pris en charge pour le moment.</p>
                <p className="mt-1 text-xs text-zinc-500">Remplacez ce document par un fichier PDF depuis la configuration.</p>
              </div>
            </div>
          )}

          <DocumentHighlightOverlay
            strokes={documentHighlights}
            isHost={isHost}
            isActive={isHighlightMode}
            onAddStroke={onAddStroke}
          />
        </div>
      </div>
    </div>
  );
};

export default StudioDocumentViewer;