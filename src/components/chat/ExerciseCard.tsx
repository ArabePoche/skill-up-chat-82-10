
import React from 'react';
import { BookOpen } from 'lucide-react';
import ExerciseFilePreview from '@/components/shared/ExerciseFilePreview';

interface ExerciseFile {
  id?: string;
  file_url: string;
  file_type: string;
}

interface Exercise {
  id: string;
  title: string;
  description?: string;
  content?: string;
  files?: ExerciseFile[];
}

interface ExerciseCardProps {
  exercise: Exercise;
  children?: React.ReactNode;
}

const ExerciseCard: React.FC<ExerciseCardProps> = ({ exercise, children }) => {

  return (
    <div className="flex justify-start mb-4">
      <div className="bg-primary/5 border border-primary/20 rounded-lg shadow-sm max-w-md p-4 relative">
        <div className="flex items-center space-x-2 mb-3">
          <div className="w-8 h-8 bg-primary rounded-full text-primary-foreground text-sm flex items-center justify-center">
            <BookOpen size={16} />
          </div>
          <span className="text-sm font-medium text-primary">Exercice</span>
        </div>
        
        <h4 className="font-semibold text-foreground mb-2">{exercise.title}</h4>
        
        {exercise.description && (
          <p className="text-sm text-muted-foreground mb-3">{exercise.description}</p>
        )}
        
        {exercise.content && (
          <div className="bg-secondary p-3 rounded border mb-3">
            <p className="text-sm text-foreground whitespace-pre-wrap">{exercise.content}</p>
          </div>
        )}

        {/* Prévisualisation des fichiers de l'exercice */}
        {exercise.files && exercise.files.length > 0 && (
          <div className="space-y-3 mb-4">
            <h5 className="text-sm font-semibold text-foreground">Fichiers joints :</h5>
            <div className="grid grid-cols-1 gap-3">
              {exercise.files
                .filter((file, index, self) => 
                  // Supprimer les doublons basés sur l'URL du fichier
                  index === self.findIndex(f => f.file_url === file.file_url)
                )
                .map((file, index) => (
                  <ExerciseFilePreview 
                    key={file.id || `${file.file_url}-${index}`} 
                    file={file} 
                  />
                ))
              }
            </div>
          </div>
        )}
        
        {children}
        
        <div className="absolute left-0 top-0 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-primary/5 border-b-[8px] border-b-transparent transform -translate-x-2"></div>
      </div>
    </div>
  );
};

export default ExerciseCard;
