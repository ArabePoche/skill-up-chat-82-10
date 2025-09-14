
import React from 'react';
import { BookOpen, File, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ExerciseSubmission from './ExerciseSubmission';
import GroupExerciseSubmission from '../group-chat/GroupExerciseSubmission';
import { useExerciseWithFiles } from '@/hooks/useExerciseWithFiles';

interface Exercise {
  id: string;
  title: string;
  description?: string;
  content?: string;
}

interface ExerciseDisplayProps {
  exercise: Exercise;
  lessonId: string;
  formationId: string;
  isSubmitted?: boolean;
  showSubmissionOptions?: boolean;
  isTeacherView?: boolean;
  isGroupChat?: boolean; // Nouvelle prop pour identifier le type de chat
  levelId?: string; // Pour le chat de groupe
  canSubmitExercise?: boolean; // Nouveau prop pour contrôler l'accès
}

const ExerciseDisplay: React.FC<ExerciseDisplayProps> = ({
  exercise,
  lessonId,
  formationId,
  isSubmitted = false,
  showSubmissionOptions = true,
  isTeacherView = false,
  isGroupChat = false,
  levelId,
  canSubmitExercise
}) => {
  const { data: exerciseWithFiles } = useExerciseWithFiles(exercise.id);

  const handleFileDownload = (fileUrl: string, fileName?: string) => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName || 'fichier';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isTeacherView) {
    // Affichage pour les professeurs
    return (
      <div className="flex justify-start mb-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg shadow-sm max-w-xs p-4 relative">
          <div className="flex items-center space-x-2 mb-3">
            <div className="w-8 h-8 bg-blue-500 rounded-full text-white text-sm flex items-center justify-center">
              <BookOpen size={16} />
            </div>
            <span className="text-sm font-medium text-blue-700">Exercice</span>
          </div>
          
          <h4 className="font-semibold text-gray-800 mb-2">{exercise.title}</h4>
          {exercise.description && (
            <p className="text-sm text-gray-600 mb-3">{exercise.description}</p>
          )}
          {exercise.content && (
            <div className="bg-white p-3 rounded border mb-3">
              <p className="text-sm text-gray-800">{exercise.content}</p>
            </div>
          )}

          {/* Affichage des fichiers */}
          {exerciseWithFiles?.files && exerciseWithFiles.files.length > 0 && (
            <div className="space-y-2">
              <h5 className="text-sm font-medium text-gray-700">Fichiers :</h5>
              {exerciseWithFiles.files.map((file, index) => (
                <div key={file.id || index} className="flex items-center space-x-2 bg-white p-2 rounded border">
                  <File size={14} className="text-gray-500" />
                  <a 
                    href={file.file_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline flex-1 truncate"
                  >
                    {file.file_url.split('/').pop() || 'Fichier'}
                  </a>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleFileDownload(file.file_url, file.file_url.split('/').pop())}
                    className="p-1 h-6 w-6"
                  >
                    <Download size={12} />
                  </Button>
                </div>
              ))}
            </div>
          )}
          
          <div className="absolute left-0 top-0 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-blue-50 border-b-[8px] border-b-transparent transform -translate-x-2"></div>
        </div>
      </div>
    );
  }

  // Affichage pour les étudiants avec les fichiers
  const enhancedExercise = exerciseWithFiles ? {
    ...exercise,
    files: exerciseWithFiles.files
  } : exercise;

  // Utiliser le bon composant selon le type de chat
  if (isGroupChat && levelId) {
    return (
      <GroupExerciseSubmission
        exercise={enhancedExercise}
        formationId={formationId}
        levelId={levelId}
        isSubmitted={isSubmitted}
        showSubmissionOptions={showSubmissionOptions}
        canSubmitExercise={canSubmitExercise}
      />
    );
  }

  return (
    <ExerciseSubmission
      exercise={enhancedExercise}
      lessonId={lessonId}
      formationId={formationId}
      isSubmitted={isSubmitted}
      showSubmissionOptions={showSubmissionOptions}
      canSubmitExercise={canSubmitExercise}
    />
  );
};

export default ExerciseDisplay;