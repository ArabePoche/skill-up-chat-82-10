/**
 * Onglet Templates de bulletins
 * Gestion des modèles de mise en page PDF
 */
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Layout, Plus, Check, Eye, Edit, Trash2 } from 'lucide-react';

interface BulletinTemplatesTabProps {
  schoolId: string;
}

interface Template {
  id: string;
  name: string;
  description: string;
  isDefault: boolean;
  preview?: string;
}

export const BulletinTemplatesTab: React.FC<BulletinTemplatesTabProps> = ({ schoolId }) => {
  const [templates, setTemplates] = useState<Template[]>([
    {
      id: '1',
      name: 'Standard',
      description: 'Mise en page classique avec tableau des notes et moyennes',
      isDefault: true,
    },
    {
      id: '2',
      name: 'Détaillé',
      description: 'Inclut les notes de chaque évaluation et les graphiques de progression',
      isDefault: false,
    },
    {
      id: '3',
      name: 'Compact',
      description: 'Version condensée sur une seule page',
      isDefault: false,
    },
  ]);

  const setAsDefault = (id: string) => {
    setTemplates(templates.map(t => ({
      ...t,
      isDefault: t.id === id,
    })));
  };

  const deleteTemplate = (id: string) => {
    if (templates.find(t => t.id === id)?.isDefault) {
      return; // Ne pas supprimer le template par défaut
    }
    setTemplates(templates.filter(t => t.id !== id));
  };

  return (
    <div className="h-full overflow-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="font-medium">Templates de mise en page</h4>
          <p className="text-sm text-muted-foreground">
            Personnalisez l'apparence des bulletins
          </p>
        </div>
        <Button size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Nouveau template
        </Button>
      </div>

      <div className="grid gap-4">
        {templates.map((template) => (
          <Card key={template.id} className={template.isDefault ? 'border-primary' : ''}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium">{template.name}</h4>
                    {template.isDefault && (
                      <Badge variant="default" className="text-xs">
                        <Check className="w-3 h-3 mr-1" />
                        Par défaut
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {template.description}
                  </p>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <Button variant="outline" size="sm">
                    <Eye className="w-4 h-4 mr-1" />
                    Aperçu
                  </Button>
                  <Button variant="outline" size="sm">
                    <Edit className="w-4 h-4" />
                  </Button>
                  {!template.isDefault && (
                    <>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setAsDefault(template.id)}
                      >
                        Définir par défaut
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => deleteTemplate(template.id)}
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
