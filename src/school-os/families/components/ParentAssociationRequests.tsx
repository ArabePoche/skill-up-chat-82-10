// Composant pour gérer les demandes d'association parentale (approbation/refus)
import React from 'react';
import { Check, X, Clock, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useMyFamilyPendingRequests, useHandleAssociationRequest } from '../hooks/useParentalCode';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

export const ParentAssociationRequests: React.FC = () => {
  const { data: requests = [], isLoading } = useMyFamilyPendingRequests();
  const handleMutation = useHandleAssociationRequest();

  if (isLoading) return null;
  if (requests.length === 0) return null;

  return (
    <Card className="border-orange-200 bg-orange-50/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <UserPlus className="w-5 h-5 text-orange-600" />
          Demandes d'accès parental
          <Badge variant="secondary" className="ml-auto">{requests.length}</Badge>
        </CardTitle>
        <CardDescription>
          Des parents souhaitent accéder aux informations de vos enfants
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {requests.map((request: any) => {
          const profile = request.profiles;
          const family = request.school_student_families;
          const initials = profile
            ? `${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}`
            : '?';

          return (
            <div
              key={request.id}
              className="flex items-center gap-3 p-3 bg-background rounded-lg border"
            >
              <Avatar className="h-10 w-10">
                <AvatarImage src={profile?.avatar_url} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">
                  {profile?.first_name} {profile?.last_name}
                </p>
                <p className="text-xs text-muted-foreground">
                  Famille : {family?.family_name}
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDistanceToNow(new Date(request.created_at), { addSuffix: true, locale: fr })}
                </p>
              </div>

              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-green-600 hover:bg-green-50"
                  onClick={() => handleMutation.mutate({ requestId: request.id, action: 'approve' })}
                  disabled={handleMutation.isPending}
                >
                  <Check className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-600 hover:bg-red-50"
                  onClick={() => handleMutation.mutate({ requestId: request.id, action: 'reject' })}
                  disabled={handleMutation.isPending}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
