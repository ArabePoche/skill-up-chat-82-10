/**
 * Formulaire de la section Centres d'intérêt du CV
 */
import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import type { Hobby } from '../../types';

interface Props {
  data: Hobby[];
  onAdd: (item: Omit<Hobby, 'id'>) => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Hobby>) => void;
}

const HobbiesForm: React.FC<Props> = ({ data, onAdd, onRemove, onUpdate }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Centres d'intérêt</h3>
        <Button size="sm" variant="outline" onClick={() => onAdd({ name: '' })}>
          <Plus className="w-4 h-4 mr-1" /> Ajouter
        </Button>
      </div>
      {data.length === 0 && <p className="text-sm text-muted-foreground">Aucun centre d'intérêt ajouté.</p>}
      <div className="flex flex-wrap gap-2">
        {data.map(item => (
          <div key={item.id} className="flex items-center gap-1 border border-border rounded-full pl-3 pr-1 py-1">
            <Input
              value={item.name}
              onChange={e => onUpdate(item.id, { name: e.target.value })}
              placeholder="Lecture, Sport..."
              className="border-0 p-0 h-auto text-sm w-28 focus-visible:ring-0"
            />
            <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => onRemove(item.id)}><Trash2 className="w-3 h-3" /></Button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HobbiesForm;
