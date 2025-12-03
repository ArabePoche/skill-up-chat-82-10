/**
 * Onglet Templates de bulletins
 * Gestion des modèles de mise en page PDF
 */
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Layout, Plus, Check, Eye, Edit, Trash2, Loader2 } from 'lucide-react';
import {
  useBulletinTemplates,
  useSaveBulletinTemplate,
  useSetDefaultTemplate,
  useDeleteBulletinTemplate,
  type BulletinTemplate,
} from '../../hooks/useBulletins';

interface BulletinTemplatesTabProps {
  schoolId: string;
}

export const BulletinTemplatesTab: React.FC<BulletinTemplatesTabProps> = ({ schoolId }) => {
  const { data: templates = [], isLoading } = useBulletinTemplates(schoolId);
  const saveTemplate = useSaveBulletinTemplate();
  const setDefault = useSetDefaultTemplate();
  const deleteTemplate = useDeleteBulletinTemplate();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<BulletinTemplate | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    layout_type: 'classic' as string,
    logo_position: 'left' as string,
    primary_color: '#1a365d',
    secondary_color: '#2d3748',
    font_family: 'Arial',
  });

  const resetForm = () => {
    setFormData({
      name: '',
      layout_type: 'classic',
      logo_position: 'left',
      primary_color: '#1a365d',
      secondary_color: '#2d3748',
      font_family: 'Arial',
    });
    setEditingTemplate(null);
  };

  const openEditDialog = (template: BulletinTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      layout_type: template.layout_type,
      logo_position: template.logo_position,
      primary_color: template.primary_color,
      secondary_color: template.secondary_color,
      font_family: template.font_family,
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    await saveTemplate.mutateAsync({
      id: editingTemplate?.id,
      school_id: schoolId,
      name: formData.name,
      layout_type: formData.layout_type,
      logo_position: formData.logo_position,
      primary_color: formData.primary_color,
      secondary_color: formData.secondary_color,
      font_family: formData.font_family,
    });
    setIsDialogOpen(false);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Supprimer ce template ?')) {
      await deleteTemplate.mutateAsync({ id, schoolId });
    }
  };

  const handleSetDefault = async (id: string) => {
    await setDefault.mutateAsync({ id, schoolId });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="font-medium">Templates de mise en page</h4>
          <p className="text-sm text-muted-foreground">
            Personnalisez l'apparence des bulletins
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Nouveau template
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingTemplate ? 'Modifier le template' : 'Nouveau template'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Nom du template</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Standard, Moderne..."
                />
              </div>
              <div>
                <Label>Type de mise en page</Label>
                <Select value={formData.layout_type} onValueChange={(v) => setFormData({ ...formData, layout_type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="classic">Classique</SelectItem>
                    <SelectItem value="modern">Moderne</SelectItem>
                    <SelectItem value="compact">Compact</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Position du logo</Label>
                <Select value={formData.logo_position} onValueChange={(v) => setFormData({ ...formData, logo_position: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left">Gauche</SelectItem>
                    <SelectItem value="center">Centre</SelectItem>
                    <SelectItem value="right">Droite</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Couleur principale</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={formData.primary_color}
                      onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                      className="w-12 h-10 p-1"
                    />
                    <Input
                      value={formData.primary_color}
                      onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label>Couleur secondaire</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={formData.secondary_color}
                      onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                      className="w-12 h-10 p-1"
                    />
                    <Input
                      value={formData.secondary_color}
                      onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div>
                <Label>Police de caractères</Label>
                <Select value={formData.font_family} onValueChange={(v) => setFormData({ ...formData, font_family: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Arial">Arial</SelectItem>
                    <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                    <SelectItem value="Helvetica">Helvetica</SelectItem>
                    <SelectItem value="Georgia">Georgia</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleSave} className="w-full" disabled={!formData.name || saveTemplate.isPending}>
                {saveTemplate.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingTemplate ? 'Mettre à jour' : 'Créer le template'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {templates.length === 0 ? (
        <Card className="p-8 text-center">
          <Layout className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Aucun template créé</p>
          <p className="text-sm text-muted-foreground">Créez votre premier template de bulletin</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {templates.map((template) => (
            <Card key={template.id} className={template.is_default ? 'border-primary' : ''}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{template.name}</h4>
                      {template.is_default && (
                        <Badge variant="default" className="text-xs">
                          <Check className="w-3 h-3 mr-1" />
                          Par défaut
                        </Badge>
                      )}
                      <Badge variant="outline">{template.layout_type}</Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>Logo: {template.logo_position}</span>
                      <span>Police: {template.font_family}</span>
                      <div className="flex items-center gap-1">
                        <div 
                          className="w-4 h-4 rounded border" 
                          style={{ backgroundColor: template.primary_color }}
                        />
                        <div 
                          className="w-4 h-4 rounded border" 
                          style={{ backgroundColor: template.secondary_color }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <Button variant="outline" size="sm" onClick={() => openEditDialog(template)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    {!template.is_default && (
                      <>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleSetDefault(template.id)}
                          disabled={setDefault.isPending}
                        >
                          Définir par défaut
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDelete(template.id)}
                          disabled={deleteTemplate.isPending}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* Zone de prévisualisation */}
                <div className="mt-4 p-4 border rounded-lg bg-muted/30 min-h-[100px] flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <Layout className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-sm">Aperçu du template</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Section d'aide */}
      <Card className="mt-6">
        <CardContent className="p-4">
          <h4 className="font-medium mb-2">Personnalisation avancée</h4>
          <p className="text-sm text-muted-foreground">
            Chaque template peut inclure :
          </p>
          <ul className="text-sm text-muted-foreground mt-2 space-y-1 list-disc list-inside">
            <li>En-tête avec logo et informations de l'école</li>
            <li>Tableau des notes avec moyennes</li>
            <li>Graphiques de progression</li>
            <li>Zone d'appréciation générale</li>
            <li>Signature du directeur et cachet</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};
