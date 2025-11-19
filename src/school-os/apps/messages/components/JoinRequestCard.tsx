import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Check, X, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface JoinRequestCardProps {
  request: any;
  onApprove: () => void;
  onReject: () => void;
  isApproving: boolean;
  isRejecting: boolean;
}

/**
 * Carte pour afficher une demande d'adhésion à l'école
 */
export const JoinRequestCard: React.FC<JoinRequestCardProps> = ({
  request,
  onApprove,
  onReject,
  isApproving,
  isRejecting,
}) => {
  const role = request.role;
  const formData = request.form_data || {};
  const sender = request.user;

  const getInitials = (firstName?: string, lastName?: string) => {
    if (!firstName && !lastName) return '?';
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'teacher':
        return 'bg-primary/10 text-primary';
      case 'student':
        return 'bg-secondary/10 text-secondary';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'teacher':
        return 'Enseignant';
      case 'student':
        return 'Élève';
      default:
        return 'Inconnu';
    }
  };

  return (
    <Card className="p-4">
      <div className="flex items-start gap-4">
        <Avatar className="h-12 w-12">
          <AvatarImage src={sender?.avatar_url} />
          <AvatarFallback>
            {getInitials(sender?.first_name, sender?.last_name)}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-semibold">
                  {sender?.first_name} {sender?.last_name}
                </h4>
                <Badge variant="outline" className={getRoleBadgeColor(role)}>
                  {getRoleLabel(role)}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{sender?.email}</p>
            </div>
            
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {formatDistanceToNow(new Date(request.created_at), {
                addSuffix: true,
                locale: fr,
              })}
            </div>
          </div>

          {/* Informations supplémentaires du formulaire */}
          {Object.keys(formData).length > 0 && (
            <div className="rounded-md bg-muted p-3 text-sm space-y-1">
              {formData.class && (
                <div>
                  <span className="font-medium">Classe :</span> {formData.class}
                </div>
              )}
              {formData.message && (
                <div>
                  <span className="font-medium">Message :</span>
                  <p className="mt-1 text-muted-foreground">{formData.message}</p>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          {request.status === 'pending' && (
            <div className="flex items-center gap-2 pt-2">
              <Button
                size="sm"
                onClick={onApprove}
                disabled={isApproving || isRejecting}
                className="gap-1"
              >
                <Check className="h-4 w-4" />
                Approuver
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={onReject}
                disabled={isApproving || isRejecting}
                className="gap-1"
              >
                <X className="h-4 w-4" />
                Refuser
              </Button>
            </div>
          )}
          
          {request.status === 'approved' && (
            <div className="pt-2">
              <Badge variant="default" className="w-fit">
                Approuvée
              </Badge>
            </div>
          )}
          
          {request.status === 'rejected' && (
            <div className="pt-2">
              <Badge variant="destructive" className="w-fit">
                Refusée
                {request.rejection_reason && (
                  <span className="ml-1 text-xs">: {request.rejection_reason}</span>
                )}
              </Badge>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
