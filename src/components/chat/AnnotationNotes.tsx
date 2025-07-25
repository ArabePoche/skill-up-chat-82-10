
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StickyNote, X, Check } from 'lucide-react';

interface Note {
  id: string;
  x: number;
  y: number;
  text: string;
  author: string;
  timestamp: string;
}

interface AnnotationNotesProps {
  notes: Note[];
  isAddingNote: boolean;
  onAddNote: (text: string) => void;
  onCancelNote: () => void;
}

const AnnotationNotes: React.FC<AnnotationNotesProps> = ({
  notes,
  isAddingNote,
  onAddNote,
  onCancelNote
}) => {
  const [noteText, setNoteText] = useState('');

  const handleSubmitNote = () => {
    if (noteText.trim()) {
      onAddNote(noteText.trim());
      setNoteText('');
    }
  };

  const handleCancelNote = () => {
    setNoteText('');
    onCancelNote();
  };

  return (
    <div className="w-80 border-l bg-white flex flex-col">
      <div className="p-4 border-b">
        <div className="flex items-center gap-2">
          <StickyNote size={20} />
          <h3 className="font-semibold">Notes d'annotation</h3>
        </div>
      </div>

      {isAddingNote && (
        <div className="p-4 border-b bg-blue-50">
          <h4 className="font-medium mb-2">Ajouter une note</h4>
          <Textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Tapez votre note ici..."
            className="mb-2"
            rows={3}
            autoFocus
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSubmitNote} disabled={!noteText.trim()}>
              <Check size={16} className="mr-1" />
              Ajouter
            </Button>
            <Button size="sm" variant="outline" onClick={handleCancelNote}>
              <X size={16} className="mr-1" />
              Annuler
            </Button>
          </div>
        </div>
      )}

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {notes.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <StickyNote size={48} className="mx-auto mb-2 opacity-30" />
              <p>Aucune note ajoutée</p>
              <p className="text-sm">Cliquez sur l'outil note puis sur l'image</p>
            </div>
          ) : (
            notes.map((note, index) => (
              <Card key={note.id} className="text-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <span className="w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-xs">
                      {index + 1}
                    </span>
                    Note #{index + 1}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="mb-2">{note.text}</p>
                  <div className="text-xs text-gray-500">
                    <div>Par: {note.author}</div>
                    <div>Le: {note.timestamp}</div>
                    <div>Position: ({Math.round(note.x)}, {Math.round(note.y)})</div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default AnnotationNotes;
