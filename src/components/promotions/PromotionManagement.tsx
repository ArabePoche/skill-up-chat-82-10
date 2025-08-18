
import React, { useState } from 'react';
import { Plus, Users, Settings } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { usePromotions, useCreatePromotion } from '@/hooks/usePromotion';

interface PromotionManagementProps {
  formationId: string;
}

export const PromotionManagement: React.FC<PromotionManagementProps> = ({
  formationId,
}) => {
  const [newPromotionName, setNewPromotionName] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const { data: promotions = [], isLoading } = usePromotions(formationId);
  const createPromotion = useCreatePromotion();

  const handleCreatePromotion = async () => {
    if (!newPromotionName.trim()) return;

    try {
      await createPromotion.mutateAsync({
        name: newPromotionName.trim(),
        formationId,
      });

      setNewPromotionName('');
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error('Error creating promotion:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-muted-foreground">Chargement des promotions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Gestion des Promotions</h2>
          <p className="text-muted-foreground">
            Créez et gérez les promotions pour organiser vos élèves en groupes
          </p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Créer une promotion
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Créer une nouvelle promotion</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="promotion-name">Nom de la promotion</Label>
                <Input
                  id="promotion-name"
                  value={newPromotionName}
                  onChange={(e) => setNewPromotionName(e.target.value)}
                  placeholder="Ex: Promotion Hafsa 2024"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleCreatePromotion}
                  disabled={!newPromotionName.trim() || createPromotion.isPending}
                >
                  Créer
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {promotions.map((promotion) => (
          <Card key={promotion.id}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-lg">
                <span className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  {promotion.name}
                </span>
                <Badge variant="secondary">
                  {promotion.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-sm text-muted-foreground">
                  Créée le {new Date(promotion.created_at).toLocaleDateString('fr-FR')}
                </div>
                
                <div className="flex justify-end">
                  <Button variant="ghost" size="sm">
                    <Settings className="h-4 w-4 mr-2" />
                    Gérer
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {promotions.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              Aucune promotion créée
            </h3>
            <p className="text-muted-foreground mb-4">
              Créez votre première promotion pour organiser vos élèves en groupes
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Créer une promotion
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
