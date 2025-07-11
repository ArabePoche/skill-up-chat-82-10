
import React from 'react';
import { useTeacherDiscussionsWithUnread } from '@/hooks/useTeacherDiscussionsWithUnread';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageCircle, Clock, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface TeacherDiscussionsListProps {
  onSelectDiscussion: (studentId: string, formationId: string, lessonId: string) => void;
}

const TeacherDiscussionsList: React.FC<TeacherDiscussionsListProps> = ({
  onSelectDiscussion
}) => {
  const { data: discussions, isLoading, error } = useTeacherDiscussionsWithUnread();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500 p-4">
        Erreur lors du chargement des discussions
      </div>
    );
  }

  if (!discussions || discussions.length === 0) {
    return (
      <div className="text-center text-gray-500 p-8">
        <MessageCircle className="mx-auto h-12 w-12 mb-4 opacity-50" />
        <p>Aucune discussion active</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold mb-4">Discussions actives</h2>
      
      {discussions.map((discussion) => (
        <Card 
          key={`${discussion.student_id}-${discussion.formation_id}-${discussion.lesson_id}`}
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => onSelectDiscussion(
            discussion.student_id, 
            discussion.formation_id, 
            discussion.lesson_id
          )}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage 
                    src={discussion.teacher?.avatar_url || ''} 
                    alt={discussion.teacher?.first_name || 'Professeur'} 
                  />
                  <AvatarFallback>
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-base">
                    {discussion.teacher?.first_name} {discussion.teacher?.last_name}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    @{discussion.teacher?.username || discussion.teacher?.first_name}
                  </p>
                </div>
              </div>
              
              {discussion.unread_count > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {discussion.unread_count}
                </Badge>
              )}
            </div>
          </CardHeader>
          
          <CardContent className="pt-0">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4" />
                <span>
                  {formatDistanceToNow(new Date(discussion.last_message_at), {
                    addSuffix: true,
                    locale: fr
                  })}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <MessageCircle className="h-4 w-4" />
                <span>{discussion.total_messages} messages</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default TeacherDiscussionsList;
