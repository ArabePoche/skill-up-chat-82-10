// Interface de visualisation pour les élèves
import React, { useState, useRef } from 'react';
import { Upload, FileText, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface LiveClassroomViewerProps {
  formationId: string;
  lessonId: string;
  lesson: {
    id: string;
    title: string;
  };
  teacherName: string;
  onClose: () => void;
}

const LiveClassroomViewer: React.FC<LiveClassroomViewerProps> = ({
  formationId,
  lessonId,
  lesson,
  teacherName,
  onClose
}) => {
  const [isConnected, setIsConnected] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Vérifier la taille (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Le fichier ne peut pas dépasser 10MB');
        return;
      }
      
      // Vérifier le type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Type de fichier non autorisé. Utilisez des images (JPG, PNG, GIF) ou des PDF.');
        return;
      }
      
      setSelectedFile(file);
    }
  };

  const handleSubmitFile = async () => {
    if (!selectedFile) return;

    setIsSubmitting(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        toast.error("Vous devez être connecté pour envoyer un fichier");
        return;
      }

      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `live-submissions/${formationId}/${lessonId}/${userData.user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(filePath, selectedFile, { cacheControl: '3600', upsert: false });

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(filePath);

      const channel = supabase.channel(`live_session_${formationId}_${lessonId}`);
      await channel.send({
        type: 'broadcast',
        event: 'student_submission',
        payload: {
          studentId: userData.user.id,
          studentName: userData.user.user_metadata?.first_name || 'Élève',
          fileName: selectedFile.name,
          fileUrl: publicUrl,
          fileType: selectedFile.type,
        },
      });

      toast.success("Fichier envoyé au professeur !");
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de l'envoi du fichier");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <Image size={20} className="text-blue-500" />;
    } else if (file.type === 'application/pdf') {
      return <FileText size={20} className="text-red-500" />;
    }
    return <FileText size={20} className="text-gray-500" />;
  };

  return (
    <div className="h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 p-4 flex items-center justify-between border-b border-gray-700">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <h1 className="text-xl font-bold">Session en Direct</h1>
          </div>
          <span className="text-sm text-gray-300">{lesson.title}</span>
        </div>
        
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-300">Professeur: {teacherName}</span>
          <Button variant="outline" size="sm" onClick={onClose}>
            Quitter
          </Button>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Zone principale - Affichage du stream */}
        <div className="flex-1 bg-black relative">
          <div className="absolute inset-4 border-2 border-gray-600 rounded overflow-hidden">
            {isConnected ? (
              <div className="w-full h-full flex items-center justify-center">
                {/* Ici sera affiché le stream du professeur */}
                <div className="text-center">
                  <div className="text-6xl mb-4">🎓</div>
                  <div className="text-xl">Cours en direct avec {teacherName}</div>
                  <div className="text-gray-400 mt-2">Stream vidéo en cours...</div>
                </div>
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="text-6xl mb-4">⚠️</div>
                  <div className="text-xl">Connexion perdue</div>
                  <div className="text-gray-400 mt-2">Tentative de reconnexion...</div>
                </div>
              </div>
            )}
            
            {/* Indicateur live */}
            {isConnected && (
              <div className="absolute top-4 left-4 bg-red-600 text-white px-3 py-1 rounded text-sm font-bold">
                🔴 EN DIRECT
              </div>
            )}
          </div>
        </div>

        {/* Panneau droit - Interaction */}
        <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
          {/* Section de soumission de fichiers */}
          <div className="p-4 border-b border-gray-700">
            <h3 className="text-sm font-semibold mb-3">Partager un document</h3>
            
            <div className="space-y-3">
              <div className="border-2 border-dashed border-gray-600 rounded-lg p-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center space-x-2"
                  disabled={isSubmitting}
                >
                  <Upload size={16} />
                  <span>Choisir un fichier</span>
                </Button>
                
                <div className="text-xs text-gray-400 mt-2 text-center">
                  Images (JPG, PNG, GIF) ou PDF, max 10MB
                </div>
              </div>

              {selectedFile && (
                <Card className="bg-gray-700 border-gray-600">
                  <CardContent className="p-3">
                    <div className="flex items-center space-x-2">
                      {getFileIcon(selectedFile)}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {selectedFile.name}
                        </div>
                        <div className="text-xs text-gray-400">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-3 flex space-x-2">
                      <Button
                        size="sm"
                        onClick={handleSubmitFile}
                        disabled={isSubmitting}
                        className="flex-1"
                      >
                        {isSubmitting ? 'Envoi...' : 'Envoyer au prof'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedFile(null)}
                        disabled={isSubmitting}
                      >
                        Annuler
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Informations sur la session */}
          <div className="p-4 border-b border-gray-700">
            <h3 className="text-sm font-semibold mb-3">Informations</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Leçon:</span>
                <span>{lesson.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Professeur:</span>
                <span>{teacherName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Statut:</span>
                <span className={isConnected ? 'text-green-400' : 'text-red-400'}>
                  {isConnected ? 'Connecté' : 'Déconnecté'}
                </span>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="p-4">
            <h3 className="text-sm font-semibold mb-3">Instructions</h3>
            <div className="text-xs text-gray-400 space-y-2">
              <p>• Suivez le cours en temps réel</p>
              <p>• Partagez vos documents avec le professeur</p>
              <p>• Le professeur peut accepter et afficher vos documents</p>
              <p>• Restez attentif aux instructions données</p>
            </div>
          </div>
        </div>
      </div>

      {/* Barre de statut */}
      <div className="bg-gray-800 p-2 border-t border-gray-700">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-4">
            <span>Session: {lesson.title}</span>
            <span>Qualité: HD 1080p</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span>{isConnected ? 'Connexion stable' : 'Reconnexion...'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveClassroomViewer;