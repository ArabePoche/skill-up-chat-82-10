
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Edit, Trash2, Search, BookOpen, Users, Eye } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const FormationsList = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const queryClient = useQueryClient();

  const { data: formations, isLoading } = useQuery({
    queryKey: ['formations-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('formations')
        .select(`
          *,
          profiles:author_id (
            first_name,
            last_name,
            username
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    }
  });

  const deleteFormationMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('formations')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['formations-list'] });
      toast.success('Formation supprimée avec succès');
    },
    onError: (error) => {
      toast.error('Erreur lors de la suppression de la formation');
      console.error(error);
    }
  });

  const toggleFormationStatus = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('formations')
        .update({ is_active: !isActive })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['formations-list'] });
      toast.success('Statut de la formation mis à jour');
    },
    onError: (error) => {
      toast.error('Erreur lors de la mise à jour du statut');
      console.error(error);
    }
  });

  const filteredFormations = formations?.filter(formation =>
    formation.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    formation.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return <div className="text-center py-8">Chargement des formations...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen size={20} />
          Liste des formations ({formations?.length || 0})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Barre de recherche */}
        <div className="mb-6 relative">
          <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Rechercher une formation..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Tableau des formations */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Formation</TableHead>
                <TableHead>Auteur</TableHead>
                <TableHead>Prix</TableHead>
                <TableHead>Étudiants</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFormations?.map((formation) => (
                <TableRow key={formation.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {formation.image_url && (
                        <img
                          src={formation.image_url}
                          alt={formation.title}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                      )}
                      <div>
                        <div className="font-medium">{formation.title}</div>
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          {formation.description}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {formation.profiles ? 
                      `${formation.profiles.first_name || ''} ${formation.profiles.last_name || ''}`.trim() || 
                      formation.profiles.username || 'Auteur inconnu' : 'Auteur inconnu'}
                  </TableCell>
                  <TableCell>
                    {formation.price ? `${formation.price.toLocaleString('fr-FR')} FCFA` : 'Gratuit'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Users size={14} />
                      {formation.students_count || 0}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={formation.is_active ? 'default' : 'secondary'}
                      className="cursor-pointer"
                      onClick={() => toggleFormationStatus.mutate({ 
                        id: formation.id, 
                        isActive: formation.is_active 
                      })}
                    >
                      {formation.is_active ? 'Actif' : 'Inactif'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" title="Voir les détails">
                        <Eye size={14} />
                      </Button>
                      <Button size="sm" variant="outline" title="Modifier">
                        <Edit size={14} />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700" title="Supprimer">
                            <Trash2 size={14} />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                            <AlertDialogDescription>
                              Êtes-vous sûr de vouloir supprimer la formation "{formation.title}" ? 
                              Cette action est irréversible et supprimera également tous les niveaux, 
                              leçons et exercices associés.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteFormationMutation.mutate(formation.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Supprimer
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {filteredFormations?.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            Aucune formation trouvée
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FormationsList;
