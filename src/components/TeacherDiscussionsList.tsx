
import React from 'react';
import { MessageCircle, Clock, User, Users } from 'lucide-react';
import { useTeacherDiscussionsWithUnread } from '@/hooks/useTeacherDiscussionsWithUnread';
import { useMarkMessagesAsRead } from '@/hooks/useMarkMessagesAsRead';
import { useActiveInterview } from '@/hooks/useActiveInterview';

interface TeacherDiscussionsListProps {
  formationId: string;
  onSelectDiscussion: (studentId: string, lessonId: string, studentName: string, lessonTitle: string, studentProfile?: any) => void;
}

const TeacherDiscussionsList: React.FC<TeacherDiscussionsListProps> = ({
  formationId,
  onSelectDiscussion
}) => {
  const { data: discussions = [], isLoading, error } = useTeacherDiscussionsWithUnread(formationId);
  const markAsReadMutation = useMarkMessagesAsRead();

  const formatStudentName = (profile: any) => {
    if (!profile) return 'Étudiant inconnu';
    const firstName = profile.first_name || '';
    const lastName = profile.last_name || '';
    return `${firstName} ${lastName}`.trim() || profile.username || 'Étudiant';
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays}j`;
    } else if (diffHours > 0) {
      return `${diffHours}h`;
    } else {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return `${diffMinutes}min`;
    }
  };

  const handleDiscussionClick = (discussion: any) => {
    // Marquer comme lu automatiquement
    markAsReadMutation.mutate({
      formationId,
      lessonId: discussion.lesson_id,
      studentId: discussion.student_id
    });

    // Ouvrir la discussion en passant le profil étudiant
    onSelectDiscussion(
      discussion.student_id,
      discussion.lesson_id,
      formatStudentName(discussion.student_profile),
      discussion.lesson_title,
      discussion.student_profile
    );
  };

  // Composant pour afficher l'indicateur d'entretien actif
  const InterviewIndicator = ({ discussion }: { discussion: any }) => {
    const { data: activeInterview } = useActiveInterview(
      discussion.lesson_id,
      formationId,
      discussion.student_id
    );

    if (!activeInterview) return null;

    const teacherName = activeInterview.instructor?.profiles 
      ? `${activeInterview.instructor.profiles.first_name || ''} ${activeInterview.instructor.profiles.last_name || ''}`.trim() || activeInterview.instructor.profiles.username || 'Professeur'
      : 'Professeur';

    return (
      <div className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full flex items-center gap-1 mt-1">
        <Users size={12} />
        <span>🟢 Professeur {teacherName} en entretien</span>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="text-gray-500">Chargement des discussions...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="text-red-500">Erreur lors du chargement</div>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      {discussions.length > 0 ? (
        discussions.map((discussion) => (
          <div
            key={`${discussion.student_id}-${discussion.lesson_id}`}
            className={`flex items-center p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
              discussion.unread_count > 0 ? 'bg-blue-50' : 'bg-white'
            }`}
            onClick={() => handleDiscussionClick(discussion)}
          >
            <div className="relative mr-3">
              <div className="w-12 h-12 bg-[#25d366] rounded-full flex items-center justify-center overflow-hidden">
                {discussion.student_profile?.avatar_url ? (
                  <img 
                    src={discussion.student_profile.avatar_url} 
                    alt={formatStudentName(discussion.student_profile)} 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <User size={20} className="text-white" />
                )}
              </div>
              {discussion.unread_count > 0 && (
                <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {discussion.unread_count > 9 ? '9+' : discussion.unread_count}
                </div>
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h3 className={`truncate ${
                  discussion.unread_count > 0 ? 'font-semibold text-gray-900' : 'font-medium text-gray-900'
                }`}>
                  {formatStudentName(discussion.student_profile)}
                </h3>
                <span className="text-xs text-gray-500 flex-shrink-0 flex items-center">
                  <Clock size={12} className="mr-1" />
                  {formatTime(discussion.last_message_time)}
                </span>
              </div>
              <p className="text-sm text-blue-600 font-medium mb-1">
                📖 {discussion.lesson_title}
              </p>
              <p className={`text-sm truncate ${
                discussion.unread_count > 0 ? 'text-gray-800' : 'text-gray-600'
              }`}>
                {discussion.last_message_content}
              </p>
              <InterviewIndicator discussion={discussion} />
            </div>
            
            <div className="ml-2 flex items-center space-x-2">
              <MessageCircle 
                size={16} 
                className={discussion.unread_count > 0 ? 'text-[#25d366]' : 'text-gray-400'} 
              />
            </div>
          </div>
        ))
      ) : (
        <div className="text-center py-8">
          <MessageCircle size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 mb-2">Aucune discussion</p>
          <p className="text-sm text-gray-400">Les discussions apparaîtront ici quand les étudiants enverront des messages</p>
        </div>
      )}
    </div>
  );
};

export default TeacherDiscussionsList;
