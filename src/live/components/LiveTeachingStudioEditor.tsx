import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, FileText, LayoutTemplate, Loader2, MonitorPlay, NotebookPen, Plus, Presentation, Rows3, Trash2, Upload } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import type { LiveTeachingStudio, LiveTeachingStudioElement, LiveTeachingStudioElementType } from '@/live/types';
import { useFileUpload } from '@/hooks/useFileUpload';

const getDefaultWindowState = (type: LiveTeachingStudioElementType, index: number) => {
  if (type === 'whiteboard') {
    return { x: 2, y: 4, width: 66, height: 78, zIndex: 2, minimized: false };
  }

  if (type === 'notes') {
    return { x: 70, y: 8 + index * 3, width: 28, height: 38, zIndex: 3 + index, minimized: false };
  }

  return { x: 64, y: 48, width: 34, height: 34, zIndex: 3 + index, minimized: false };
};

interface LiveTeachingStudioEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialStudio?: LiveTeachingStudio | null;
  onSave: (studio: LiveTeachingStudio) => void;
}

const createSceneId = () => crypto.randomUUID();
const createElementId = () => crypto.randomUUID();

const buildDefaultElement = (type: LiveTeachingStudioElementType): LiveTeachingStudioElement => {
  switch (type) {
    case 'whiteboard':
      return {
        id: createElementId(),
        type,
        title: 'Tableau',
        content: 'Objectifs du cours\n- Point 1\n- Point 2\n- Point 3',
        window_state: getDefaultWindowState(type, 0),
      };
    case 'notes':
      return {
        id: createElementId(),
        type,
        title: 'Notes',
        content: 'Résumé rapide\n- Idée clé\n- Astuce\n- Exercice à retenir',
        window_state: getDefaultWindowState(type, 0),
      };
    case 'document':
      return {
        id: createElementId(),
        type,
        title: 'Document',
        content: 'Décrivez ici le support partagé pendant le cours.',
        document_name: 'Support PDF',
        document_url: '',
        window_state: getDefaultWindowState(type, 0),
      };
    default:
      return {
        id: createElementId(),
        type,
        title: 'Élément',
        window_state: getDefaultWindowState(type, 0),
      };
  }
};

const buildDefaultStudio = (): LiveTeachingStudio => {
  const firstSceneId = createSceneId();
  return {
    title: 'Studio de cours',
    subtitle: 'Session ouverte à tous, sans formation requise.',
    cover_image_url: '',
    summary: '',
    activeSceneId: firstSceneId,
    scenes: [
      {
        id: firstSceneId,
        name: 'Scène principale',
        elements: [buildDefaultElement('whiteboard')],
      },
    ],
  };
};

const LiveTeachingStudioEditor: React.FC<LiveTeachingStudioEditorProps> = ({
  open,
  onOpenChange,
  initialStudio,
  onSave,
}) => {
  const [studio, setStudio] = useState<LiveTeachingStudio | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const { uploadFile, isUploading } = useFileUpload();

  useEffect(() => {
    if (!open) {
      return;
    }

    const nextStudio = initialStudio || buildDefaultStudio();

    const normalizedStudio: LiveTeachingStudio = {
      ...nextStudio,
      scenes: nextStudio.scenes.map((scene) => ({
        ...scene,
        elements: scene.elements.map((element, index) => ({
          ...element,
          window_state: element.window_state || getDefaultWindowState(element.type, index),
        })),
      })),
    };

    setStudio(normalizedStudio);
    setSelectedElementId(normalizedStudio.scenes[0]?.elements[0]?.id || null);
  }, [initialStudio, open]);

  const activeScene = useMemo(() => {
    if (!studio) {
      return null;
    }

    return studio.scenes.find((scene) => scene.id === studio.activeSceneId) || studio.scenes[0] || null;
  }, [studio]);

  const selectedElement = useMemo(() => {
    return activeScene?.elements.find((element) => element.id === selectedElementId) || activeScene?.elements[0] || null;
  }, [activeScene, selectedElementId]);

  const updateStudio = (updater: (current: LiveTeachingStudio) => LiveTeachingStudio) => {
    setStudio((current) => (current ? updater(current) : current));
  };

  const addScene = () => {
    if (!studio) {
      return;
    }

    const sceneId = createSceneId();
    updateStudio((current) => ({
      ...current,
      activeSceneId: sceneId,
      scenes: [
        ...current.scenes,
        {
          id: sceneId,
          name: `Scène ${current.scenes.length + 1}`,
          elements: [],
        },
      ],
    }));
    setSelectedElementId(null);
  };

  const deleteScene = (sceneId: string) => {
    if (!studio || studio.scenes.length <= 1) {
      return;
    }

    updateStudio((current) => {
      const nextScenes = current.scenes.filter((scene) => scene.id !== sceneId);
      return {
        ...current,
        scenes: nextScenes,
        activeSceneId: current.activeSceneId === sceneId ? nextScenes[0].id : current.activeSceneId,
      };
    });
    setSelectedElementId(null);
  };

  const updateSceneName = (sceneId: string, name: string) => {
    updateStudio((current) => ({
      ...current,
      scenes: current.scenes.map((scene) => scene.id === sceneId ? { ...scene, name } : scene),
    }));
  };

  const addElement = (type: LiveTeachingStudioElementType) => {
    if (!activeScene) {
      return;
    }

    const element = buildDefaultElement(type);
    element.window_state = getDefaultWindowState(type, activeScene.elements.length);
    updateStudio((current) => ({
      ...current,
      scenes: current.scenes.map((scene) => scene.id === activeScene.id ? { ...scene, elements: [...scene.elements, element] } : scene),
    }));
    setSelectedElementId(element.id);
  };

  const handleDocumentUpload = async (file: File) => {
    if (!selectedElement || selectedElement.type !== 'document') {
      return;
    }

    const uploadResult = await uploadFile(file, 'lesson_discussion_files');
    updateElement(selectedElement.id, {
      document_name: file.name,
      document_url: uploadResult.fileUrl,
    });
  };

  const updateElement = (elementId: string, updates: Partial<LiveTeachingStudioElement>) => {
    if (!activeScene) {
      return;
    }

    updateStudio((current) => ({
      ...current,
      scenes: current.scenes.map((scene) => scene.id === activeScene.id ? {
        ...scene,
        elements: scene.elements.map((element) => element.id === elementId ? { ...element, ...updates } : element),
      } : scene),
    }));
  };

  const deleteElement = (elementId: string) => {
    if (!activeScene) {
      return;
    }

    updateStudio((current) => ({
      ...current,
      scenes: current.scenes.map((scene) => scene.id === activeScene.id ? {
        ...scene,
        elements: scene.elements.filter((element) => element.id !== elementId),
      } : scene),
    }));
    setSelectedElementId(null);
  };

  const handleSave = () => {
    if (!studio) {
      return;
    }

    onSave(studio);
    onOpenChange(false);
  };

  const renderElementPreview = (element: LiveTeachingStudioElement) => {
    if (element.type === 'whiteboard') {
      return (
        <div className="rounded-2xl border border-sky-400/20 bg-sky-500/10 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-200">Tableau</p>
          <p className="mt-2 whitespace-pre-line text-sm text-white/85">{element.content || 'Ajoutez le contenu du tableau.'}</p>
        </div>
      );
    }

    if (element.type === 'notes') {
      return (
        <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-200">Notes</p>
          <p className="mt-2 whitespace-pre-line text-sm text-white/85">{element.content || 'Ajoutez les notes à afficher.'}</p>
        </div>
      );
    }

    return (
      <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">Document</p>
        <p className="mt-2 text-sm font-medium text-white">{element.document_name || 'Document partagé'}</p>
        <p className="mt-1 whitespace-pre-line text-sm text-white/80">{element.content || 'Ajoutez une description du document.'}</p>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[100dvh] w-full max-w-none flex-col overflow-hidden border-zinc-800 bg-zinc-950 p-0 text-white sm:max-h-[94vh] sm:w-[calc(100vw-0.75rem)] sm:max-w-6xl sm:rounded-xl">
        <DialogHeader className="border-b border-zinc-800 px-4 py-4 sm:px-6 sm:py-5">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Presentation className="h-5 w-5 text-sky-300" />
            Studio d’enseignement live
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Composez des scènes avec tableau, notes et document pour un écran enseignant libre.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-hidden">
          <div className="flex h-full min-h-0 flex-col gap-0 overflow-y-auto lg:grid lg:grid-cols-[280px_minmax(0,1fr)_320px] lg:overflow-hidden">
            <div className="min-h-0 overflow-hidden border-b border-zinc-800 bg-zinc-950/80 p-3 sm:p-4 lg:flex lg:max-h-none lg:flex-col lg:border-b-0 lg:border-r">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Scènes</p>
                  <p className="text-sm text-white/80">Organisation du cours</p>
                </div>
                <Button type="button" size="sm" onClick={addScene} className="bg-sky-500 text-white hover:bg-sky-600">
                  <Plus className="mr-2 h-4 w-4" />
                  Scène
                </Button>
              </div>

              <div className="min-h-0 space-y-5 overflow-hidden lg:flex-1">
                <div className="min-h-0 space-y-2 overflow-y-auto pr-1 lg:flex-1">
                  {studio?.scenes.map((scene) => (
                    <div
                      key={scene.id}
                      className={`rounded-2xl border p-3 ${studio.activeSceneId === scene.id ? 'border-sky-400 bg-sky-500/10' : 'border-zinc-800 bg-zinc-900/70'}`}
                    >
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="flex-1 text-left"
                          onClick={() => {
                            updateStudio((current) => ({ ...current, activeSceneId: scene.id }));
                            setSelectedElementId(scene.elements[0]?.id || null);
                          }}
                        >
                          <p className="text-sm font-semibold text-white">{scene.name}</p>
                          <p className="text-xs text-zinc-400">{scene.elements.length} élément{scene.elements.length > 1 ? 's' : ''}</p>
                        </button>
                        {studio && studio.scenes.length > 1 && (
                          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:bg-zinc-800 hover:text-white" onClick={() => deleteScene(scene.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-2 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Éléments</p>
                  <Button type="button" variant="outline" className="w-full justify-start border-zinc-700 bg-transparent text-white hover:bg-zinc-800" onClick={() => addElement('whiteboard')}>
                    <LayoutTemplate className="mr-2 h-4 w-4 text-sky-300" />
                    Ajouter un tableau
                  </Button>
                  <Button type="button" variant="outline" className="w-full justify-start border-zinc-700 bg-transparent text-white hover:bg-zinc-800" onClick={() => addElement('notes')}>
                    <NotebookPen className="mr-2 h-4 w-4 text-amber-300" />
                    Ajouter des notes
                  </Button>
                  <Button type="button" variant="outline" className="w-full justify-start border-zinc-700 bg-transparent text-white hover:bg-zinc-800" onClick={() => addElement('document')}>
                    <FileText className="mr-2 h-4 w-4 text-emerald-300" />
                    Ajouter un document
                  </Button>
                </div>
              </div>
            </div>

            <div className="min-h-0 overflow-hidden border-b border-zinc-800 p-3 sm:p-5 lg:flex lg:max-h-none lg:flex-col lg:border-b-0">
            <div className="min-h-0 overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-sky-500/12 via-zinc-950 to-emerald-500/10 p-5 shadow-[0_16px_60px_rgba(0,0,0,0.35)] lg:flex lg:flex-1 lg:flex-col">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-200/80">Prévisualisation</p>
                  <h3 className="mt-2 text-xl font-semibold text-white">{studio?.title || 'Studio de cours'}</h3>
                  <p className="mt-1 text-sm text-white/65">{studio?.subtitle || 'Écran enseignant libre et accessible à tous.'}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/25 px-3 py-2 text-xs text-white/70">
                  <div className="flex items-center gap-2">
                    <MonitorPlay className="h-4 w-4 text-sky-300" />
                    {activeScene?.name || 'Aucune scène'}
                  </div>
                </div>
              </div>

              <div className="mt-4 overflow-x-auto pb-2">
                <div className="flex min-w-max gap-2">
                  {studio?.scenes.map((scene) => (
                    <button
                      key={scene.id}
                      type="button"
                      onClick={() => updateStudio((current) => ({ ...current, activeSceneId: scene.id }))}
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${studio.activeSceneId === scene.id ? 'bg-sky-500 text-white' : 'bg-white/8 text-white/75'}`}
                    >
                      {scene.name}
                    </button>
                  ))}
                </div>
              </div>

              {studio?.summary && (
                <p className="mt-4 max-w-3xl text-sm leading-6 text-white/75">{studio.summary}</p>
              )}

              <div className="mt-6 min-h-0 overflow-y-auto pr-1 lg:flex-1">
                <div className="grid gap-3">
                  {activeScene?.elements.length ? activeScene.elements.map((element) => (
                    <button
                      key={element.id}
                      type="button"
                      className={`rounded-3xl border p-0 text-left transition ${selectedElement?.id === element.id ? 'border-sky-400 bg-white/5' : 'border-white/10 bg-black/15 hover:bg-white/5'}`}
                      onClick={() => setSelectedElementId(element.id)}
                    >
                      <div className="border-b border-white/10 px-4 py-3">
                        <p className="text-sm font-semibold text-white">{element.title}</p>
                      </div>
                      <div className="p-4">
                        {renderElementPreview(element)}
                      </div>
                    </button>
                  )) : (
                    <Card className="border-dashed border-zinc-700 bg-zinc-950/60">
                      <CardContent className="py-14 text-center text-sm text-zinc-400">
                        Ajoutez un tableau, des notes ou un document dans cette scène.
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </div>
            </div>

            <div className="min-h-0 bg-zinc-950/80 p-3 sm:p-4 lg:flex lg:max-h-none lg:flex-col lg:border-l lg:border-zinc-800">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Paramètres</p>
            <div className="mt-4 min-h-0 space-y-4 overflow-y-auto pr-1 lg:flex-1">
              <div className="space-y-2">
                <Label>Titre du studio</Label>
                <Input
                  value={studio?.title || ''}
                  onChange={(event) => updateStudio((current) => ({ ...current, title: event.target.value }))}
                  placeholder="Ex: Atelier bureautique en direct"
                  className="border-zinc-800 bg-zinc-900 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label>Sous-titre</Label>
                <Input
                  value={studio?.subtitle || ''}
                  onChange={(event) => updateStudio((current) => ({ ...current, subtitle: event.target.value }))}
                  placeholder="Ex: Ouvert à tous les participants du live"
                  className="border-zinc-800 bg-zinc-900 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label>Image de couverture</Label>
                <Input
                  value={studio?.cover_image_url || ''}
                  onChange={(event) => updateStudio((current) => ({ ...current, cover_image_url: event.target.value }))}
                  placeholder="https://..."
                  className="border-zinc-800 bg-zinc-900 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label>Résumé du studio</Label>
                <Textarea
                  value={studio?.summary || ''}
                  onChange={(event) => updateStudio((current) => ({ ...current, summary: event.target.value }))}
                  placeholder="Annoncez le déroulé du cours ou le message à retenir."
                  rows={3}
                  className="border-zinc-800 bg-zinc-900 text-white"
                />
              </div>

              {activeScene && (
                <div className="space-y-2">
                  <Label>Nom de la scène active</Label>
                  <Input
                    value={activeScene.name}
                    onChange={(event) => updateSceneName(activeScene.id, event.target.value)}
                    className="border-zinc-800 bg-zinc-900 text-white"
                  />
                </div>
              )}

              {selectedElement ? (
                <div className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">Élément sélectionné</p>
                      <p className="text-xs text-zinc-400">{selectedElement.type}</p>
                    </div>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:bg-zinc-800 hover:text-white" onClick={() => deleteElement(selectedElement.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label>Titre</Label>
                    <Input
                      value={selectedElement.title}
                      onChange={(event) => updateElement(selectedElement.id, { title: event.target.value })}
                      className="border-zinc-800 bg-zinc-900 text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Contenu</Label>
                    <Textarea
                      value={selectedElement.content || ''}
                      onChange={(event) => updateElement(selectedElement.id, { content: event.target.value })}
                      rows={selectedElement.type === 'document' ? 5 : 7}
                      className="border-zinc-800 bg-zinc-900 text-white"
                    />
                  </div>

                  {selectedElement.type === 'document' && (
                    <>
                      <input
                        ref={documentInputRef}
                        type="file"
                        accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.rtf,.odt,.ods,.odp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                        className="hidden"
                        onChange={async (event) => {
                          const file = event.target.files?.[0];
                          if (!file) {
                            return;
                          }

                          try {
                            await handleDocumentUpload(file);
                          } finally {
                            event.target.value = '';
                          }
                        }}
                      />

                      <div className="space-y-2">
                        <Label>Nom du document</Label>
                        <Input
                          value={selectedElement.document_name || ''}
                          onChange={(event) => updateElement(selectedElement.id, { document_name: event.target.value })}
                          placeholder="Ex: Support PDF chapitre 1"
                          className="border-zinc-800 bg-zinc-900 text-white"
                        />
                      </div>

                      <div className="space-y-3">
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full justify-center border-zinc-700 bg-transparent text-white hover:bg-zinc-800"
                          onClick={() => documentInputRef.current?.click()}
                          disabled={isUploading}
                        >
                          {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                          Uploader un document
                        </Button>
                        {selectedElement.document_url && (
                          <p className="break-all text-xs text-emerald-300">
                            URL stockée: {selectedElement.document_url}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label>Lien du document</Label>
                        <Input
                          value={selectedElement.document_url || ''}
                          onChange={(event) => updateElement(selectedElement.id, { document_url: event.target.value })}
                          placeholder="https://..."
                          className="border-zinc-800 bg-zinc-900 text-white"
                        />
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/60 px-4 py-10 text-center text-sm text-zinc-400">
                  Sélectionnez un élément dans la prévisualisation pour le configurer.
                </div>
              )}

              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 text-sm text-zinc-400">
                <div className="flex items-center gap-2 text-white/85">
                  <Rows3 className="h-4 w-4 text-sky-300" />
                  Structure inspirée du Studio de cours
                </div>
                <p className="mt-2">
                  Chaque scène peut contenir plusieurs éléments et le public verra la scène active choisie par le créateur.
                </p>
              </div>
            </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col-reverse gap-2 border-t border-zinc-800 px-3 py-3 sm:flex-row sm:px-6 sm:py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full border-zinc-700 bg-transparent text-white hover:bg-zinc-800 sm:w-auto">
            Annuler
          </Button>
          <Button onClick={handleSave} className="w-full bg-sky-500 text-white hover:bg-sky-600 sm:w-auto">
            <BookOpen className="mr-2 h-4 w-4" />
            Utiliser cet écran
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LiveTeachingStudioEditor;