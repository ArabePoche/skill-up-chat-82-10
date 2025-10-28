// Carte de candidature pour les recruteurs
import React from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Check, X, Download, User, MessageSquare, Phone } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Application } from '../hooks/useApplications';

interface ApplicationCardProps {
  application: Application;
  onApprove: (applicationId: string) => void;
  onReject: (applicationId: string) => void;
  isUpdating?: boolean;
}

export const ApplicationCard: React.FC<ApplicationCardProps> = ({
  application,
  onApprove,
  onReject,
  isUpdating
}) => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-600">Approuvée</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejetée</Badge>;
      case 'pending':
      default:
        return <Badge variant="secondary">En attente</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="w-12 h-12">
              <AvatarImage src={application.profiles?.avatar_url} />
              <AvatarFallback className="bg-primary text-primary-foreground">
                <User size={20} />
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold">
                {application.profiles?.first_name} {application.profiles?.last_name}
              </h3>
              <p className="text-sm text-muted-foreground">
                {formatDistanceToNow(new Date(application.created_at), {
                  addSuffix: true,
                  locale: fr
                })}
              </p>
            </div>
          </div>
          {getStatusBadge(application.status)}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Message de motivation */}
        {application.message && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Message</span>
            </div>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {application.message}
            </p>
          </div>
        )}

        {/* Téléphone */}
        {application.profiles?.phone && (
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{application.profiles.phone}</span>
          </div>
        )}

        {/* CV téléchargeable */}
        {application.cv_url && (
          <div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(application.cv_url!, '_blank')}
              className="w-full"
            >
              <Download className="h-4 w-4 mr-2" />
              Télécharger le CV
            </Button>
          </div>
        )}
      </CardContent>

      {/* Actions uniquement si en attente */}
      {application.status === 'pending' && (
        <CardFooter className="flex gap-2">
          <Button
            onClick={() => onApprove(application.id)}
            disabled={isUpdating}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            <Check className="h-4 w-4 mr-2" />
            Approuver
          </Button>
          <Button
            onClick={() => onReject(application.id)}
            disabled={isUpdating}
            variant="destructive"
            className="flex-1"
          >
            <X className="h-4 w-4 mr-2" />
            Rejeter
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};
