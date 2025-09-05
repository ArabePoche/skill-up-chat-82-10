import React from 'react';
import { useTeacherPrivateDiscussions } from '@/hooks/teacher-discussions/useTeacherPrivateDiscussions';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { MessageCircle, User } from 'lucide-react';

interface TeacherPrivateDiscussionsListProps {
  formationId: string;
  onSelectDiscussion: (studentId: string, formationId: string, lessonId: string) => void;
}

/**
 * Composant pour afficher les discussions privées côté professeur
 * (organisé par leçon comme avant)
 */
const TeacherPrivateDiscussionsList: React.FC<TeacherPrivateDiscussionsListProps> = ({ 
  formationId, 
  onSelectDiscussion 
}) => {
  const { data: discussions, isLoading } = useTeacherPrivateDiscussions(formationId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-edu-primary"></div>
      </div>
    );
  }

  if (!discussions || discussions.length === 0) {
    return (
      <div className="text-center p-8 text-gray-500">
        <User size={48} className="mx-auto mb-4 opacity-50" />
        <p>Aucune discussion privée pour le moment</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center space-x-2 mb-4">
        <User size={20} className="text-blue-600" />
        <h2 className="text-lg font-semibold">Discussions privées</h2>
        <Badge variant="secondary">{discussions.length}</Badge>
      </div>
      
      {discussions.map((discussion) => (
        <div
          key={`${discussion.student_id}-${discussion.lesson_id}`}
          onClick={() => onSelectDiscussion(
            discussion.student_id,
            formationId,
            discussion.lesson_id
          )}
          className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors border-l-4 border-blue-200"
        >
          <Avatar className="h-12 w-12">
            <AvatarImage src={discussion.student_profile?.avatar_url} />
            <AvatarFallback className="bg-blue-100">
              {discussion.student_profile?.first_name?.charAt(0) || 
               discussion.student_profile?.last_name?.charAt(0) || 'E'}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-900 truncate">
                {`${discussion.student_profile?.first_name || ''} ${discussion.student_profile?.last_name || ''}`.trim() || 
                 discussion.student_profile?.username || 'Étudiant'}
              </p>
              {discussion.unread_count > 0 && (
                <Badge variant="default" className="ml-2 bg-blue-600">
                  {discussion.unread_count}
                </Badge>
              )}
            </div>
            
            <p className="text-sm text-blue-600 font-medium truncate">
              📚 {discussion.lesson_title || 'Leçon'}
            </p>
            
            <p className="text-xs text-gray-400 truncate">
              {discussion.last_message_content}
            </p>
            
            <p className="text-xs text-gray-400">
              {discussion.last_message_time && formatDistanceToNow(
                new Date(discussion.last_message_time), 
                { addSuffix: true, locale: fr }
              )}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TeacherPrivateDiscussionsList;