
import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, Info, Plus } from 'lucide-react';
import { useCreatePromotion, usePromotions } from '@/hooks/usePromotion';

interface GroupPlanOptionsProps {
  maxStudentsPerPromotion?: number;
  autoCreatePromotions?: boolean;
  enableGroupTraining?: boolean;
  promotionNamingPattern?: string;
  customNamingPattern?: string;
  formationId: string;
  onMaxStudentsChange: (value: number | undefined) => void;
  onAutoCreateChange: (value: boolean) => void;
  onEnableGroupChange: (value: boolean) => void;
  onNamingPatternChange: (value: string) => void;
  onCustomNamingChange: (value: string) => void;
}

const GroupPlanOptions: React.FC<GroupPlanOptionsProps> = ({
  maxStudentsPerPromotion,
  autoCreatePromotions,
  enableGroupTraining,
  promotionNamingPattern,
  customNamingPattern,
  formationId,
  onMaxStudentsChange,
  onAutoCreateChange,
  onEnableGroupChange,
  onNamingPatternChange,
  onCustomNamingChange
}) => {
  const [newPromotionName, setNewPromotionName] = useState('');
  const { data: promotions = [] } = usePromotions(formationId);
  const createPromotion = useCreatePromotion();

  const handleCreatePromotion = async () => {
    if (!newPromotionName.trim()) return;
    
    try {
      await createPromotion.mutateAsync({
        name: newPromotionName.trim(),
        formationId
      });
      setNewPromotionName('');
    } catch (error) {
      console.error('Erreur création promotion:', error);
    }
  };
  return (
    <div className="space-y-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
      <div className="flex items-center gap-2 mb-3">
        <Users className="h-5 w-5 text-orange-600" />
        <Label className="text-base font-semibold text-orange-800">
          Configuration du Plan Groupe
        </Label>
      </div>
      
      {/* Nombre maximum d'étudiants par promotion */}
      <div className="space-y-2">
        <Label className="text-sm flex items-center gap-1">
          Nombre maximum d'élèves par promotion
          <Info className="h-3 w-3 text-gray-400" />
        </Label>
        <Input
          type="number"
          min="1"
          max="100"
          value={maxStudentsPerPromotion || ''}
          onChange={(e) => onMaxStudentsChange(parseInt(e.target.value) || undefined)}
          placeholder="Ex: 20"
          className="text-sm"
        />
        <p className="text-xs text-gray-600">
          Définit le nombre maximum d'élèves qui peuvent rejoindre une promotion
        </p>
      </div>

      {/* Options de gestion automatique */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <Label className="text-sm">Création automatique de promotions</Label>
            <p className="text-xs text-gray-600">Crée automatiquement une nouvelle promotion quand la précédente est pleine</p>
          </div>
          <Switch
            checked={autoCreatePromotions || false}
            onCheckedChange={onAutoCreateChange}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <Label className="text-sm">Formation en groupe activée</Label>
            <p className="text-xs text-gray-600">Permet aux élèves d'interagir entre eux dans la même promotion</p>
          </div>
          <Switch
            checked={enableGroupTraining || false}
            onCheckedChange={onEnableGroupChange}
          />
        </div>
      </div>

      {/* Modèle de nommage des promotions */}
      <div className="space-y-2">
        <Label className="text-sm">Modèle de nommage des promotions</Label>
        <Select 
          value={promotionNamingPattern || 'formation_number'} 
          onValueChange={onNamingPatternChange}
        >
          <SelectTrigger className="text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="formation_number">Formation + Numéro (ex: Formation 1)</SelectItem>
            <SelectItem value="date_based">Basé sur la date (ex: Formation Jan 2025)</SelectItem>
            <SelectItem value="level_based">Basé sur le niveau (ex: Niveau Débutant)</SelectItem>
            <SelectItem value="custom">Personnalisé</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Modèle personnalisé */}
      {promotionNamingPattern === 'custom' && (
        <div className="space-y-2">
          <Label className="text-sm">Modèle personnalisé</Label>
          <Input
            value={customNamingPattern || ''}
            onChange={(e) => onCustomNamingChange(e.target.value)}
            placeholder="Ex: Groupe {number} - {formation}"
            className="text-sm"
          />
          <div className="text-xs text-gray-600 space-y-1">
            <p>Variables disponibles :</p>
            <div className="grid grid-cols-2 gap-1">
              <code className="bg-gray-100 px-1 rounded">{`{number}`}</code>
              <span>Numéro séquentiel</span>
              <code className="bg-gray-100 px-1 rounded">{`{formation}`}</code>
              <span>Nom de la formation</span>
              <code className="bg-gray-100 px-1 rounded">{`{date}`}</code>
              <span>Date de création</span>
              <code className="bg-gray-100 px-1 rounded">{`{month}`}</code>
              <span>Mois en cours</span>
            </div>
          </div>
        </div>
      )}

      {/* Aperçu du nom généré */}
      <div className="mt-3 p-2 bg-white border rounded">
        <Label className="text-xs text-gray-500">Aperçu du nom :</Label>
        <div className="text-sm font-medium text-orange-700">
          {(() => {
            switch(promotionNamingPattern) {
              case 'date_based':
                return `Formation ${new Date().toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}`;
              case 'level_based':
                return 'Niveau Débutant';
              case 'custom':
                return customNamingPattern 
                  ? customNamingPattern
                    .replace('{number}', '1')
                    .replace('{formation}', 'Ma Formation')
                    .replace('{date}', new Date().toLocaleDateString('fr-FR'))
                    .replace('{month}', new Date().toLocaleDateString('fr-FR', { month: 'long' }))
                  : 'Groupe 1 - Ma Formation';
              default:
                return 'Formation 1';
            }
          })()}
        </div>
      </div>

      {/* Création rapide de promotion */}
      <div className="space-y-2 pt-4 border-t border-orange-200">
        <Label className="text-sm font-medium">Créer une promotion rapidement</Label>
        <div className="flex gap-2">
          <Input
            value={newPromotionName}
            onChange={(e) => setNewPromotionName(e.target.value)}
            placeholder="Nom de la promotion"
            className="text-sm"
          />
          <Button 
            onClick={handleCreatePromotion}
            disabled={!newPromotionName.trim() || createPromotion.isPending}
            size="sm"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {promotions.length > 0 && (
          <div className="text-xs text-gray-600">
            Promotions existantes : {promotions.map(p => p.name).join(', ')}
          </div>
        )}
      </div>

      {/* Badge de statut */}
      <div className="flex justify-center mt-4">
        <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300">
          <Users className="h-3 w-3 mr-1" />
          Plan Groupe Configuré
        </Badge>
      </div>
    </div>
  );
};

export default GroupPlanOptions;
