/**
 * Formulaire de la section Éducation du CV
 */
import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import type { Education } from '../../types';

interface Props {
  data: Education[];
  onAdd: (item: Omit<Education, 'id'>) => void;
  onUpdate: (id: string, updates: Partial<Education>) => void;
  onRemove: (id: string) => void;
}

const EducationForm: React.FC<Props> = ({ data, onAdd, onUpdate, onRemove }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Éducation</h3>
        <Button size="sm" variant="outline" onClick={() => onAdd({ school: '', degree: '', field: '', startDate: '', endDate: '', description: '' })}>
          <Plus className="w-4 h-4 mr-1" /> Ajouter
        </Button>
      </div>
      {data.length === 0 && <p className="text-sm text-muted-foreground">Aucune formation ajoutée. Cliquez sur "Ajouter".</p>}
      {data.map((item, idx) => (
        <div key={item.id} className="border border-border rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Formation {idx + 1}</span>
            <Button size="icon" variant="ghost" className="text-destructive" onClick={() => onRemove(item.id)}><Trash2 className="w-4 h-4" /></Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Établissement</Label><Input value={item.school} onChange={e => onUpdate(item.id, { school: e.target.value })} placeholder="Université Paris-Saclay" /></div>
            <div className="space-y-1.5"><Label>Diplôme</Label><Input value={item.degree} onChange={e => onUpdate(item.id, { degree: e.target.value })} placeholder="Master" /></div>
            <div className="space-y-1.5"><Label>Domaine</Label><Input value={item.field} onChange={e => onUpdate(item.id, { field: e.target.value })} placeholder="Informatique" /></div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5"><Label>Début</Label><Input type="month" value={item.startDate} onChange={e => onUpdate(item.id, { startDate: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Fin</Label><Input type="month" value={item.endDate} onChange={e => onUpdate(item.id, { endDate: e.target.value })} /></div>
            </div>
            <div className="sm:col-span-2 space-y-1.5"><Label>Description</Label><Textarea value={item.description} onChange={e => onUpdate(item.id, { description: e.target.value })} rows={2} placeholder="Détails de la formation..." /></div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default EducationForm;
