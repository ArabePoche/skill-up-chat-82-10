/**
 * Formulaire de la section Certifications du CV (section avancée)
 */
import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import type { Certification } from '../../types';

interface Props {
  data: Certification[];
  onAdd: (item: Omit<Certification, 'id'>) => void;
  onUpdate: (id: string, updates: Partial<Certification>) => void;
  onRemove: (id: string) => void;
}

const CertificationsForm: React.FC<Props> = ({ data, onAdd, onUpdate, onRemove }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Certifications</h3>
        <Button size="sm" variant="outline" onClick={() => onAdd({ name: '', issuer: '', date: '' })}>
          <Plus className="w-4 h-4 mr-1" /> Ajouter
        </Button>
      </div>
      {data.length === 0 && <p className="text-sm text-muted-foreground">Aucune certification ajoutée.</p>}
      {data.map((item, idx) => (
        <div key={item.id} className="border border-border rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Certification {idx + 1}</span>
            <Button size="icon" variant="ghost" className="text-destructive" onClick={() => onRemove(item.id)}><Trash2 className="w-4 h-4" /></Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5"><Label>Nom</Label><Input value={item.name} onChange={e => onUpdate(item.id, { name: e.target.value })} placeholder="AWS Certified" /></div>
            <div className="space-y-1.5"><Label>Organisme</Label><Input value={item.issuer} onChange={e => onUpdate(item.id, { issuer: e.target.value })} placeholder="Amazon" /></div>
            <div className="space-y-1.5"><Label>Date</Label><Input type="month" value={item.date} onChange={e => onUpdate(item.id, { date: e.target.value })} /></div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default CertificationsForm;
