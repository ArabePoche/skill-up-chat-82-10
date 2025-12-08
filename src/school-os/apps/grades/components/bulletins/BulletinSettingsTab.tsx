/**
 * Onglet Paramètres des bulletins
 * Appréciations par catégorie, design, en-tête, mentions
 */
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Settings, Award, MessageSquare, Plus, Trash2, Loader2, 
  Palette, FileText, User, Building2 
} from 'lucide-react';
import { 
  useBulletinSettings, 
  useSaveBulletinSettings,
  useBulletinMentions,
  useSaveBulletinMention,
  useDeleteBulletinMention,
  useBulletinAppreciations,
  useSaveBulletinAppreciation,
  useDeleteBulletinAppreciation,
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

interface LocalAppreciation {
  id?: string;
  category: 'excellent' | 'good' | 'average' | 'below_average' | 'poor';
  text: string;
  min_average: number;
  max_average: number;
  isNew?: boolean;
}

const APPRECIATION_CATEGORIES = [
  { value: 'excellent', label: 'Excellent', min: 16, max: 20, color: 'bg-green-100 text-green-800' },
  { value: 'good', label: 'Bien', min: 14, max: 15.99, color: 'bg-blue-100 text-blue-800' },
  { value: 'average', label: 'Passable', min: 10, max: 13.99, color: 'bg-yellow-100 text-yellow-800' },
  { value: 'below_average', label: 'Insuffisant', min: 5, max: 9.99, color: 'bg-orange-100 text-orange-800' },
  { value: 'poor', label: 'Faible', min: 0, max: 4.99, color: 'bg-red-100 text-red-800' },
];

const FONT_OPTIONS = [
  { value: 'default', label: 'Par défaut' },
  { value: 'serif', label: 'Serif (Times)' },
  { value: 'sans-serif', label: 'Sans-serif (Arial)' },
  { value: 'amiri', label: 'Amiri (Arabe)' },
];

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

  // Display options state
  const [showClassAverage, setShowClassAverage] = useState(true);
  const [showRank, setShowRank] = useState(false);
  const [showAppreciation, setShowAppreciation] = useState(true);
  const [showConduct, setShowConduct] = useState(true);
  const [showAbsences, setShowAbsences] = useState(true);
  
  // Header/Footer state
  const [headerText, setHeaderText] = useState('');
  const [footerText, setFooterText] = useState('');
  const [signatureTitle, setSignatureTitle] = useState('Le Directeur');
  
  // Design state
  const [primaryColor, setPrimaryColor] = useState('#1a365d');
  const [secondaryColor, setSecondaryColor] = useState('#2d3748');
  const [fontFamily, setFontFamily] = useState('default');
  
  // Mentions state
  const [localMentions, setLocalMentions] = useState<LocalMention[]>([]);
  
  // Appreciations state - organized by category
  const [localAppreciations, setLocalAppreciations] = useState<LocalAppreciation[]>([]);

  // Initialize state from fetched data
  useEffect(() => {
    if (settings) {
      setShowClassAverage(settings.show_class_average);
      setShowRank(settings.show_rank);
      setShowAppreciation(settings.show_appreciation);
      setShowConduct(settings.show_conduct);
      setShowAbsences(settings.show_absences);
      setHeaderText(settings.header_text || '');
      setFooterText(settings.footer_text || '');
      setSignatureTitle(settings.signature_title || 'Le Directeur');
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
      setLocalMentions([
        { name: 'Félicitations', min_average: 16, max_average: 20, display_order: 0, color: '#22c55e' },
        { name: 'Compliments', min_average: 14, max_average: 15.99, display_order: 1, color: '#3b82f6' },
        { name: 'Encouragements', min_average: 12, max_average: 13.99, display_order: 2, color: '#eab308' },
        { name: 'Tableau d\'honneur', min_average: 10, max_average: 11.99, display_order: 3, color: '#f97316' },
      ]);
    }
  }, [mentions, loadingMentions]);

  useEffect(() => {
    if (appreciations.length > 0) {
      setLocalAppreciations(appreciations.map(a => ({
        id: a.id,
        category: a.category,
        text: a.text,
        min_average: a.min_average || 0,
        max_average: a.max_average || 20,
      })));
    } else if (!loadingAppreciations && appreciations.length === 0) {
      // Default appreciations by category
      setLocalAppreciations([
        { category: 'excellent', text: 'Excellent travail. Continuez ainsi!', min_average: 16, max_average: 20 },
        { category: 'good', text: 'Bon travail. Des efforts remarquables.', min_average: 14, max_average: 15.99 },
        { category: 'average', text: 'Travail satisfaisant. Peut mieux faire.', min_average: 10, max_average: 13.99 },
        { category: 'below_average', text: 'Travail insuffisant. Des efforts sont nécessaires.', min_average: 5, max_average: 9.99 },
        { category: 'poor', text: 'Résultats préoccupants. Un travail sérieux s\'impose.', min_average: 0, max_average: 4.99 },
      ]);
    }
  }, [appreciations, loadingAppreciations]);

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

  const addAppreciation = (category: LocalAppreciation['category']) => {
    const categoryConfig = APPRECIATION_CATEGORIES.find(c => c.value === category);
    setLocalAppreciations([
      ...localAppreciations,
      { 
        category, 
        text: '', 
        min_average: categoryConfig?.min || 0, 
        max_average: categoryConfig?.max || 20,
        isNew: true 
      },
    ]);
  };

  const removeAppreciation = async (index: number) => {
    const appreciation = localAppreciations[index];
    if (appreciation.id) {
      deleteAppreciation.mutate({ id: appreciation.id, schoolId });
    }
    setLocalAppreciations(localAppreciations.filter((_, i) => i !== index));
  };

  const updateAppreciation = (index: number, field: keyof LocalAppreciation, value: string | number) => {
    setLocalAppreciations(localAppreciations.map((a, i) => 
      i === index ? { ...a, [field]: value } : a
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
      header_text: headerText || null,
      footer_text: footerText || null,
      signature_title: signatureTitle,
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

    // Delete old appreciations and create new ones
    for (const app of appreciations) {
      await deleteAppreciation.mutateAsync({ id: app.id, schoolId });
    }
    for (const appreciation of localAppreciations) {
      if (appreciation.text.trim()) {
        await saveAppreciation.mutateAsync({
          school_id: schoolId,
          category: appreciation.category,
          text: appreciation.text.trim(),
          min_average: appreciation.min_average,
          max_average: appreciation.max_average,
        });
      }
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

  const getAppreciationsByCategory = (category: string) => 
    localAppreciations.filter(a => a.category === category);

  return (
    <div className="h-full overflow-auto">
      <Tabs defaultValue="display" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="display" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Affichage</span>
          </TabsTrigger>
          <TabsTrigger value="appreciations" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            <span className="hidden sm:inline">Appréciations</span>
          </TabsTrigger>
          <TabsTrigger value="header" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">En-tête</span>
          </TabsTrigger>
          <TabsTrigger value="mentions" className="flex items-center gap-2">
            <Award className="w-4 h-4" />
            <span className="hidden sm:inline">Mentions</span>
          </TabsTrigger>
        </TabsList>

        {/* Onglet Options d'affichage */}
        <TabsContent value="display" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Settings className="w-4 h-4" />
                Options d'affichage sur le bulletin
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <Label htmlFor="showAvg">Moyenne de classe</Label>
                  <Switch 
                    id="showAvg"
                    checked={showClassAverage}
                    onCheckedChange={setShowClassAverage}
                  />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <Label htmlFor="showRank">Classement</Label>
                  <Switch 
                    id="showRank"
                    checked={showRank}
                    onCheckedChange={setShowRank}
                  />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <Label htmlFor="showAppre">Appréciations</Label>
                  <Switch 
                    id="showAppre"
                    checked={showAppreciation}
                    onCheckedChange={setShowAppreciation}
                  />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <Label htmlFor="showConduct">Conduite</Label>
                  <Switch 
                    id="showConduct"
                    checked={showConduct}
                    onCheckedChange={setShowConduct}
                  />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg sm:col-span-2">
                  <Label htmlFor="showAbsences">Absences & Retards</Label>
                  <Switch 
                    id="showAbsences"
                    checked={showAbsences}
                    onCheckedChange={setShowAbsences}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Palette className="w-4 h-4" />
                Design du bulletin
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Couleur principale</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-12 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      placeholder="#1a365d"
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Couleur secondaire</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="w-12 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      placeholder="#2d3748"
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Police de caractères</Label>
                  <Select value={fontFamily} onValueChange={setFontFamily}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FONT_OPTIONS.map(font => (
                        <SelectItem key={font.value} value={font.value}>
                          {font.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet Appréciations par catégorie */}
        <TabsContent value="appreciations" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Configurez les appréciations automatiques en fonction de la moyenne de l'élève.
          </p>
          
          {APPRECIATION_CATEGORIES.map(category => (
            <Card key={category.value}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-base">
                  <span className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${category.color}`}>
                      {category.label}
                    </span>
                    <span className="text-muted-foreground text-sm font-normal">
                      ({category.min} - {category.max})
                    </span>
                  </span>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => addAppreciation(category.value as LocalAppreciation['category'])}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Ajouter
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {getAppreciationsByCategory(category.value).length === 0 ? (
                    <p className="text-sm text-muted-foreground italic py-2">
                      Aucune appréciation configurée pour cette catégorie.
                    </p>
                  ) : (
                    getAppreciationsByCategory(category.value).map((appreciation, idx) => {
                      const globalIndex = localAppreciations.findIndex(a => a === appreciation);
                      return (
                        <div key={appreciation.id || `new-${idx}`} className="flex items-start gap-2">
                          <Textarea
                            value={appreciation.text}
                            onChange={(e) => updateAppreciation(globalIndex, 'text', e.target.value)}
                            placeholder="Texte de l'appréciation..."
                            rows={2}
                            className="flex-1"
                          />
                          <Button 
                            size="icon" 
                            variant="ghost"
                            onClick={() => removeAppreciation(globalIndex)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Onglet En-tête et Pied de page */}
        <TabsContent value="header" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="w-4 h-4" />
                En-tête du bulletin
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Texte d'en-tête (apparaît sous le logo)</Label>
                <Textarea
                  value={headerText}
                  onChange={(e) => setHeaderText(e.target.value)}
                  placeholder="Ex: République Islamique de Mauritanie&#10;Ministère de l'Éducation Nationale&#10;Année scolaire 2024-2025"
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  Utilisez une ligne par élément. Ce texte supporte l'arabe et le français.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="w-4 h-4" />
                Signature et pied de page
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Titre de signature</Label>
                <Input
                  value={signatureTitle}
                  onChange={(e) => setSignatureTitle(e.target.value)}
                  placeholder="Le Directeur"
                />
              </div>
              <div className="space-y-2">
                <Label>Texte de pied de page</Label>
                <Textarea
                  value={footerText}
                  onChange={(e) => setFooterText(e.target.value)}
                  placeholder="Ex: Adresse de l'établissement | Téléphone | Email"
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet Mentions */}
        <TabsContent value="mentions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2">
                  <Award className="w-4 h-4" />
                  Mentions selon la moyenne
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
                      type="color"
                      value={mention.color || '#3b82f6'}
                      onChange={(e) => updateMention(index, 'color', e.target.value)}
                      className="w-10 h-10 p-1 cursor-pointer shrink-0"
                    />
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
        </TabsContent>
      </Tabs>

      {/* Bouton de sauvegarde */}
      <div className="sticky bottom-0 pt-4 pb-2 bg-background mt-4">
        <Button onClick={handleSave} className="w-full" disabled={isSaving}>
          {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Enregistrer les paramètres
        </Button>
      </div>
    </div>
  );
};