/**
 * Formulaire de la section Références du CV (section avancée)
 */
import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import type { Reference } from '../../types';

interface Props {
  data: Reference[];
  onAdd: (item: Omit<Reference, 'id'>) => void;
  onUpdate: (id: string, updates: Partial<Reference>) => void;
  onRemove: (id: string) => void;
}

const ReferencesForm: React.FC<Props> = ({ data, onAdd, onUpdate, onRemove }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Références</h3>
        <Button size="sm" variant="outline" onClick={() => onAdd({ name: '', position: '', company: '', phone: '', email: '' })}>
          <Plus className="w-4 h-4 mr-1" /> Ajouter
        </Button>
      </div>
      {data.length === 0 && <p className="text-sm text-muted-foreground">Aucune référence ajoutée.</p>}
      {data.map((item, idx) => (
        <div key={item.id} className="border border-border rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Référence {idx + 1}</span>
            <Button size="icon" variant="ghost" className="text-destructive" onClick={() => onRemove(item.id)}><Trash2 className="w-4 h-4" /></Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Nom</Label><Input value={item.name} onChange={e => onUpdate(item.id, { name: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Poste</Label><Input value={item.position} onChange={e => onUpdate(item.id, { position: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Entreprise</Label><Input value={item.company} onChange={e => onUpdate(item.id, { company: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Téléphone</Label><Input value={item.phone} onChange={e => onUpdate(item.id, { phone: e.target.value })} /></div>
            <div className="sm:col-span-2 space-y-1.5"><Label>Email</Label><Input type="email" value={item.email} onChange={e => onUpdate(item.id, { email: e.target.value })} /></div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ReferencesForm;
