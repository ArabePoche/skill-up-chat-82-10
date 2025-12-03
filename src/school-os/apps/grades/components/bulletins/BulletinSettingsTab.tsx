/**
 * Onglet Paramètres des bulletins
 * Coefficients, appréciations, mentions
 */
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Settings, Award, MessageSquare, Scale, Plus, Trash2, Loader2 } from 'lucide-react';
import { 
  useBulletinSettings, 
  useSaveBulletinSettings,
  useBulletinMentions,
  useSaveBulletinMention,
  useDeleteBulletinMention,
  useBulletinAppreciations,
  useSaveBulletinAppreciation,
  useDeleteBulletinAppreciation,
  type BulletinMention,
} from '../../hooks/useBulletins';

interface BulletinSettingsTabProps {
  schoolId: string;
  schoolYearId: string;
}

interface LocalMention {
  id?: string;
  name: string;
  min_average: number;
  max_average: number;
  color?: string;
  display_order: number;
  isNew?: boolean;
}

export const BulletinSettingsTab: React.FC<BulletinSettingsTabProps> = ({ schoolId, schoolYearId }) => {
  // Fetch data
  const { data: settings, isLoading: loadingSettings } = useBulletinSettings(schoolId, schoolYearId);
  const { data: mentions = [], isLoading: loadingMentions } = useBulletinMentions(schoolId);
  const { data: appreciations = [], isLoading: loadingAppreciations } = useBulletinAppreciations(schoolId);

  // Mutations
  const saveSettings = useSaveBulletinSettings();
  const saveMention = useSaveBulletinMention();
  const deleteMention = useDeleteBulletinMention();
  const saveAppreciation = useSaveBulletinAppreciation();
  const deleteAppreciation = useDeleteBulletinAppreciation();

  // Local state
  const [showClassAverage, setShowClassAverage] = useState(true);
  const [showRank, setShowRank] = useState(false);
  const [showAppreciation, setShowAppreciation] = useState(true);
  const [showConduct, setShowConduct] = useState(true);
  const [showAbsences, setShowAbsences] = useState(true);
  
  const [localMentions, setLocalMentions] = useState<LocalMention[]>([]);
  const [appreciationText, setAppreciationText] = useState('');

  // Initialize state from fetched data
  useEffect(() => {
    if (settings) {
      setShowClassAverage(settings.show_class_average);
      setShowRank(settings.show_rank);
      setShowAppreciation(settings.show_appreciation);
      setShowConduct(settings.show_conduct);
      setShowAbsences(settings.show_absences);
    }
  }, [settings]);

  useEffect(() => {
    if (mentions.length > 0) {
      setLocalMentions(mentions.map(m => ({
        id: m.id,
        name: m.name,
        min_average: m.min_average,
        max_average: m.max_average,
        color: m.color || undefined,
        display_order: m.display_order,
      })));
    } else if (!loadingMentions && mentions.length === 0) {
      // Default mentions
      setLocalMentions([
        { name: 'Félicitations', min_average: 16, max_average: 20, display_order: 0 },
        { name: 'Compliments', min_average: 14, max_average: 15.99, display_order: 1 },
        { name: 'Encouragements', min_average: 12, max_average: 13.99, display_order: 2 },
        { name: 'Tableau d\'honneur', min_average: 10, max_average: 11.99, display_order: 3 },
      ]);
    }
  }, [mentions, loadingMentions]);

  useEffect(() => {
    if (appreciations.length > 0) {
      setAppreciationText(appreciations.map(a => a.text).join('\n'));
    }
  }, [appreciations]);

  const addMention = () => {
    setLocalMentions([
      ...localMentions,
      { name: 'Nouvelle mention', min_average: 0, max_average: 10, display_order: localMentions.length, isNew: true },
    ]);
  };

  const removeMention = async (index: number) => {
    const mention = localMentions[index];
    if (mention.id) {
      deleteMention.mutate({ id: mention.id, schoolId });
    }
    setLocalMentions(localMentions.filter((_, i) => i !== index));
  };

  const updateMention = (index: number, field: keyof LocalMention, value: string | number) => {
    setLocalMentions(localMentions.map((m, i) => 
      i === index ? { ...m, [field]: value } : m
    ));
  };

  const handleSave = async () => {
    // Save settings
    await saveSettings.mutateAsync({
      school_id: schoolId,
      school_year_id: schoolYearId,
      show_class_average: showClassAverage,
      show_rank: showRank,
      show_appreciation: showAppreciation,
      show_conduct: showConduct,
      show_absences: showAbsences,
    });

    // Save mentions
    for (const mention of localMentions) {
      await saveMention.mutateAsync({
        id: mention.id,
        school_id: schoolId,
        name: mention.name,
        min_average: mention.min_average,
        max_average: mention.max_average,
        color: mention.color,
        display_order: mention.display_order,
      });
    }

    // Save appreciations
    const appreciationLines = appreciationText.split('\n').filter(t => t.trim());
    // Delete old ones
    for (const app of appreciations) {
      await deleteAppreciation.mutateAsync({ id: app.id, schoolId });
    }
    // Create new ones
    for (const text of appreciationLines) {
      await saveAppreciation.mutateAsync({
        school_id: schoolId,
        category: 'general',
        text: text.trim(),
      });
    }
  };

  const isLoading = loadingSettings || loadingMentions || loadingAppreciations;
  const isSaving = saveSettings.isPending || saveMention.isPending || deleteAppreciation.isPending;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto space-y-4">
      {/* Options d'affichage */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings className="w-4 h-4" />
            Options d'affichage
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="showAvg">Afficher la moyenne de classe</Label>
            <Switch 
              id="showAvg"
              checked={showClassAverage}
              onCheckedChange={setShowClassAverage}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="showRank">Afficher le classement</Label>
            <Switch 
              id="showRank"
              checked={showRank}
              onCheckedChange={setShowRank}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="showAppre" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-muted-foreground" />
              Afficher les appréciations
            </Label>
            <Switch 
              id="showAppre"
              checked={showAppreciation}
              onCheckedChange={setShowAppreciation}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="showConduct">Afficher la conduite</Label>
            <Switch 
              id="showConduct"
              checked={showConduct}
              onCheckedChange={setShowConduct}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="showAbsences">Afficher les absences</Label>
            <Switch 
              id="showAbsences"
              checked={showAbsences}
              onCheckedChange={setShowAbsences}
            />
          </div>
        </CardContent>
      </Card>

      {/* Mentions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base">
            <span className="flex items-center gap-2">
              <Award className="w-4 h-4" />
              Mentions
            </span>
            <Button size="sm" variant="outline" onClick={addMention}>
              <Plus className="w-4 h-4 mr-1" />
              Ajouter
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {localMentions.map((mention, index) => (
              <div key={mention.id || `new-${index}`} className="flex items-center gap-3 p-3 border rounded-lg">
                <Input
                  value={mention.name}
                  onChange={(e) => updateMention(index, 'name', e.target.value)}
                  placeholder="Nom de la mention"
                  className="flex-1"
                />
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={mention.min_average}
                    onChange={(e) => updateMention(index, 'min_average', parseFloat(e.target.value) || 0)}
                    className="w-20"
                    min={0}
                    max={20}
                    step={0.5}
                  />
                  <span className="text-muted-foreground">à</span>
                  <Input
                    type="number"
                    value={mention.max_average}
                    onChange={(e) => updateMention(index, 'max_average', parseFloat(e.target.value) || 0)}
                    className="w-20"
                    min={0}
                    max={20}
                    step={0.5}
                  />
                </div>
                <Button 
                  size="icon" 
                  variant="ghost"
                  onClick={() => removeMention(index)}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Modèles d'appréciations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="w-4 h-4" />
            Modèles d'appréciations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={appreciationText}
            onChange={(e) => setAppreciationText(e.target.value)}
            placeholder="Une appréciation par ligne..."
            rows={6}
          />
          <p className="text-xs text-muted-foreground mt-2">
            Ces modèles seront proposés lors de la saisie des appréciations
          </p>
        </CardContent>
      </Card>

      {/* Bouton de sauvegarde */}
      <div className="sticky bottom-0 pt-4 bg-background">
        <Button onClick={handleSave} className="w-full" disabled={isSaving}>
          {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Enregistrer les paramètres
        </Button>
      </div>
    </div>
  );
};
