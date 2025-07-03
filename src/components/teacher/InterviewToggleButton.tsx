
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Play, PhoneOff, CheckCircle, Users, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useActiveInterview, useStartInterview, useEndInterview } from '@/hooks/useActiveInterview';
import { useAuth } from '@/hooks/useAuth';

interface InterviewToggleButtonProps {
  lessonId: string;
  formationId: string;
  studentId: string;
  studentName: string;
}

const InterviewToggleButton: React.FC<InterviewToggleButtonProps> = ({
  lessonId,
  formationId,
  studentId,
  studentName
}) => {
  const { user } = useAuth();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'start' | 'end'>('start');
  
  const { data: activeInterview, isLoading, error: fetchError } = useActiveInterview(lessonId, formationId, studentId);
  const startInterviewMutation = useStartInterview();
  const endInterviewMutation = useEndInterview();

  if (fetchError) {
    console.error('Error fetching interview data:', fetchError);
  }

  // Vérifier si l'utilisateur actuel est celui qui a commencé l'entretien
  const isCurrentUserInInterview = activeInterview?.teacher?.user_id === user?.id;
  const isInterviewActiveByOther = activeInterview && !isCurrentUserInInterview;

  console.log('InterviewToggleButton Debug:', {
    userId: user?.id,
    activeInterview,
    isCurrentUserInInterview,
    isInterviewActiveByOther,
    lessonId,
    formationId,
    studentId,
    fetchError: fetchError?.message
  });

  const handleStartInterview = async () => {
    if (!user?.id) {
      toast.error('Utilisateur non authentifié');
      return;
    }

    try {
      console.log('Tentative de démarrage d\'entretien...');
      await startInterviewMutation.mutateAsync({
        lessonId,
        formationId,
        studentId,
      });
      
      setIsConfirmOpen(false);
    } catch (error) {
      console.error('Error starting interview:', error);
    }
  };

  const handleEndInterview = async () => {
    if (!user?.id || !activeInterview?.teacher_id) {
      toast.error('Utilisateur non authentifié ou entretien introuvable');
      return;
    }

    try {
      console.log('Tentative de fin d\'entretien...');
      await endInterviewMutation.mutateAsync({
        lessonId,
        formationId,
        studentId,
        teacherId: activeInterview.teacher_id
      });
      
      setIsConfirmOpen(false);
    } catch (error) {
      console.error('Error ending interview:', error);
    }
  };

  const openConfirmDialog = (action: 'start' | 'end') => {
    setConfirmAction(action);
    setIsConfirmOpen(true);
  };

  if (fetchError && !isLoading) {
    return (
      <div className="fixed right-4 top-1/2 transform -translate-y-1/2 z-50">
        <div className="bg-red-100 border border-red-300 rounded-lg p-3 max-w-xs">
          <div className="flex items-center gap-2 text-red-800 text-sm">
            <AlertCircle size={16} />
            <span className="font-medium">Erreur de chargement</span>
          </div>
          <p className="text-xs text-red-600 mt-1">
            Impossible de vérifier le statut de l'entretien
          </p>
        </div>
      </div>
    );
  }

  const isActive = isCurrentUserInInterview;
  const isProcessing = startInterviewMutation.isPending || endInterviewMutation.isPending || isLoading;

  return (
    <>
      <div className="fixed right-4 top-1/2 transform -translate-y-1/2 z-50">
        {isInterviewActiveByOther ? (
          <div className="bg-orange-100 border border-orange-300 rounded-lg p-3 max-w-xs mb-2">
            <div className="flex items-center gap-2 text-orange-800 text-sm">
              <Users size={16} />
              <span className="font-medium">🟢 Entretien en cours</span>
            </div>
            <p className="text-xs text-orange-600 mt-1">
              {activeInterview?.teacher?.profiles 
                ? `Avec ${activeInterview.teacher.profiles.first_name || ''} ${activeInterview.teacher.profiles.last_name || ''}`.trim() || activeInterview.teacher.profiles.username || 'un professeur'
                : 'avec un autre professeur'
              }
            </p>
          </div>
        ) : null}
        
        <Button
          onClick={() => openConfirmDialog(isActive ? 'end' : 'start')}
          disabled={isProcessing || (isInterviewActiveByOther && !isCurrentUserInInterview)}
          className={`
            shadow-lg hover:shadow-xl transition-all duration-200 rounded-full w-14 h-14 p-0 flex items-center justify-center
            ${isActive 
              ? 'bg-red-500 hover:bg-red-600 text-white' 
              : 'bg-green-500 hover:bg-green-600 text-white'
            }
            ${(isInterviewActiveByOther && !isCurrentUserInInterview) ? 'opacity-50 cursor-not-allowed' : ''}
          `}
          size="lg"
          title={isActive ? 'Terminer l\'entretien' : 'Commencer l\'entretien'}
        >
          {isProcessing ? (
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
          ) : isActive ? (
            <PhoneOff size={20} />
          ) : (
            <Play size={20} />
          )}
        </Button>
      </div>

      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="text-green-500" size={20} />
              {confirmAction === 'start' ? 'Commencer l\'entretien' : 'Terminer l\'entretien'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-gray-600">
              {confirmAction === 'start' 
                ? `Êtes-vous sûr de vouloir commencer un entretien avec ${studentName} ?`
                : 'Êtes-vous sûr de vouloir terminer cet entretien ?'
              }
            </p>
            
            <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-800">
              <p className="font-medium mb-1">📋 Ce qui va se passer :</p>
              <ul className="list-disc list-inside space-y-1">
                {confirmAction === 'start' ? (
                  <>
                    <li>L'entretien sera marqué comme actif</li>
                    <li>Un indicateur sera visible pour les autres professeurs</li>
                    <li>Vous pourrez communiquer en privé avec l'élève</li>
                  </>
                ) : (
                  <>
                    <li>L'entretien sera marqué comme terminé</li>
                    <li>Une enquête de satisfaction sera envoyée à l'élève</li>
                    <li>Vous serez rémunéré selon les règles de tarification</li>
                    <li>Si l'élève ne répond pas sous 24h, la satisfaction sera implicite</li>
                  </>
                )}
              </ul>
            </div>
            
            {(startInterviewMutation.error || endInterviewMutation.error) && (
              <div className="bg-red-50 p-3 rounded-lg text-sm text-red-800 border border-red-200">
                <div className="flex items-center gap-2">
                  <AlertCircle size={16} />
                  <span className="font-medium">Erreur détectée :</span>
                </div>
                <p className="mt-1">
                  {startInterviewMutation.error?.message || endInterviewMutation.error?.message}
                </p>
              </div>
            )}
            
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setIsConfirmOpen(false)}
                disabled={isProcessing}
              >
                Annuler
              </Button>
              <Button
                onClick={confirmAction === 'start' ? handleStartInterview : handleEndInterview}
                disabled={isProcessing}
                className={confirmAction === 'start' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'}
              >
                {isProcessing 
                  ? 'Traitement...' 
                  : confirmAction === 'start' 
                    ? 'Commencer l\'entretien'
                    : 'Terminer l\'entretien'
                }
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default InterviewToggleButton;
