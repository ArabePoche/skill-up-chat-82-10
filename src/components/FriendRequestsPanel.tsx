import React from 'react';
import { usePendingRequests } from '@/hooks/useFollow';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Check, X, User } from 'lucide-react';
import { useFollow } from '@/hooks/useFollow';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';
import { fr, ar, es, enUS } from 'date-fns/locale';
import VerifiedBadge from '@/components/VerifiedBadge';
import { useTranslation } from 'react-i18next';

/**
 * Composant pour afficher et gérer les demandes d'amitié en attente
 */
const FriendRequestsPanel: React.FC = () => {
  const { t } = useTranslation();
  const { data: pendingRequests = [] } = usePendingRequests();

  if (pendingRequests.length === 0) {
    return null;
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-lg">
          {t('profile.friendRequests')} ({pendingRequests.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {pendingRequests.map((request: any) => (
          <FriendRequestItem key={request.id} request={request} />
        ))}
      </CardContent>
    </Card>
  );
};

const FriendRequestItem: React.FC<{ request: any }> = ({ request }) => {
  const { t, i18n } = useTranslation();
  const { acceptRequest, cancelRequest, isLoading } = useFollow(request.sender_id);

  const getLocale = () => {
    switch (i18n.language) {
      case 'ar': return ar;
      case 'es': return es;
      case 'en': return enUS;
      default: return fr;
    }
  };

  return (
    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
      <div className="flex items-center gap-3">
        <Avatar className="w-10 h-10">
          <AvatarImage src={request.sender?.avatar_url} />
          <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
            <User size={18} />
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium inline-flex items-center gap-1">
            {request.sender?.first_name || request.sender?.username || t('profile.user')}
            {request.sender?.is_verified && <VerifiedBadge size={14} showTooltip={false} />}
          </p>
          <p className="text-xs text-muted-foreground">
            {request.sender?.username ? `@${request.sender.username}` : ''}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(request.created_at), { addSuffix: true, locale: getLocale() })}
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={() => acceptRequest()}
          disabled={isLoading}
          className="bg-green-500 hover:bg-green-600"
        >
          <Check size={16} />
        </Button>
        <Button
          size="sm"
          variant="destructive"
          onClick={() => cancelRequest()}
          disabled={isLoading}
        >
          <X size={16} />
        </Button>
      </div>
    </div>
  );
};

export default FriendRequestsPanel;
