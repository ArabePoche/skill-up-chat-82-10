// Panneau de prise de notes en temps réel
import React, { useState, useEffect } from 'react';
import { Save, Copy, FileText, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface NotePanelProps {
  className?: string;
}

const NotePanel: React.FC<NotePanelProps> = ({ className = '' }) => {
  const [notes, setNotes] = useState('');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);

  // Auto-sauvegarde toutes les 30 secondes
  useEffect(() => {
    if (!notes.trim()) return;

    const timer = setTimeout(() => {
      handleAutoSave();
    }, 30000);

    return () => clearTimeout(timer);
  }, [notes]);

  const handleAutoSave = async () => {
    if (!notes.trim()) return;

    setIsAutoSaving(true);
    try {
      // Simuler la sauvegarde
      await new Promise(resolve => setTimeout(resolve, 500));
      setLastSaved(new Date());
    } catch (error) {
      console.error('Erreur lors de la sauvegarde automatique:', error);
    } finally {
      setIsAutoSaving(false);
    }
  };

  const handleManualSave = async () => {
    if (!notes.trim()) {
      toast.error('Aucune note à sauvegarder');
      return;
    }

    try {
      await handleAutoSave();
      toast.success('Notes sauvegardées !');
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  const handleCopyNotes = async () => {
    if (!notes.trim()) {
      toast.error('Aucune note à copier');
      return;
    }

    try {
      await navigator.clipboard.writeText(notes);
      toast.success('Notes copiées dans le presse-papiers !');
    } catch (error) {
      toast.error('Erreur lors de la copie');
    }
  };

  const formatLastSaved = (date: Date) => {
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getCurrentTimestamp = () => {
    return new Date().toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const insertTimestamp = () => {
    const timestamp = `[${getCurrentTimestamp()}] `;
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newText = notes.substring(0, start) + timestamp + notes.substring(end);
      
      setNotes(newText);
      
      // Repositionner le curseur après le timestamp
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + timestamp.length;
        textarea.focus();
      }, 0);
    } else {
      setNotes(notes + timestamp);
    }
  };

  return (
    <div className={`w-full h-full bg-gray-800 rounded flex flex-col ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-gray-700 rounded-t">
        <div className="flex items-center space-x-2">
          <FileText size={16} className="text-blue-400" />
          <span className="text-sm font-medium text-white">Notes de cours</span>
          {isAutoSaving && (
            <div className="text-xs text-yellow-400">Sauvegarde...</div>
          )}
        </div>
        
        <div className="flex items-center space-x-1">
          <Button
            variant="outline"
            size="sm"
            onClick={insertTimestamp}
            className="p-1 text-xs"
            title="Insérer un horodatage"
          >
            <Clock size={12} />
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyNotes}
            className="p-1"
            title="Copier les notes"
          >
            <Copy size={12} />
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualSave}
            className="p-1"
            title="Sauvegarder"
          >
            <Save size={12} />
          </Button>
        </div>
      </div>

      {/* Zone de texte */}
      <div className="flex-1 p-3">
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={`Tapez vos notes ici...

Conseils :
• Utilisez le bouton horloge pour insérer l'heure actuelle
• Vos notes sont sauvegardées automatiquement
• Utilisez Ctrl+S pour sauvegarder manuellement`}
          className="w-full h-full resize-none bg-gray-900 border-gray-600 text-white text-sm"
          style={{ minHeight: '200px' }}
        />
      </div>

      {/* Footer */}
      <div className="p-2 bg-gray-700 rounded-b text-xs text-gray-400 flex justify-between items-center">
        <div>
          {notes.length} caractère{notes.length !== 1 ? 's' : ''}
        </div>
        
        {lastSaved && (
          <div className="flex items-center space-x-1">
            <span>Dernière sauvegarde:</span>
            <span className="text-green-400">{formatLastSaved(lastSaved)}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotePanel;