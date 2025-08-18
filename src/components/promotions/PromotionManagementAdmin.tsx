import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useFormations } from '@/hooks/useFormations';
import { PromotionManagement } from './PromotionManagement';

export const PromotionManagementAdmin: React.FC = () => {
  const [selectedFormationId, setSelectedFormationId] = useState<string>('');
  const { data: formations = [], isLoading } = useFormations();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-muted-foreground">Chargement des formations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Gestion des Promotions</h1>
        <p className="text-muted-foreground">
          Créez et gérez les promotions pour organiser vos élèves par groupes dans chaque formation
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sélectionner une formation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="formation-select">Formation</Label>
            <Select value={selectedFormationId} onValueChange={setSelectedFormationId}>
              <SelectTrigger>
                <SelectValue placeholder="Choisissez une formation" />
              </SelectTrigger>
              <SelectContent>
                {formations.map((formation) => (
                  <SelectItem key={formation.id} value={formation.id}>
                    {formation.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {selectedFormationId && (
        <PromotionManagement formationId={selectedFormationId} />
      )}
    </div>
  );
};