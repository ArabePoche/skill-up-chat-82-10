import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PhoneOff, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface InterviewEndButtonProps {
  lessonId: string;
  formationId: string;
  studentId: string;
  teacherId: string;
}

const InterviewEndButton: React.FC<InterviewEndButtonProps> = ({
  lessonId,
  formationId,
  studentId,
  teacherId
}) => {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isEnding, setIsEnding] = useState(false);

  const handleEndInterview = async () => {
    setIsEnding(true);
    
    try {
      console.log('Starting interview end process...', {
        lessonId,
        formationId,
        studentId,
        teacherId
      });

      // 1. Marquer l'entretien comme terminé et récupérer l'ID de la session
      const { data: updatedSession, error: sessionError } = await supabase
        .from('active_interviews')
        .update({ 
          is_active: false,
          ended_at: new Date().toISOString()
        })
        .eq('teacher_id', teacherId)
        .eq('student_id', studentId)
        .eq('lesson_id', lessonId)
        .eq('formation_id', formationId)
        .select()
        .single();

      if (sessionError || !updatedSession) {
        console.error('Error ending interview session:', sessionError);
        toast.error('Erreur lors de la mise à jour de la session d\'entretien');
        return;
      }

      console.log('Interview session ended successfully:', updatedSession);

      // 2. Créer l'évaluation d'entretien (expire dans 24h) avec le lien vers la session
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      const { data: evaluation, error: evalError } = await supabase
        .from('interview_evaluations')
        .insert({
          student_id: studentId,
          teacher_id: teacherId,
          lesson_id: lessonId,
          formation_id: formationId,
          interview_session_id: updatedSession.id, // Lier à la session d'entretien
          expires_at: expiresAt.toISOString()
        })
        .select()
        .single();

      if (evalError) {
        console.error('Error creating evaluation:', evalError);
        toast.error('Erreur lors de la création de l\'évaluation');
        return;
      }

      console.log('Evaluation created successfully:', evaluation);

      // 3. Envoyer le message système avec l'enquête dans lesson_messages
      const SYSTEM_USER_ID = '4c32c988-3b19-4eca-87cb-0e0595fd7fbb';
      
      const { data: message, error: messageError } = await supabase
        .from('lesson_messages')
        .insert({
          lesson_id: lessonId,
          formation_id: formationId,
          sender_id: SYSTEM_USER_ID,
          receiver_id: studentId,
          content: `🎯 Entretien terminé avec votre professeur.\n\n📋 Une enquête de satisfaction vous a été envoyée. Votre avis nous aide à améliorer nos services.\n\n⏰ Vous avez 24h pour répondre. Passé ce délai, nous considérerons que vous êtes satisfait de cet entretien.\n\n🔗 ID de l'évaluation: ${evaluation.id}`,
          message_type: 'system',
          is_system_message: true
        })
        .select()
        .single();

      if (messageError) {
        console.error('Error sending evaluation message:', messageError);
        toast.warning('Entretien terminé mais l\'envoi du message d\'évaluation a échoué');
      } else {
        console.log('Evaluation message sent successfully:', message);
        toast.success('L\'enquête de satisfaction a été envoyée à l\'élève');
      }

      toast.success('Entretien terminé avec succès! 🎉');
      setIsConfirmOpen(false);
      
    } catch (error) {
      console.error('Unexpected error ending interview:', error);
      toast.error(`Erreur inattendue : ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setIsEnding(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => setIsConfirmOpen(true)}
        className="bg-red-500 hover:bg-red-600 text-white shadow-lg hover:shadow-xl transition-all duration-200 rounded-full w-14 h-14 p-0 flex items-center justify-center"
        size="lg"
      >
        <PhoneOff size={20} />
      </Button>

      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="text-green-500" size={20} />
              Terminer l'entretien
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-gray-600">
              Êtes-vous sûr de vouloir terminer cet entretien ?
            </p>
            
            <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-800">
              <p className="font-medium mb-1">📋 Ce qui va se passer :</p>
              <ul className="list-disc list-inside space-y-1">
                <li>L'entretien sera marqué comme terminé</li>
                <li>Une enquête de satisfaction sera envoyée à l'élève via message système</li>
                <li>L'élève recevra une notification immédiate</li>
                <li>Vous serez rémunéré selon les règles de tarification</li>
                <li>Si l'élève ne répond pas sous 24h, la satisfaction sera implicite</li>
              </ul>
            </div>
            
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setIsConfirmOpen(false)}
                disabled={isEnding}
              >
                Annuler
              </Button>
              <Button
                onClick={handleEndInterview}
                disabled={isEnding}
                className="bg-red-500 hover:bg-red-600"
              >
                {isEnding ? 'Finalisation...' : 'Terminer l\'entretien'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default InterviewEndButton;
