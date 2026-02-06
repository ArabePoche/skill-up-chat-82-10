/**
 * Gestionnaire de labels/étiquettes style Gmail
 */
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tag, Plus, Pencil, Trash2, MoreVertical, Check } from 'lucide-react';
import { MessageLabel } from '../types';
import { cn } from '@/lib/utils';

interface LabelManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  labels: MessageLabel[];
  onCreateLabel: (label: Omit<MessageLabel, 'id'>) => void;
  onUpdateLabel: (id: string, label: Partial<MessageLabel>) => void;
  onDeleteLabel: (id: string) => void;
}

const COLORS = [
  { name: 'red', label: 'Rouge', class: 'bg-red-500' },
  { name: 'orange', label: 'Orange', class: 'bg-orange-500' },
  { name: 'yellow', label: 'Jaune', class: 'bg-yellow-500' },
  { name: 'green', label: 'Vert', class: 'bg-green-500' },
  { name: 'blue', label: 'Bleu', class: 'bg-blue-500' },
  { name: 'purple', label: 'Violet', class: 'bg-purple-500' },
  { name: 'pink', label: 'Rose', class: 'bg-pink-500' },
  { name: 'gray', label: 'Gris', class: 'bg-gray-500' },
];

export const LabelManager: React.FC<LabelManagerProps> = ({
  open,
  onOpenChange,
  labels,
  onCreateLabel,
  onUpdateLabel,
  onDeleteLabel,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState('blue');

  const handleCreate = () => {
    if (newLabelName.trim()) {
      onCreateLabel({
        name: newLabelName.trim(),
        color: newLabelColor,
      });
      setNewLabelName('');
      setNewLabelColor('blue');
      setIsCreating(false);
    }
  };

  const handleUpdate = (id: string, name: string) => {
    if (name.trim()) {
      onUpdateLabel(id, { name: name.trim() });
      setEditingId(null);
    }
  };

  const getColorClass = (colorName: string) => {
    return COLORS.find((c) => c.name === colorName)?.class || 'bg-blue-500';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Gérer les libellés
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[400px]">
          <div className="space-y-2 p-1">
            {/* Liste des labels existants */}
            {labels.map((label) => (
              <div
                key={label.id}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted group"
              >
                {/* Couleur */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className={cn(
                        'h-4 w-4 rounded-full flex-shrink-0 cursor-pointer hover:ring-2 ring-offset-2 ring-primary',
                        getColorClass(label.color)
                      )}
                    />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <div className="grid grid-cols-4 gap-1 p-2">
                      {COLORS.map((color) => (
                        <button
                          key={color.name}
                          className={cn(
                            'h-6 w-6 rounded-full flex items-center justify-center',
                            color.class
                          )}
                          onClick={() =>
                            onUpdateLabel(label.id, { color: color.name })
                          }
                        >
                          {label.color === color.name && (
                            <Check className="h-3 w-3 text-white" />
                          )}
                        </button>
                      ))}
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Nom */}
                {editingId === label.id ? (
                  <Input
                    defaultValue={label.name}
                    className="h-8"
                    autoFocus
                    onBlur={(e) => handleUpdate(label.id, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleUpdate(label.id, e.currentTarget.value);
                      }
                      if (e.key === 'Escape') {
                        setEditingId(null);
                      }
                    }}
                  />
                ) : (
                  <span className="flex-1 text-sm">{label.name}</span>
                )}

                {/* Actions */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditingId(label.id)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Renommer
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => onDeleteLabel(label.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}

            {/* Formulaire nouveau label */}
            {isCreating ? (
              <div className="p-2 border rounded-lg space-y-3">
                <div className="flex items-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className={cn(
                          'h-4 w-4 rounded-full flex-shrink-0 cursor-pointer hover:ring-2 ring-offset-2 ring-primary',
                          getColorClass(newLabelColor)
                        )}
                      />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <div className="grid grid-cols-4 gap-1 p-2">
                        {COLORS.map((color) => (
                          <button
                            key={color.name}
                            className={cn(
                              'h-6 w-6 rounded-full flex items-center justify-center',
                              color.class
                            )}
                            onClick={() => setNewLabelColor(color.name)}
                          >
                            {newLabelColor === color.name && (
                              <Check className="h-3 w-3 text-white" />
                            )}
                          </button>
                        ))}
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Input
                    placeholder="Nom du libellé"
                    value={newLabelName}
                    onChange={(e) => setNewLabelName(e.target.value)}
                    className="h-8"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreate();
                      if (e.key === 'Escape') setIsCreating(false);
                    }}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsCreating(false)}
                  >
                    Annuler
                  </Button>
                  <Button size="sm" onClick={handleCreate}>
                    Créer
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="ghost"
                className="w-full justify-start gap-2"
                onClick={() => setIsCreating(true)}
              >
                <Plus className="h-4 w-4" />
                Créer un libellé
              </Button>
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
