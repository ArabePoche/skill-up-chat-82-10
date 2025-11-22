/**
 * Composant pour la personnalisation de l'école (logo, couleurs)
 */
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useUpdateSchool, School } from '@/school/hooks/useSchool';
import { Palette, Image, Save } from 'lucide-react';

interface CustomizationSettingsProps {
  school: School | null;
}

export const CustomizationSettings: React.FC<CustomizationSettingsProps> = ({ school }) => {
  const updateSchool = useUpdateSchool();

  const [formData, setFormData] = useState({
    logo_url: '',
    primary_color: '#3b82f6',
    secondary_color: '#8b5cf6',
  });

  useEffect(() => {
    if (school) {
      setFormData({
        logo_url: (school as any).logo_url || '',
        primary_color: (school as any).primary_color || '#3b82f6',
        secondary_color: (school as any).secondary_color || '#8b5cf6',
      });
    }
  }, [school]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school) return;

    await updateSchool.mutateAsync({
      id: school.id,
      ...formData,
    });
  };

  if (!school) {
    return <div>Chargement...</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            <CardTitle>Logo de l'établissement</CardTitle>
          </div>
          <CardDescription>
            Personnalisez le logo affiché dans votre interface
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-4">
            {formData.logo_url && (
              <div className="w-24 h-24 rounded-lg border flex items-center justify-center bg-accent/50 overflow-hidden">
                <img
                  src={formData.logo_url}
                  alt="Logo"
                  className="w-full h-full object-contain"
                />
              </div>
            )}
            <div className="flex-1 space-y-2">
              <Label htmlFor="logo_url">URL du logo</Label>
              <Input
                id="logo_url"
                type="url"
                value={formData.logo_url}
                onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                placeholder="https://exemple.com/logo.png"
              />
              <p className="text-xs text-muted-foreground">
                Entrez l'URL d'une image pour votre logo. Format recommandé : PNG ou SVG (taille max: 200x200px)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            <CardTitle>Couleurs du thème</CardTitle>
          </div>
          <CardDescription>
            Personnalisez les couleurs de votre interface
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="primary_color">Couleur principale</Label>
              <div className="flex gap-2">
                <Input
                  id="primary_color"
                  type="color"
                  value={formData.primary_color}
                  onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                  className="w-20 h-10 cursor-pointer"
                />
                <Input
                  type="text"
                  value={formData.primary_color}
                  onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                  className="flex-1"
                  placeholder="#3b82f6"
                />
              </div>
              <div className="flex items-center gap-2 mt-2">
                <div
                  className="w-full h-12 rounded-md border"
                  style={{ backgroundColor: formData.primary_color }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="secondary_color">Couleur secondaire</Label>
              <div className="flex gap-2">
                <Input
                  id="secondary_color"
                  type="color"
                  value={formData.secondary_color}
                  onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                  className="w-20 h-10 cursor-pointer"
                />
                <Input
                  type="text"
                  value={formData.secondary_color}
                  onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                  className="flex-1"
                  placeholder="#8b5cf6"
                />
              </div>
              <div className="flex items-center gap-2 mt-2">
                <div
                  className="w-full h-12 rounded-md border"
                  style={{ backgroundColor: formData.secondary_color }}
                />
              </div>
            </div>
          </div>

          <div className="p-4 bg-accent/50 rounded-lg border mt-4">
            <h4 className="font-medium mb-2">Aperçu</h4>
            <div className="flex gap-2">
              <Button
                type="button"
                style={{ backgroundColor: formData.primary_color }}
                className="text-white"
              >
                Bouton principal
              </Button>
              <Button
                type="button"
                variant="outline"
                style={{ borderColor: formData.secondary_color, color: formData.secondary_color }}
              >
                Bouton secondaire
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={updateSchool.isPending}>
          <Save className="h-4 w-4 mr-2" />
          {updateSchool.isPending ? 'Enregistrement...' : 'Enregistrer les modifications'}
        </Button>
      </div>
    </form>
  );
};