/**
 * Panneau de notes éditable pour le studio d'enseignement en live.
 * Le host peut éditer les notes en temps réel, les spectateurs voient en lecture seule.
 */
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { BookOpen, Edit3, Check } from 'lucide-react';
import type { LiveTeachingStudioElement } from '@/live/types';

interface StudioNotesPanelProps {
  element: LiveTeachingStudioElement;
  isHost?: boolean;
  onContentChange?: (elementId: string, newContent: string) => void;
}

const StudioNotesPanel: React.FC<StudioNotesPanelProps> = ({ element, isHost = false, onContentChange }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(element.content || '');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync draft when element content changes externally (remote updates)
  useEffect(() => {
    if (!isEditing) {
      setDraft(element.content || '');
    }
  }, [element.content, isEditing]);

  const handleSave = useCallback(() => {
    setIsEditing(false);
    if (onContentChange && draft !== element.content) {
      onContentChange(element.id, draft);
    }
  }, [draft, element.content, element.id, onContentChange]);

  const handleEdit = useCallback(() => {
    setIsEditing(true);
    setTimeout(() => textareaRef.current?.focus(), 50);
  }, []);

  return (
    <div className="flex h-full w-full flex-col gap-3 overflow-y-auto rounded-b-2xl bg-zinc-900 p-4 text-zinc-300">
      <div className="flex items-center justify-between border-b border-white/5 pb-3">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-amber-400" />
          <h3 className="text-base font-bold text-white">{element.title || 'Notes'}</h3>
        </div>
        {isHost && (
          <button
            onClick={isEditing ? handleSave : handleEdit}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-white/10"
          >
            {isEditing ? (
              <>
                <Check className="h-3.5 w-3.5 text-green-400" />
                <span className="text-green-400">Enregistrer</span>
              </>
            ) : (
              <>
                <Edit3 className="h-3.5 w-3.5 text-amber-400" />
                <span className="text-amber-400">Modifier</span>
              </>
            )}
          </button>
        )}
      </div>

      {isEditing ? (
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={handleSave}
          placeholder="Écrivez vos notes ici..."
          className="flex-1 resize-none rounded-lg border border-amber-500/20 bg-zinc-950 p-3 text-sm leading-relaxed text-white placeholder:text-zinc-600 focus:border-amber-400/40 focus:outline-none"
        />
      ) : (
        <div className="flex-1 whitespace-pre-wrap text-sm leading-relaxed">
          {draft || (isHost ? 'Cliquez sur "Modifier" pour ajouter des notes.' : 'Aucune note ajoutée.')}
        </div>
      )}
    </div>
  );
};

export default StudioNotesPanel;
