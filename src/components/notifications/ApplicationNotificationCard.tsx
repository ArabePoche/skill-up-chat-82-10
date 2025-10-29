/**
 * Carte de notification pour les candidatures reçues par les recruteurs
 */
import React, { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Check, X, User, MessageSquare, Phone, FileText, Clock, Download } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useUpdateApplicationStatus } from '@/applications/hooks/useApplications';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import VerifiedBadge from '@/components/VerifiedBadge';

interface ApplicationNotificationCardProps {
  notification: {
    id: string;
    application_id: string;
    created_at: string;
    is_read: boolean;
    title: string;
    message: string;
  };
}

const ApplicationNotificationCard: React.FC<ApplicationNotificationCardProps> = ({ 
  notification 
}) => {
  const queryClient = useQueryClient();
  const { mutateAsync: updateStatus, isPending: isUpdating } = useUpdateApplicationStatus();
  const [localStatus, setLocalStatus] = useState<string | null>(null);

  // Récupérer les détails de la candidature
  const { data: applicationData, isLoading } = useQuery({
    queryKey: ['application', notification.application_id],
    queryFn: async () => {
      const { data: application, error: appError } = await supabase
        .from('applications')
        .select('*')
        .eq('id', notification.application_id)
        .single();

      if (appError) throw appError;

      // Récupérer le profil du candidat
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, avatar_url, phone, is_verified')
        .eq('id', application.user_id)
        .single();

      // Récupérer les fichiers de candidature
      const { data: files } = await supabase
        .from('application_files')
        .select('*')
        .eq('application_id', notification.application_id);

      return {
        ...application,
        profile,
        files: files || []
      };
    },
    enabled: !!notification.application_id,
  });

  // Marquer comme lue à l'affichage
  React.useEffect(() => {
    if (!notification.is_read) {
      const markAsRead = async () => {
        await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('id', notification.id);
        
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
        queryClient.invalidateQueries({ queryKey: ['unread-counts'] });
      };
      
      const timer = setTimeout(markAsRead, 500);
      return () => clearTimeout(timer);
    }
  }, [notification.id, notification.is_read, queryClient]);

  const handleApprove = async () => {
    try {
      await updateStatus({
        applicationId: notification.application_id,
        status: 'approved'
      });
      setLocalStatus('approved');
      queryClient.invalidateQueries({ queryKey: ['application', notification.application_id] });
    } catch (error) {
      console.error('Erreur lors de l\'approbation:', error);
    }
  };

  const handleReject = async () => {
    try {
      await updateStatus({
        applicationId: notification.application_id,
        status: 'rejected'
      });
      setLocalStatus('rejected');
      queryClient.invalidateQueries({ queryKey: ['application', notification.application_id] });
    } catch (error) {
      console.error('Erreur lors du rejet:', error);
    }
  };

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

  const timeAgo = formatDistanceToNow(new Date(notification.created_at), {
    addSuffix: true,
    locale: fr
  });

  if (isLoading) {
    return (
      <Card className={`${!notification.is_read ? 'border-l-4 border-l-blue-500' : ''}`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <span className="text-muted-foreground">Chargement...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!applicationData) {
    return null;
  }

  const currentStatus = localStatus || applicationData.status;

  return (
    <Card className={`${!notification.is_read ? 'border-l-4 border-l-blue-500' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="w-12 h-12">
              <AvatarImage src={applicationData.profile?.avatar_url} />
              <AvatarFallback className="bg-primary text-primary-foreground">
                <User size={20} />
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold inline-flex items-center gap-1">
                {applicationData.profile?.first_name} {applicationData.profile?.last_name}
                {applicationData.profile?.is_verified && <VerifiedBadge size={14} showTooltip={false} />}
              </h3>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock size={12} />
                {timeAgo}
              </p>
            </div>
          </div>
          {getStatusBadge(currentStatus)}
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-0">
        {/* Message de motivation */}
        {applicationData.message && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Message de motivation</span>
            </div>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted p-3 rounded-md">
              {applicationData.message}
            </p>
          </div>
        )}

        {/* Téléphone */}
        {applicationData.profile?.phone && (
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{applicationData.profile.phone}</span>
          </div>
        )}

        {/* Fichiers téléchargeables */}
        {applicationData.files && applicationData.files.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Documents joints ({applicationData.files.length})</span>
            </div>
            <div className="space-y-2">
              {applicationData.files.map((file: any) => (
                <Button
                  key={file.id}
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(file.file_url, '_blank')}
                  className="w-full justify-start"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {file.file_name}
                  <span className="text-xs text-muted-foreground ml-auto">
                    {(file.file_size / 1024).toFixed(0)} KB
                  </span>
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* CV (legacy) */}
        {applicationData.cv_url && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(applicationData.cv_url!, '_blank')}
            className="w-full"
          >
            <Download className="h-4 w-4 mr-2" />
            Télécharger le CV
          </Button>
        )}
      </CardContent>

      {/* Actions uniquement si en attente */}
      {currentStatus === 'pending' && (
        <CardFooter className="flex gap-2 pt-0">
          <Button
            onClick={handleApprove}
            disabled={isUpdating}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            <Check className="h-4 w-4 mr-2" />
            Approuver
          </Button>
          <Button
            onClick={handleReject}
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

export default ApplicationNotificationCard;
