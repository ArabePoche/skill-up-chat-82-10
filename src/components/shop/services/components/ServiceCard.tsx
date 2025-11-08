/**
 * Composant de carte pour afficher un service
 */
import React from 'react';
import { Clock, Edit, Trash2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { ServiceWithFiles } from '../hooks/useServices';

interface ServiceCardProps {
  service: ServiceWithFiles;
  isOwner?: boolean;
  onEdit?: (service: ServiceWithFiles) => void;
  onDelete?: (serviceId: string) => void;
  onToggleActive?: (serviceId: string, isActive: boolean) => void;
}

const ServiceCard: React.FC<ServiceCardProps> = ({
  service,
  isOwner = false,
  onEdit,
  onDelete,
  onToggleActive,
}) => {
  const mainImage = service.files?.find(f => f.file_type === 'image');

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      {/* Image */}
      {mainImage && (
        <div className="relative h-48 bg-muted">
          <img
            src={mainImage.file_url}
            alt={service.name}
            className="w-full h-full object-cover"
          />
          {!service.is_active && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <Badge variant="secondary">Désactivé</Badge>
            </div>
          )}
        </div>
      )}

      {/* Contenu */}
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-lg line-clamp-2">{service.name}</h3>
          {!service.is_active && !mainImage && (
            <Badge variant="secondary">Désactivé</Badge>
          )}
        </div>

        <p className="text-sm text-muted-foreground line-clamp-3">
          {service.description}
        </p>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock size={16} />
            <span>{service.duration} min</span>
          </div>
          <div className="font-semibold text-foreground">
            {service.price}€
          </div>
        </div>

        {/* Actions (visible seulement pour le propriétaire) */}
        {isOwner && (
          <div className="flex gap-2 pt-2 border-t">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onEdit?.(service)}
              className="flex-1"
            >
              <Edit size={16} className="mr-1" />
              Modifier
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onToggleActive?.(service.id, !service.is_active)}
            >
              {service.is_active ? (
                <EyeOff size={16} />
              ) : (
                <Eye size={16} />
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onDelete?.(service.id)}
              className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
            >
              <Trash2 size={16} />
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};

export default ServiceCard;
