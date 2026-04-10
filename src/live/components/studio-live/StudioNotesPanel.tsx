import React from 'react';
import { BookOpen } from 'lucide-react';
import type { LiveTeachingStudioElement } from '@/live/types';

interface StudioNotesPanelProps {
  element: LiveTeachingStudioElement;
}

const StudioNotesPanel: React.FC<StudioNotesPanelProps> = ({ element }) => {
  return (
    <div className="flex h-full w-full flex-col gap-4 overflow-y-auto rounded-b-2xl bg-zinc-900 p-6 text-zinc-300">
      <div className="flex items-center gap-3 border-b border-white/5 pb-4">
        <BookOpen className="h-6 w-6 text-amber-400" />
        <h3 className="text-lg font-bold text-white">{element.title || 'Notes'}</h3>
      </div>
      <div className="whitespace-pre-wrap text-sm leading-relaxed">
        {element.content || 'Aucune note ajoutée.'}
      </div>
    </div>
  );
};

export default StudioNotesPanel;