/**
 * Formulaire de la section Compétences du CV
 */
import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import type { Skill } from '../types';

const LEVELS = [
  { value: 'beginner', label: 'Débutant' },
  { value: 'intermediate', label: 'Intermédiaire' },
  { value: 'advanced', label: 'Avancé' },
  { value: 'expert', label: 'Expert' },
];

interface Props {
  data: Skill[];
  onAdd: (item: Omit<Skill, 'id'>) => void;
  onUpdate: (id: string, updates: Partial<Skill>) => void;
  onRemove: (id: string) => void;
}

const SkillsForm: React.FC<Props> = ({ data, onAdd, onUpdate, onRemove }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Compétences</h3>
        <Button size="sm" variant="outline" onClick={() => onAdd({ name: '', level: 'intermediate' })}>
          <Plus className="w-4 h-4 mr-1" /> Ajouter
        </Button>
      </div>
      {data.length === 0 && <p className="text-sm text-muted-foreground">Aucune compétence ajoutée.</p>}
      {data.map(item => (
        <div key={item.id} className="flex items-center gap-3">
          <Input className="flex-1" value={item.name} onChange={e => onUpdate(item.id, { name: e.target.value })} placeholder="React, Python, Design..." />
          <Select value={item.level} onValueChange={v => onUpdate(item.id, { level: v as Skill['level'] })}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>{LEVELS.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}</SelectContent>
          </Select>
          <Button size="icon" variant="ghost" className="text-destructive" onClick={() => onRemove(item.id)}><Trash2 className="w-4 h-4" /></Button>
        </div>
      ))}
    </div>
  );
};

export default SkillsForm;
