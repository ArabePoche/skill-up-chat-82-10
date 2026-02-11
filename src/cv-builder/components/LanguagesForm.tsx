/**
 * Formulaire de la section Langues du CV
 */
import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import type { Language } from '../types';

const LEVELS = [
  { value: 'A1', label: 'A1 - Débutant' },
  { value: 'A2', label: 'A2 - Élémentaire' },
  { value: 'B1', label: 'B1 - Intermédiaire' },
  { value: 'B2', label: 'B2 - Avancé' },
  { value: 'C1', label: 'C1 - Autonome' },
  { value: 'C2', label: 'C2 - Maîtrise' },
  { value: 'native', label: 'Langue maternelle' },
];

interface Props {
  data: Language[];
  onAdd: (item: Omit<Language, 'id'>) => void;
  onUpdate: (id: string, updates: Partial<Language>) => void;
  onRemove: (id: string) => void;
}

const LanguagesForm: React.FC<Props> = ({ data, onAdd, onUpdate, onRemove }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Langues</h3>
        <Button size="sm" variant="outline" onClick={() => onAdd({ name: '', level: 'B1' })}>
          <Plus className="w-4 h-4 mr-1" /> Ajouter
        </Button>
      </div>
      {data.length === 0 && <p className="text-sm text-muted-foreground">Aucune langue ajoutée.</p>}
      {data.map(item => (
        <div key={item.id} className="flex items-center gap-3">
          <Input className="flex-1" value={item.name} onChange={e => onUpdate(item.id, { name: e.target.value })} placeholder="Français, Anglais..." />
          <Select value={item.level} onValueChange={v => onUpdate(item.id, { level: v as Language['level'] })}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>{LEVELS.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}</SelectContent>
          </Select>
          <Button size="icon" variant="ghost" className="text-destructive" onClick={() => onRemove(item.id)}><Trash2 className="w-4 h-4" /></Button>
        </div>
      ))}
    </div>
  );
};

export default LanguagesForm;
