
// Ce composant est remplacé par ExerciseFileManager
// Gardé pour compatibilité - redirection vers le nouveau composant

import React from 'react';
import ExerciseFileManager from './ExerciseFileManager';

interface ExerciseFile {
  url: string;
  type: string;
  name?: string;
}

interface ExerciseFileUploaderProps {
  onFilesUploaded: (files: ExerciseFile[]) => void;
  existingFiles?: ExerciseFile[];
  disabled?: boolean;
  exerciseId?: string;
}

const ExerciseFileUploader: React.FC<ExerciseFileUploaderProps> = (props) => {
  console.log('⚠️ ExerciseFileUploader est déprécié, utilisez ExerciseFileManager');
  
  return (
    <ExerciseFileManager
      exerciseId={props.exerciseId}
      onFilesChange={props.onFilesUploaded}
      disabled={props.disabled}
    />
  );
};

export default ExerciseFileUploader;
