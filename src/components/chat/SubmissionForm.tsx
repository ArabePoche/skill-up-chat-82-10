
import React, { useState, useRef } from 'react';
import { Upload, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import CameraCapture from './CameraCapture';
import AudioRecorder from './AudioRecorder';

interface SubmissionFormProps {
  onSubmit: (text: string, file?: File) => void;
  onCancel: () => void;
  isSubmitting: boolean;
  exerciseTitle: string;
  showSubmissionOptions?: boolean;
  initialContent?: string; // Contenu initial pour l'édition
}

const SubmissionForm: React.FC<SubmissionFormProps> = ({
  onSubmit,
  onCancel,
  isSubmitting,
  exerciseTitle,
  showSubmissionOptions = true,
  initialContent = ''
}) => {
  const [submissionText, setSubmissionText] = useState(initialContent);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleCameraCapture = (file: File) => {
    setSelectedFile(file);
    setSubmissionText(`Photo capturée pour l'exercice: ${exerciseTitle}`);
  };

  const handleAudioCapture = (file: File) => {
    setSelectedFile(file);
    setSubmissionText(`Message vocal pour l'exercice: ${exerciseTitle}`);
  };

  const handleSubmit = () => {
    onSubmit(submissionText, selectedFile || undefined);
  };

  return (
    <div className="mt-4 space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Votre réponse
        </label>
        <textarea
          value={submissionText}
          onChange={(e) => setSubmissionText(e.target.value)}
          placeholder="Tapez votre réponse ici..."
          className="w-full p-2 border border-gray-300 rounded-md text-sm resize-none"
          rows={3}
        />
      </div>

      {showSubmissionOptions && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Ajouter un fichier ou un média
          </label>
          <div className="flex flex-wrap items-center gap-2 sm:gap-2">
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              className="hidden"
              accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
            />
            
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="flex-shrink-0"
            >
              <Upload size={16} className="mr-1" />
              Fichier
            </Button>

            <div className="flex-shrink-0">
              <CameraCapture
                onCapture={handleCameraCapture}
                disabled={isSubmitting}
              />
            </div>
            
            <div className="flex-1 min-w-0 sm:flex-shrink-0 sm:w-auto">
              <AudioRecorder
                onRecordingComplete={handleAudioCapture}
                disabled={isSubmitting}
              />
            </div>
          </div>
          
          {selectedFile && (
            <p className="text-sm text-gray-600 mt-2">
              Fichier sélectionné: {selectedFile.name}
            </p>
          )}
        </div>
      )}

      <div className="flex space-x-2">
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || (!submissionText.trim() && !selectedFile)}
          size="sm"
          className="bg-green-500 hover:bg-green-600"
        >
          <Send size={16} className="mr-1" />
          {isSubmitting ? 'Envoi...' : 'Soumettre'}
        </Button>
        <Button
          onClick={onCancel}
          variant="outline"
          size="sm"
        >
          Annuler
        </Button>
      </div>
    </div>
  );
};

export default SubmissionForm;
