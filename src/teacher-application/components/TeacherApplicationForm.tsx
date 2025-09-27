import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, FileText, X } from 'lucide-react';
import { useFormations } from '../hooks/useFormations';
import { useTeacherApplication, TeacherApplicationData } from '../hooks/useTeacherApplication';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface TeacherApplicationFormProps {
  userId: string;
  onSuccess?: () => void;
}

const EDUCATION_LEVELS = [
  'DEF',
  'Baccalauréat',
  'BTS/DUT',
  'CAP',
  'Licence',
  'Master',
  'Doctorat',
  'Autre'
];

const SPECIALTY_OPTIONS = [
  'Technologie',
  'Sciences',
  'Littérature', 
  'Arts',
  'Sport',
  'Informatique',
  'Religion',
  'Business',
  'Langues',
  'Mathématiques',
  'Histoire',
  'Géographie'
];

export const TeacherApplicationForm: React.FC<TeacherApplicationFormProps> = ({ 
  userId, 
  onSuccess 
}) => {
  const { data: formations, isLoading: formationsLoading } = useFormations();
  const { submitApplication, isSubmitting } = useTeacherApplication();
  const { toast } = useToast();

  const [formData, setFormData] = useState<TeacherApplicationData>({
    motivationMessage: '',
    experienceYears: '',
    educationLevel: '',
    specialties: [],
    availability: '',
    selectedFormations: [],
    files: []
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFormData(prev => ({
        ...prev,
        files: [...prev.files, ...newFiles]
      }));
    }
  };

  const removeFile = (index: number) => {
    setFormData(prev => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== index)
    }));
  };

  const handleSpecialtyToggle = (specialty: string) => {
    setFormData(prev => ({
      ...prev,
      specialties: prev.specialties.includes(specialty)
        ? prev.specialties.filter(s => s !== specialty)
        : [...prev.specialties, specialty]
    }));
  };

  const handleFormationToggle = (formationId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedFormations: prev.selectedFormations.includes(formationId)
        ? prev.selectedFormations.filter(f => f !== formationId)
        : [...prev.selectedFormations, formationId]
    }));
  };

  const handleSubmit = async () => {
    console.log('📋 Données du formulaire avant soumission:', formData);

    if (formData.selectedFormations.length === 0) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner au moins une formation à encadrer.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.motivationMessage.trim()) {
      toast({
        title: "Erreur", 
        description: "Le message de motivation est requis.",
        variant: "destructive",
      });
      return;
    }

    // Vérifier s'il y a déjà une candidature en cours pour cet utilisateur
    try {
      const { data: existingApplications } = await supabase
        .from('teacher_applications')
        .select('id, status')
        .eq('user_id', userId)
        .in('status', ['pending', 'approved']);

      if (existingApplications && existingApplications.length > 0) {
        const pendingApp = existingApplications.find(app => app.status === 'pending');
        const approvedApp = existingApplications.find(app => app.status === 'approved');
        
        if (approvedApp) {
          toast({
            title: "Candidature déjà approuvée",
            description: "Vous êtes déjà un encadreur approuvé. Vous ne pouvez pas soumettre une nouvelle candidature.",
            variant: "destructive",
          });
          return;
        }
        
        if (pendingApp) {
          toast({
            title: "Candidature déjà en cours",
            description: "Vous avez déjà une candidature en cours d'examen. Veuillez attendre la réponse avant de soumettre une nouvelle candidature.",
            variant: "destructive",
          });
          return;
        }
      }

      console.log('🚀 Appel submitApplication avec userId:', userId);
      await submitApplication(userId, formData);
      console.log('✅ Candidature soumise avec succès');
      onSuccess?.();
    } catch (error) {
      console.log('❌ Erreur dans handleSubmit:', error);
      // L'erreur est déjà gérée dans le hook
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (formationsLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Chargement des formations...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Candidature pour devenir encadreur
        </CardTitle>
        <CardDescription>
          Complétez votre candidature pour rejoindre notre équipe d'encadreurs
        </CardDescription>
      </CardHeader>
      <CardContent>
          <div className="space-y-6">
            {/* Message de motivation */}
          <div className="space-y-2">
            <Label htmlFor="motivation">Message de motivation *</Label>
            <Textarea
              id="motivation"
              placeholder="Expliquez pourquoi vous souhaitez devenir encadreur..."
              value={formData.motivationMessage}
              onChange={(e) => setFormData(prev => ({ ...prev, motivationMessage: e.target.value }))}
              required
              className="min-h-[100px]"
            />
          </div>

          {/* Expérience et formation */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="experience">Années d'expérience</Label>
              <Input
                id="experience"
                type="number"
                min="0"
                max="50"
                value={formData.experienceYears}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  experienceYears: e.target.value ? parseInt(e.target.value) : '' 
                }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="education">Niveau d'études</Label>
              <select
                id="education"
                value={formData.educationLevel}
                onChange={(e) => setFormData(prev => ({ ...prev, educationLevel: e.target.value }))}
                className="w-full h-10 px-3 rounded-md border border-input bg-background"
              >
                <option value="">Sélectionnez un niveau</option>
                {EDUCATION_LEVELS.map(level => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Spécialités */}
          <div className="space-y-3">
            <Label>Domaines de spécialité</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {SPECIALTY_OPTIONS.map(specialty => (
                <div key={specialty} className="flex items-center space-x-2">
                  <Checkbox
                    id={specialty}
                    checked={formData.specialties.includes(specialty)}
                    onCheckedChange={() => handleSpecialtyToggle(specialty)}
                  />
                  <Label htmlFor={specialty} className="text-sm font-normal">
                    {specialty}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Disponibilités */}
          <div className="space-y-2">
            <Label htmlFor="availability">Disponibilités</Label>
            <Textarea
              id="availability"
              placeholder="Décrivez vos disponibilités (jours, heures, fréquence...)"
              value={formData.availability}
              onChange={(e) => setFormData(prev => ({ ...prev, availability: e.target.value }))}
            />
          </div>

          {/* Formations sélectionnées */}
          <div className="space-y-3">
            <Label>Formations à encadrer *</Label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {formations?.map(formation => (
                <div key={formation.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={formation.id}
                    checked={formData.selectedFormations.includes(formation.id)}
                    onCheckedChange={() => handleFormationToggle(formation.id)}
                  />
                  <Label htmlFor={formation.id} className="text-sm font-normal">
                    {formation.title}
                  </Label>
                </div>
              ))}
            </div>
            {formData.selectedFormations.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Veuillez sélectionner au moins une formation
              </p>
            )}
          </div>

          {/* Upload de fichiers */}
          <div className="space-y-3">
            <Label>Documents justificatifs</Label>
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
              <div className="text-center">
                <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                <div className="mt-4">
                  <Label htmlFor="file-upload" className="cursor-pointer">
                    <span className="mt-2 block text-sm font-semibold text-primary">
                      Cliquez pour téléverser des fichiers
                    </span>
                  </Label>
                  <Input
                    id="file-upload"
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <p className="mt-2 text-sm text-muted-foreground">
                    CV, diplômes, certificats, etc. (PDF, DOC, JPG, PNG)
                  </p>
                </div>
              </div>
            </div>

            {/* Liste des fichiers */}
            {formData.files.length > 0 && (
              <div className="space-y-2">
                <Label>Fichiers sélectionnés :</Label>
                {formData.files.map((file, index) => (
                  <div key={index} className="flex items-center justify-between bg-muted p-3 rounded">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      <span className="text-sm font-medium">{file.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({formatFileSize(file.size)})
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bouton de soumission */}
          <div className="flex justify-end">
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || formData.selectedFormations.length === 0 || !formData.motivationMessage.trim()}
              className="bg-primary hover:bg-primary/90"
            >
              {isSubmitting ? 'Soumission...' : 'Soumettre la candidature'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};