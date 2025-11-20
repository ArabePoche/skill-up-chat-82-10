/**
 * Dialog pour sélectionner une famille existante lors de l'ajout d'un élève
 * Permet d'auto-remplir les informations du parent/tuteur
 */
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Users } from 'lucide-react';
import { useFamilies } from '../hooks/useFamilies';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';

interface FamilyFormSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  schoolId: string;
  onFamilySelect: (familyData: {
    family_name: string;
    primary_contact_name?: string;
    primary_contact_phone?: string;
    primary_contact_email?: string;
    address?: string;
  }) => void;
}

export const FamilyFormSelector: React.FC<FamilyFormSelectorProps> = ({
  isOpen,
  onClose,
  schoolId,
  onFamilySelect,
}) => {
  const [searchQuery, setSearchQuery] = React.useState('');
  const { data: families, isLoading } = useFamilies(schoolId);

  const filteredFamilies = React.useMemo(() => {
    if (!families) return [];
    if (!searchQuery) return families;
    
    const query = searchQuery.toLowerCase();
    return families.filter(family => 
      family.family_name.toLowerCase().includes(query) ||
      family.primary_contact_name?.toLowerCase().includes(query) ||
      family.primary_contact_phone?.includes(query)
    );
  }, [families, searchQuery]);

  const handleSelect = (family: any) => {
    onFamilySelect({
      family_name: family.family_name,
      primary_contact_name: family.primary_contact_name || undefined,
      primary_contact_phone: family.primary_contact_phone || undefined,
      primary_contact_email: family.primary_contact_email || undefined,
      address: family.address || undefined,
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Sélectionner une famille
          </DialogTitle>
          <DialogDescription>
            Choisissez une famille existante pour auto-remplir les informations du parent/tuteur
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Barre de recherche */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher une famille..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Liste des familles */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center space-y-2">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
                <p className="text-sm text-muted-foreground">Chargement...</p>
              </div>
            </div>
          ) : filteredFamilies.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              {searchQuery ? 'Aucune famille trouvée.' : 'Aucune famille enregistrée.'}
            </Card>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-2 pr-4">
                {filteredFamilies.map(family => (
                  <Card
                    key={family.id}
                    className="p-4 hover:bg-accent cursor-pointer transition-colors"
                    onClick={() => handleSelect(family)}
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold">{family.family_name}</h4>
                          {family.primary_contact_name && (
                            <p className="text-sm text-muted-foreground">
                              Contact: {family.primary_contact_name}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        {family.primary_contact_phone && (
                          <span>📱 {family.primary_contact_phone}</span>
                        )}
                        {family.primary_contact_email && (
                          <span>✉️ {family.primary_contact_email}</span>
                        )}
                      </div>
                      
                      {family.address && (
                        <p className="text-sm text-muted-foreground">
                          📍 {family.address}
                        </p>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>
            Annuler
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
