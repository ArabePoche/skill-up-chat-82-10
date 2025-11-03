import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import EnhancedVideoCreateForm from '@/components/admin/video/EnhancedVideoCreateForm';

/**
 * Page de création de vidéo accessible depuis le profil utilisateur
 * Utilise le même composant que l'admin mais filtre les formations selon le rôle
 */
const UploadVideo = () => {
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(true);

  const handleSuccess = () => {
    setIsCreating(false);
    // Rediriger vers le profil après succès
    setTimeout(() => {
      navigate('/profil');
    }, 1500);
  };

  const handleCancel = () => {
    navigate('/profil');
  };

  return (
    <div className="min-h-screen bg-background pb-16 md:pt-16 md:pb-0">
      <div className="container max-w-2xl mx-auto p-4">
        {/* Header avec bouton retour */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={handleCancel}
            className="mb-4"
          >
            <ArrowLeft size={20} className="mr-2" />
            Retour au profil
          </Button>
          
          <h1 className="text-3xl font-bold">Créer une vidéo</h1>
          <p className="text-muted-foreground mt-2">
            Partagez votre contenu avec votre audience
          </p>
        </div>

        {/* Formulaire de création */}
        <Card>
          <CardHeader>
            <CardTitle>Informations de la vidéo</CardTitle>
          </CardHeader>
          <CardContent>
            {isCreating ? (
              <EnhancedVideoCreateForm
                onSuccess={handleSuccess}
                onCancel={handleCancel}
              />
            ) : (
              <div className="text-center py-8">
                <div className="text-green-600 text-xl mb-2">✓ Vidéo créée avec succès!</div>
                <p className="text-muted-foreground">Redirection vers votre profil...</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Note informative */}
        <div className="mt-6 p-4 bg-muted rounded-lg">
          <h3 className="font-semibold mb-2">📌 À propos des types de vidéos</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• <strong>Classique</strong> : Vidéo accessible à tous publiquement</li>
            <li>• <strong>Promotion</strong> : Vidéo de présentation d'une formation (nécessite une formation associée)</li>
            <li>• <strong>Leçon</strong> : Vidéo de cours liée à une formation (nécessite une formation associée)</li>
          </ul>
          <p className="text-xs text-muted-foreground mt-3">
            💡 Pour les vidéos promotionnelles et de leçon, seules vos formations apparaîtront dans la liste.
          </p>
        </div>
      </div>
    </div>
  );
};

export default UploadVideo;
