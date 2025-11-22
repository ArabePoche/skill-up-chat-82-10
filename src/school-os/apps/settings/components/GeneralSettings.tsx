/**
 * Composant pour gérer les paramètres généraux de l'école
 */
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUpdateSchool, School, SchoolType } from '@/school/hooks/useSchool';
import { Save, Building2, Globe, Phone, Mail, Calendar } from 'lucide-react';
import { getData } from 'country-list';

interface GeneralSettingsProps {
  school: School | null;
}

export const GeneralSettings: React.FC<GeneralSettingsProps> = ({ school }) => {
  const updateSchool = useUpdateSchool();
  const countries = getData();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    school_type: 'physical' as SchoolType,
    country: '',
    city: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    founded_year: undefined as number | undefined,
    teaching_language: '',
  });

  useEffect(() => {
    if (school) {
      setFormData({
        name: school.name || '',
        description: school.description || '',
        school_type: school.school_type || 'physical',
        country: (school as any).country || '',
        city: (school as any).city || '',
        address: (school as any).address || '',
        phone: (school as any).phone || '',
        email: (school as any).email || '',
        website: (school as any).website || '',
        founded_year: (school as any).founded_year || undefined,
        teaching_language: (school as any).teaching_language || '',
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
            <Building2 className="h-5 w-5" />
            <CardTitle>Informations de base</CardTitle>
          </div>
          <CardDescription>
            Les informations principales de votre établissement
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nom de l'école *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="school_type">Type d'établissement</Label>
              <Select
                value={formData.school_type}
                onValueChange={(value: SchoolType) => setFormData({ ...formData, school_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="physical">Physique</SelectItem>
                  <SelectItem value="virtual">Virtuel</SelectItem>
                  <SelectItem value="both">Hybride</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              placeholder="Description de votre établissement..."
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            <CardTitle>Localisation</CardTitle>
          </div>
          <CardDescription>
            Adresse et informations géographiques
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="country">Pays</Label>
              <Select
                value={formData.country}
                onValueChange={(value) => setFormData({ ...formData, country: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un pays" />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((country) => (
                    <SelectItem key={country.code} value={country.name}>
                      {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">Ville</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Adresse complète</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Rue, numéro, quartier..."
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            <CardTitle>Contact</CardTitle>
          </div>
          <CardDescription>
            Informations de contact de l'établissement
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Téléphone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="website">Site web</Label>
            <Input
              id="website"
              type="url"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              placeholder="https://..."
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            <CardTitle>Informations complémentaires</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="founded_year">Année de création</Label>
              <Input
                id="founded_year"
                type="number"
                value={formData.founded_year || ''}
                onChange={(e) => setFormData({ ...formData, founded_year: e.target.value ? parseInt(e.target.value) : undefined })}
                min="1800"
                max={new Date().getFullYear()}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="teaching_language">Langue d'enseignement</Label>
              <Input
                id="teaching_language"
                value={formData.teaching_language}
                onChange={(e) => setFormData({ ...formData, teaching_language: e.target.value })}
                placeholder="Français, Anglais..."
              />
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