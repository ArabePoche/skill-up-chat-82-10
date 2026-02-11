/**
 * Formulaire de la section Projets du CV (section avancée)
 */
import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import type { Project } from '../../types';

interface Props {
  data: Project[];
  onAdd: (item: Omit<Project, 'id'>) => void;
  onUpdate: (id: string, updates: Partial<Project>) => void;
  onRemove: (id: string) => void;
}

const ProjectsForm: React.FC<Props> = ({ data, onAdd, onUpdate, onRemove }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Projets</h3>
        <Button size="sm" variant="outline" onClick={() => onAdd({ name: '', description: '', url: '' })}>
          <Plus className="w-4 h-4 mr-1" /> Ajouter
        </Button>
      </div>
      {data.length === 0 && <p className="text-sm text-muted-foreground">Aucun projet ajouté.</p>}
      {data.map((item, idx) => (
        <div key={item.id} className="border border-border rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Projet {idx + 1}</span>
            <Button size="icon" variant="ghost" className="text-destructive" onClick={() => onRemove(item.id)}><Trash2 className="w-4 h-4" /></Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Nom</Label><Input value={item.name} onChange={e => onUpdate(item.id, { name: e.target.value })} placeholder="Mon App" /></div>
            <div className="space-y-1.5"><Label>URL</Label><Input value={item.url} onChange={e => onUpdate(item.id, { url: e.target.value })} placeholder="https://..." /></div>
            <div className="sm:col-span-2 space-y-1.5"><Label>Description</Label><Textarea value={item.description} onChange={e => onUpdate(item.id, { description: e.target.value })} rows={2} /></div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ProjectsForm;
