import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Plus } from 'lucide-react';
import LessonVideoSelector from './LessonVideoSelector';
import ExerciseFileUploader from './ExerciseFileUploader';
import FormationPricingManager from './FormationPricingManager';

interface FormationData {
  title: string;
  description: string;
  badge: string;
  duration: number;
  price: number;
  originalPrice?: number;
  promoVideoUrl?: string;
  thumbnailUrl?: string;
  isActive: boolean;
  levels: LevelData[];
}

interface LevelData {
  title: string;
  description: string;
  orderIndex: number;
  lessons: LessonData[];
}

interface LessonData {
  title: string;
  description: string;
  videoUrl: string;
  duration: string;
  orderIndex: number;
  exercises: ExerciseData[];
}

interface ExerciseData {
  title: string;
  description: string;
  type: string;
  content: string;
  uploadedFiles?: Array<{ url: string; type: string; name?: string }>;
}

interface DynamicFormationFormProps {
  onSubmit: (data: FormationData) => void;
  isLoading: boolean;
  initialData?: Partial<FormationData>;
  isEditing?: boolean;
  formationId?: string;
  onConfigurePricing?: (formationId: string) => void;
}

const DynamicFormationForm: React.FC<DynamicFormationFormProps> = ({
  onSubmit,
  isLoading,
  initialData,
  isEditing = false,
  formationId,
  onConfigurePricing
}) => {
  const [formationData, setFormationData] = useState<FormationData>({
    title: '',
    description: '',
    badge: '',
    duration: 0,
    price: 0,
    originalPrice: 0,
    promoVideoUrl: '',
    thumbnailUrl: '',
    isActive: true,
    levels: [
      {
        title: '',
        description: '',
        orderIndex: 0,
        lessons: [
          {
            title: '',
            description: '',
            videoUrl: '',
            duration: '',
            orderIndex: 0,
            exercises: []
          }
        ]
      }
    ]
  });

  // Populate form with initial data when editing
  useEffect(() => {
    if (initialData && isEditing) {
      setFormationData(prev => ({
        ...prev,
        title: initialData.title || '',
        description: initialData.description || '',
        badge: initialData.badge || '',
        duration: initialData.duration || 0,
        price: initialData.price || 0,
        originalPrice: initialData.originalPrice || 0,
        promoVideoUrl: initialData.promoVideoUrl || '',
        thumbnailUrl: initialData.thumbnailUrl || '',
        isActive: initialData.isActive !== undefined ? initialData.isActive : true,
        levels: initialData.levels || prev.levels
      }));
    }
  }, [initialData, isEditing]);

  const addLevel = () => {
    setFormationData(prev => ({
      ...prev,
      levels: [
        ...prev.levels,
        {
          title: '',
          description: '',
          orderIndex: prev.levels.length,
          lessons: [
            {
              title: '',
              description: '',
              videoUrl: '',
              duration: '',
              orderIndex: 0,
              exercises: []
            }
          ]
        }
      ]
    }));
  };

  const removeLevel = (levelIndex: number) => {
    setFormationData(prev => ({
      ...prev,
      levels: prev.levels.filter((_, index) => index !== levelIndex)
    }));
  };

  const updateLevel = (levelIndex: number, field: keyof LevelData, value: any) => {
    setFormationData(prev => ({
      ...prev,
      levels: prev.levels.map((level, index) => 
        index === levelIndex ? { ...level, [field]: value } : level
      )
    }));
  };

  const addLesson = (levelIndex: number) => {
    setFormationData(prev => ({
      ...prev,
      levels: prev.levels.map((level, index) => 
        index === levelIndex 
          ? {
              ...level,
              lessons: [
                ...level.lessons,
                {
                  title: '',
                  description: '',
                  videoUrl: '',
                  duration: '',
                  orderIndex: level.lessons.length,
                  exercises: []
                }
              ]
            }
          : level
      )
    }));
  };

  const removeLesson = (levelIndex: number, lessonIndex: number) => {
    setFormationData(prev => ({
      ...prev,
      levels: prev.levels.map((level, index) => 
        index === levelIndex 
          ? {
              ...level,
              lessons: level.lessons.filter((_, lessonIdx) => lessonIdx !== lessonIndex)
            }
          : level
      )
    }));
  };

  const updateLesson = (levelIndex: number, lessonIndex: number, field: keyof LessonData, value: any) => {
    setFormationData(prev => ({
      ...prev,
      levels: prev.levels.map((level, levelIdx) => 
        levelIdx === levelIndex 
          ? {
              ...level,
              lessons: level.lessons.map((lesson, lessonIdx) => 
                lessonIdx === lessonIndex ? { ...lesson, [field]: value } : lesson
              )
            }
          : level
      )
    }));
  };

  const addExercise = (levelIndex: number, lessonIndex: number) => {
    setFormationData(prev => ({
      ...prev,
      levels: prev.levels.map((level, levelIdx) => 
        levelIdx === levelIndex 
          ? {
              ...level,
              lessons: level.lessons.map((lesson, lessonIdx) => 
                lessonIdx === lessonIndex 
                  ? {
                      ...lesson,
                      exercises: [
                        ...lesson.exercises,
                        {
                          title: '',
                          description: '',
                          type: 'text',
                          content: '',
                          uploadedFiles: []
                        }
                      ]
                    }
                  : lesson
              )
            }
          : level
      )
    }));
  };

  const removeExercise = (levelIndex: number, lessonIndex: number, exerciseIndex: number) => {
    setFormationData(prev => ({
      ...prev,
      levels: prev.levels.map((level, levelIdx) => 
        levelIdx === levelIndex 
          ? {
              ...level,
              lessons: level.lessons.map((lesson, lessonIdx) => 
                lessonIdx === lessonIndex 
                  ? {
                      ...lesson,
                      exercises: lesson.exercises.filter((_, exerciseIdx) => exerciseIdx !== exerciseIndex)
                    }
                  : lesson
              )
            }
          : level
      )
    }));
  };

  const updateExercise = (levelIndex: number, lessonIndex: number, exerciseIndex: number, field: keyof ExerciseData, value: any) => {
    setFormationData(prev => ({
      ...prev,
      levels: prev.levels.map((level, levelIdx) => 
        levelIdx === levelIndex 
          ? {
              ...level,
              lessons: level.lessons.map((lesson, lessonIdx) => 
                lessonIdx === lessonIndex 
                  ? {
                      ...lesson,
                      exercises: lesson.exercises.map((exercise, exerciseIdx) => 
                        exerciseIdx === exerciseIndex ? { ...exercise, [field]: value } : exercise
                      )
                    }
                  : lesson
              )
            }
          : level
      )
    }));
  };

  const handleExerciseFilesUpdate = (levelIndex: number, lessonIndex: number, exerciseIndex: number, files: Array<{ url: string; type: string; name?: string }>) => {
    updateExercise(levelIndex, lessonIndex, exerciseIndex, 'uploadedFiles', files);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formationData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Formation Info */}
      <Card>
        <CardHeader>
          <CardTitle>Informations de la formation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Titre</Label>
              <Input
                value={formationData.title}
                onChange={(e) => setFormationData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Titre de la formation"
                required
              />
            </div>
            <div>
              <Label>Badge</Label>
              <Input
                value={formationData.badge}
                onChange={(e) => setFormationData(prev => ({ ...prev, badge: e.target.value }))}
                placeholder="Badge de la formation"
              />
            </div>
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              value={formationData.description}
              onChange={(e) => setFormationData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Description de la formation"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Durée (heures)</Label>
              <Input
                type="number"
                value={formationData.duration}
                onChange={(e) => setFormationData(prev => ({ ...prev, duration: parseInt(e.target.value) || 0 }))}
                placeholder="0"
                min="0"
              />
            </div>
            <div>
              <Label>Prix actuel (€)</Label>
              <Input
                type="number"
                step="0.01"
                value={formationData.price}
                onChange={(e) => setFormationData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                placeholder="0.00"
                min="0"
              />
            </div>
            <div>
              <Label>Prix original (€)</Label>
              <Input
                type="number"
                step="0.01"
                value={formationData.originalPrice}
                onChange={(e) => setFormationData(prev => ({ ...prev, originalPrice: parseFloat(e.target.value) || 0 }))}
                placeholder="0.00"
                min="0"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>URL de la vidéo promotionnelle</Label>
              <Input
                value={formationData.promoVideoUrl}
                onChange={(e) => setFormationData(prev => ({ ...prev, promoVideoUrl: e.target.value }))}
                placeholder="https://..."
              />
            </div>
            <div>
              <Label>URL de la miniature</Label>
              <Input
                value={formationData.thumbnailUrl}
                onChange={(e) => setFormationData(prev => ({ ...prev, thumbnailUrl: e.target.value }))}
                placeholder="https://..."
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              checked={formationData.isActive}
              onCheckedChange={(checked) => setFormationData(prev => ({ ...prev, isActive: checked }))}
            />
            <Label>Formation active</Label>
          </div>
        </CardContent>
      </Card>

      {/* Levels and Lessons */}
      {formationData.levels.map((level, levelIndex) => (
        <Card key={levelIndex}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Niveau {levelIndex + 1}</CardTitle>
            {formationData.levels.length > 1 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => removeLevel(levelIndex)}
              >
                <Trash2 size={16} />
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Titre du niveau</Label>
                <Input
                  value={level.title}
                  onChange={(e) => updateLevel(levelIndex, 'title', e.target.value)}
                  placeholder="Titre du niveau"
                  required
                />
              </div>
            </div>
            <div>
              <Label>Description du niveau</Label>
              <Textarea
                value={level.description}
                onChange={(e) => updateLevel(levelIndex, 'description', e.target.value)}
                placeholder="Description du niveau"
                rows={2}
              />
            </div>

            {/* Lessons */}
            {level.lessons.map((lesson, lessonIndex) => (
              <Card key={lessonIndex} className="ml-4">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg">Leçon {lessonIndex + 1}</CardTitle>
                  {level.lessons.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeLesson(levelIndex, lessonIndex)}
                    >
                      <Trash2 size={16} />
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Titre de la leçon</Label>
                      <Input
                        value={lesson.title}
                        onChange={(e) => updateLesson(levelIndex, lessonIndex, 'title', e.target.value)}
                        placeholder="Titre de la leçon"
                        required
                      />
                    </div>
                    <div>
                      <Label>Durée</Label>
                      <Input
                        value={lesson.duration}
                        onChange={(e) => updateLesson(levelIndex, lessonIndex, 'duration', e.target.value)}
                        placeholder="ex: 15 min"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label>Description de la leçon</Label>
                    <Textarea
                      value={lesson.description}
                      onChange={(e) => updateLesson(levelIndex, lessonIndex, 'description', e.target.value)}
                      placeholder="Description de la leçon"
                      rows={2}
                    />
                  </div>

                  <LessonVideoSelector
                    currentVideoUrl={lesson.videoUrl}
                    onVideoSelect={(url) => updateLesson(levelIndex, lessonIndex, 'videoUrl', url)}
                  />

                  {/* Exercises */}
                  {lesson.exercises.map((exercise, exerciseIndex) => (
                    <Card key={exerciseIndex} className="ml-4 bg-gray-50">
                      <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-base">Exercice {exerciseIndex + 1}</CardTitle>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeExercise(levelIndex, lessonIndex, exerciseIndex)}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label>Titre de l'exercice</Label>
                            <Input
                              value={exercise.title}
                              onChange={(e) => updateExercise(levelIndex, lessonIndex, exerciseIndex, 'title', e.target.value)}
                              placeholder="Titre de l'exercice"
                              required
                            />
                          </div>
                          <div>
                            <Label>Type</Label>
                            <Input
                              value={exercise.type}
                              onChange={(e) => updateExercise(levelIndex, lessonIndex, exerciseIndex, 'type', e.target.value)}
                              placeholder="text, image, video, etc."
                            />
                          </div>
                        </div>
                        
                        <div>
                          <Label>Description</Label>
                          <Textarea
                            value={exercise.description}
                            onChange={(e) => updateExercise(levelIndex, lessonIndex, exerciseIndex, 'description', e.target.value)}
                            placeholder="Description de l'exercice"
                            rows={2}
                          />
                        </div>

                        <div>
                          <Label>Contenu</Label>
                          <Textarea
                            value={exercise.content}
                            onChange={(e) => updateExercise(levelIndex, lessonIndex, exerciseIndex, 'content', e.target.value)}
                            placeholder="Contenu de l'exercice (consignes, questions, etc.)"
                            rows={3}
                          />
                        </div>

                        {/* File Upload with ExerciseFileUploader */}
                        <div>
                          <Label>Fichiers joints</Label>
                          <ExerciseFileUploader
                            onFilesUploaded={(files) => handleExerciseFilesUpdate(levelIndex, lessonIndex, exerciseIndex, files)}
                            existingFiles={exercise.uploadedFiles || []}
                            disabled={isLoading}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => addExercise(levelIndex, lessonIndex)}
                    className="ml-4"
                  >
                    <Plus size={16} className="mr-2" />
                    Ajouter un exercice
                  </Button>
                </CardContent>
              </Card>
            ))}

            <Button
              type="button"
              variant="outline"
              onClick={() => addLesson(levelIndex)}
              className="ml-4"
            >
              <Plus size={16} className="mr-2" />
              Ajouter une leçon
            </Button>
          </CardContent>
        </Card>
      ))}

      <Button
        type="button"
        variant="outline"
        onClick={addLevel}
      >
        <Plus size={16} className="mr-2" />
        Ajouter un niveau
      </Button>

      <div className="flex flex-col gap-3">
        <Button 
          type="submit" 
          disabled={isLoading} 
          className="w-full bg-[#25d366] hover:bg-[#25d366]/90"
        >
          {isLoading ? 'Traitement...' : (isEditing ? 'Mettre à jour la formation' : 'Créer la formation complète')}
        </Button>

        {(formationId || isEditing) && onConfigurePricing && (
          <Button 
            type="button"
            variant="outline"
            onClick={() => onConfigurePricing(formationId!)}
            className="w-full"
          >
            💳 Configurer les tarifs d'abonnement
          </Button>
        )}
      </div>
    </form>
  );
};

export default DynamicFormationForm;
