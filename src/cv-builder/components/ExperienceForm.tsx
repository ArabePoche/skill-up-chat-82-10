/**
 * Formulaire de la section Expériences du CV
 */
import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2 } from 'lucide-react';
import type { Experience } from '../types';

interface Props {
  data: Experience[];
  onAdd: (item: Omit<Experience, 'id'>) => void;
  onUpdate: (id: string, updates: Partial<Experience>) => void;
  onRemove: (id: string) => void;
}

const ExperienceForm: React.FC<Props> = ({ data, onAdd, onUpdate, onRemove }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Expériences</h3>
        <Button size="sm" variant="outline" onClick={() => onAdd({ company: '', position: '', startDate: '', endDate: '', current: false, description: '' })}>
          <Plus className="w-4 h-4 mr-1" /> Ajouter
        </Button>
      </div>
      {data.length === 0 && <p className="text-sm text-muted-foreground">Aucune expérience ajoutée.</p>}
      {data.map((item, idx) => (
        <div key={item.id} className="border border-border rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Expérience {idx + 1}</span>
            <Button size="icon" variant="ghost" className="text-destructive" onClick={() => onRemove(item.id)}><Trash2 className="w-4 h-4" /></Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Entreprise</Label><Input value={item.company} onChange={e => onUpdate(item.id, { company: e.target.value })} placeholder="Google" /></div>
            <div className="space-y-1.5"><Label>Poste</Label><Input value={item.position} onChange={e => onUpdate(item.id, { position: e.target.value })} placeholder="Développeur Senior" /></div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5"><Label>Début</Label><Input type="month" value={item.startDate} onChange={e => onUpdate(item.id, { startDate: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Fin</Label><Input type="month" value={item.endDate} onChange={e => onUpdate(item.id, { endDate: e.target.value })} disabled={item.current} /></div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox checked={item.current} onCheckedChange={checked => onUpdate(item.id, { current: !!checked, endDate: checked ? '' : item.endDate })} />
              <Label className="cursor-pointer">Poste actuel</Label>
            </div>
            <div className="sm:col-span-2 space-y-1.5"><Label>Description</Label><Textarea value={item.description} onChange={e => onUpdate(item.id, { description: e.target.value })} rows={2} placeholder="Responsabilités et réalisations..." /></div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ExperienceForm;
