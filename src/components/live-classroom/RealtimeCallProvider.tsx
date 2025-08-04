// Provider pour le système d'appel en temps réel
import React from 'react';
import { useRealtimeCallSystem } from '@/hooks/useRealtimeCallSystem';
import StudentCallModal from './StudentCallModal';
import TeacherCallModal from './TeacherCallModal';

interface RealtimeCallProviderProps {
  formationId: string;
  lessonId: string;
  formationTitle?: string;
  lessonTitle?: string;
  children: React.ReactNode;
}

const RealtimeCallProvider: React.FC<RealtimeCallProviderProps> = ({
  formationId,
  lessonId,
  formationTitle,
  lessonTitle,
  children
}) => {
  const {
    currentCall,
    incomingCall,
    studentProfile,
    isStudentCallActive,
    isTeacherCallModalOpen,
    endCall,
    acceptCall,
    rejectCall
  } = useRealtimeCallSystem(formationId, lessonId);

  return (
    <>
      {children}
      
      {/* Modal côté étudiant */}
      <StudentCallModal
        isOpen={isStudentCallActive}
        onEndCall={endCall}
        callType={currentCall?.call_type || 'audio'}
        teacherName={currentCall?.receiver_id ? 'Professeur' : undefined}
      />
      
      {/* Modal côté professeur */}
      <TeacherCallModal
        isOpen={isTeacherCallModalOpen}
        onAccept={acceptCall}
        onReject={rejectCall}
        studentName={studentProfile ? `${studentProfile.first_name} ${studentProfile.last_name}` : 'Étudiant'}
        studentAvatar={studentProfile?.avatar_url}
        callType={incomingCall?.call_type || 'audio'}
        formationTitle={formationTitle}
        lessonTitle={lessonTitle}
      />
    </>
  );
};

export default RealtimeCallProvider;