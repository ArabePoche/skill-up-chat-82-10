/**
 * Formulaire de création/modification de service
 */
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { useFileUpload } from '@/hooks/useFileUpload';
import MultiFileUploader from '@/components/admin/exercise/MultiFileUploader';
import type { ServiceWithFiles } from '../hooks/useServices';

interface ServiceFormProps {
  service?: ServiceWithFiles;
  onSubmit: (serviceData: any, files: any[]) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const ServiceForm: React.FC<ServiceFormProps> = ({
  service,
  onSubmit,
  onCancel,
  isSubmitting = false,
}) => {
  const { user } = useAuth();
  const [name, setName] = useState(service?.name || '');
  const [description, setDescription] = useState(service?.description || '');
  const [price, setPrice] = useState(service?.price?.toString() || '');
  const [duration, setDuration] = useState(service?.duration?.toString() || '');
  const [files, setFiles] = useState<any[]>(service?.files || []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.id) {
      return;
    }

    const serviceData = {
      ...(service?.id && { id: service.id }),
      user_id: user.id,
      name,
      description,
      price: parseFloat(price) || 0,
      duration: parseInt(duration) || 0,
      is_active: service?.is_active ?? true,
    };

    await onSubmit(serviceData, files);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label htmlFor="name">Nom du service *</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Consultation personnalisée"
            required
          />
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Décrivez votre service..."
            rows={4}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="price">Prix (€) *</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="50.00"
              required
            />
          </div>

          <div>
            <Label htmlFor="duration">Durée (minutes) *</Label>
            <Input
              id="duration"
              type="number"
              min="0"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="60"
              required
            />
          </div>
        </div>

        <div>
          <Label>Fichiers (images, vidéos, documents)</Label>
          <MultiFileUploader
            existingFiles={files.map(f => ({
              url: f.file_url,
              type: f.file_type,
              name: f.file_name,
              category: f.file_type as any,
            }))}
            onFilesChange={(newFiles) => {
              setFiles(newFiles.map((f, index) => ({
                file_url: f.url,
                file_type: f.type,
                file_name: f.name,
                order_index: index,
              })));
            }}
          />
        </div>
      </div>

      <div className="flex gap-3 justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Annuler
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Enregistrement...' : service ? 'Mettre à jour' : 'Créer'}
        </Button>
      </div>
    </form>
  );
};

export default ServiceForm;
