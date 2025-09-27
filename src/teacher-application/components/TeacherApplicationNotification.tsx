import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserPlus, Clock, Eye } from 'lucide-react';
import { usePendingTeacherApplicationsCount } from '../hooks/useTeacherApplications';

interface TeacherApplicationNotificationProps {
  onViewApplications?: () => void;
}

export const TeacherApplicationNotification: React.FC<TeacherApplicationNotificationProps> = ({ 
  onViewApplications 
}) => {
  const { data: pendingCount, isLoading } = usePendingTeacherApplicationsCount();

  if (isLoading || !pendingCount || pendingCount === 0) {
    return null;
  }

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-800">
          <UserPlus className="h-5 w-5" />
          Nouvelles candidatures d'encadreurs
          <Badge variant="secondary" className="bg-orange-200 text-orange-800">
            {pendingCount}
          </Badge>
        </CardTitle>
        <CardDescription className="text-orange-700">
          {pendingCount} candidature{pendingCount > 1 ? 's' : ''} en attente de validation
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-orange-700">
            <Clock className="h-4 w-4" />
            <span>Action requise</span>
          </div>
          <Button 
            onClick={onViewApplications}
            size="sm"
            className="bg-orange-600 hover:bg-orange-700"
          >
            <Eye className="h-4 w-4 mr-2" />
            Examiner les candidatures
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};