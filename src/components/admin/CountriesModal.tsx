import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Globe, User } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface CountriesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Modal qui affiche la liste des pays avec leurs utilisateurs
 */
export const CountriesModal: React.FC<CountriesModalProps> = ({ isOpen, onClose }) => {
  const { data: countriesData, isLoading } = useQuery({
    queryKey: ['countries-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, country, avatar_url')
        .not('country', 'is', null)
        .order('country', { ascending: true });

      if (error) throw error;

      // Grouper les utilisateurs par pays
      const grouped = data.reduce((acc, profile) => {
        const country = profile.country || 'Non spécifié';
        if (!acc[country]) {
          acc[country] = [];
        }
        acc[country].push(profile);
        return acc;
      }, {} as Record<string, typeof data>);

      return grouped;
    },
    enabled: isOpen,
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Globe className="w-6 h-6 text-primary" />
            Répartition par pays
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Chargement des données...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(countriesData || {}).map(([country, users]) => (
              <Card key={country}>
                <CardContent className="pt-6">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Globe className="w-5 h-5 text-primary" />
                      {country}
                    </h3>
                    <span className="text-sm text-muted-foreground bg-muted px-3 py-1 rounded-full">
                      {users.length} utilisateur{users.length > 1 ? 's' : ''}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {users.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={user.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {user.first_name?.[0]}{user.last_name?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">
                            {user.first_name} {user.last_name}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}

            {Object.keys(countriesData || {}).length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Globe className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Aucun pays enregistré</p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
