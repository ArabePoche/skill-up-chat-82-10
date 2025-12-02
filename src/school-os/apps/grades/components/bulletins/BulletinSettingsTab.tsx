/**
 * Onglet Paramètres des bulletins
 * Coefficients, appréciations, mentions
 */
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Settings, Award, MessageSquare, Scale, Plus, Trash2 } from 'lucide-react';

interface BulletinSettingsTabProps {
  schoolId: string;
}

interface Mention {
  id: string;
  name: string;
  minScore: number;
  maxScore: number;
}

export const BulletinSettingsTab: React.FC<BulletinSettingsTabProps> = ({ schoolId }) => {
  // États pour les paramètres
  const [showCoefficients, setShowCoefficients] = useState(true);
  const [showAppreciations, setShowAppreciations] = useState(true);
  const [showClassAverage, setShowClassAverage] = useState(true);
  const [showRanking, setShowRanking] = useState(false);
  
  const [mentions, setMentions] = useState<Mention[]>([
    { id: '1', name: 'Félicitations', minScore: 16, maxScore: 20 },
    { id: '2', name: 'Compliments', minScore: 14, maxScore: 15.99 },
    { id: '3', name: 'Encouragements', minScore: 12, maxScore: 13.99 },
    { id: '4', name: 'Tableau d\'honneur', minScore: 10, maxScore: 11.99 },
  ]);

  const [appreciationTemplates, setAppreciationTemplates] = useState([
    'Excellent travail, continuez ainsi !',
    'Bon trimestre, des progrès notables.',
    'Travail satisfaisant, peut mieux faire.',
    'Des difficultés persistent, efforts à fournir.',
  ]);

  const addMention = () => {
    const newMention: Mention = {
      id: Date.now().toString(),
      name: 'Nouvelle mention',
      minScore: 0,
      maxScore: 10,
    };
    setMentions([...mentions, newMention]);
  };

  const removeMention = (id: string) => {
    setMentions(mentions.filter(m => m.id !== id));
  };

  const updateMention = (id: string, field: keyof Mention, value: string | number) => {
    setMentions(mentions.map(m => 
      m.id === id ? { ...m, [field]: value } : m
    ));
  };

  const handleSave = () => {
    // TODO: Sauvegarder les paramètres
    console.log('Saving settings:', {
      showCoefficients,
      showAppreciations,
      showClassAverage,
      showRanking,
      mentions,
      appreciationTemplates,
    });
  };

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
            <Label htmlFor="showCoeff" className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-muted-foreground" />
              Afficher les coefficients
            </Label>
            <Switch 
              id="showCoeff"
              checked={showCoefficients}
              onCheckedChange={setShowCoefficients}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="showAppre" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-muted-foreground" />
              Afficher les appréciations
            </Label>
            <Switch 
              id="showAppre"
              checked={showAppreciations}
              onCheckedChange={setShowAppreciations}
            />
          </div>
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
              checked={showRanking}
              onCheckedChange={setShowRanking}
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
            {mentions.map((mention) => (
              <div key={mention.id} className="flex items-center gap-3 p-3 border rounded-lg">
                <Input
                  value={mention.name}
                  onChange={(e) => updateMention(mention.id, 'name', e.target.value)}
                  placeholder="Nom de la mention"
                  className="flex-1"
                />
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={mention.minScore}
                    onChange={(e) => updateMention(mention.id, 'minScore', parseFloat(e.target.value))}
                    className="w-20"
                    min={0}
                    max={20}
                    step={0.5}
                  />
                  <span className="text-muted-foreground">à</span>
                  <Input
                    type="number"
                    value={mention.maxScore}
                    onChange={(e) => updateMention(mention.id, 'maxScore', parseFloat(e.target.value))}
                    className="w-20"
                    min={0}
                    max={20}
                    step={0.5}
                  />
                </div>
                <Button 
                  size="icon" 
                  variant="ghost"
                  onClick={() => removeMention(mention.id)}
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
            value={appreciationTemplates.join('\n')}
            onChange={(e) => setAppreciationTemplates(e.target.value.split('\n').filter(t => t.trim()))}
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
        <Button onClick={handleSave} className="w-full">
          Enregistrer les paramètres
        </Button>
      </div>
    </div>
  );
};
