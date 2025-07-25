
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Edit, Trash2, Plus, BookOpen, ArrowLeft } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import LessonsManagement from './LessonsManagement';

interface LevelsManagementProps {
  formationId: string;
  formationTitle: string;
  onBack: () => void;
}

const LevelsManagement: React.FC<LevelsManagementProps> = ({ formationId, formationTitle, onBack }) => {
  const [selectedLevel, setSelectedLevel] = useState<{ id: string; title: string } | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingLevel, setEditingLevel] = useState<any>(null);
  const queryClient = useQueryClient();

  const { data: levels, isLoading } = useQuery({
    queryKey: ['levels', formationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('levels')
        .select('*')
        .eq('formation_id', formationId)
        .order('order_index', { ascending: true });

      if (error) throw error;
      return data || [];
    }
  });

  const createLevelMutation = useMutation({
    mutationFn: async (levelData: {
      title: string;
      description: string;
      order_index: number;
    }) => {
      const { data, error } = await supabase
        .from('levels')
        .insert({
          ...levelData,
          formation_id: formationId
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['levels', formationId] });
      toast.success('Niveau créé avec succès');
      setIsCreateDialogOpen(false);
    },
    onError: (error) => {
      toast.error('Erreur lors de la création du niveau');
      console.error(error);
    }
  });

  const updateLevelMutation = useMutation({
    mutationFn: async ({ id, levelData }: { 
      id: string; 
      levelData: { title: string; description: string; order_index: number; }
    }) => {
      const { data, error } = await supabase
        .from('levels')
        .update(levelData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['levels', formationId] });
      toast.success('Niveau mis à jour avec succès');
      setIsEditDialogOpen(false);
      setEditingLevel(null);
    },
    onError: (error) => {
      toast.error('Erreur lors de la mise à jour du niveau');
      console.error(error);
    }
  });

  const deleteLevelMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('levels')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['levels', formationId] });
      toast.success('Niveau supprimé avec succès');
    },
    onError: (error) => {
      toast.error('Erreur lors de la suppression du niveau');
      console.error(error);
    }
  });

  const handleCreateSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const order_index = parseInt(formData.get('order_index') as string) || 1;

    createLevelMutation.mutate({ title, description, order_index });
  };

  const handleEditSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const order_index = parseInt(formData.get('order_index') as string) || 1;

    updateLevelMutation.mutate({ 
      id: editingLevel.id, 
      levelData: { title, description, order_index }
    });
  };

  const handleEdit = (level: any) => {
    setEditingLevel(level);
    setIsEditDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce niveau ?')) {
      deleteLevelMutation.mutate(id);
    }
  };

  if (selectedLevel) {
    return (
      <LessonsManagement
        levelId={selectedLevel.id}
        levelTitle={selectedLevel.title}
        formationTitle={formationTitle}
        onBack={() => setSelectedLevel(null)}
      />
    );
  }

  if (isLoading) {
    return <div className="text-center py-8">Chargement des niveaux...</div>;
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 min-h-screen p-6">
      <Card className="shadow-lg border-0">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Button variant="ghost" size="sm" onClick={onBack} className="text-white hover:bg-white/20">
                <ArrowLeft size={16} />
              </Button>
              <div>
                <CardTitle className="text-xl">Niveaux de la formation</CardTitle>
                <p className="text-blue-100 text-sm mt-1">{formationTitle}</p>
              </div>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-white text-blue-600 hover:bg-blue-50">
                  <Plus size={16} className="mr-2" />
                  Nouveau niveau
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Créer un nouveau niveau</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Titre</label>
                    <Input name="title" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Description</label>
                    <Textarea name="description" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Numéro d'ordre</label>
                    <Input name="order_index" type="number" min="1" defaultValue="1" required />
                  </div>
                  <Button type="submit" className="w-full" disabled={createLevelMutation.isPending}>
                    {createLevelMutation.isPending ? 'Création...' : 'Créer le niveau'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="font-semibold">Ordre</TableHead>
                  <TableHead className="font-semibold">Titre</TableHead>
                  <TableHead className="font-semibold">Description</TableHead>
                  <TableHead className="font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {levels?.map((level, index) => (
                  <TableRow 
                    key={level.id}
                    className={`transition-colors hover:bg-blue-50 ${
                      index % 2 === 0 ? 'bg-white' : 'bg-slate-50'
                    }`}
                  >
                    <TableCell>
                      <div className="flex items-center">
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm font-medium">
                          {level.order_index}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-gray-900">{level.title}</TableCell>
                    <TableCell className="text-gray-600">{level.description}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedLevel({ id: level.id, title: level.title })}
                          className="text-blue-600 border-blue-200 hover:bg-blue-50"
                        >
                          <BookOpen size={14} className="mr-1" />
                          Leçons
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-gray-600 hover:bg-gray-50"
                          onClick={() => handleEdit(level)}
                        >
                          <Edit size={14} />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(level.id)}
                          className="text-red-600 border-red-200 hover:bg-red-50"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le niveau</DialogTitle>
          </DialogHeader>
          {editingLevel && (
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Titre</label>
                <Input name="title" defaultValue={editingLevel.title} required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <Textarea name="description" defaultValue={editingLevel.description} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Numéro d'ordre</label>
                <Input 
                  name="order_index" 
                  type="number" 
                  min="1" 
                  defaultValue={editingLevel.order_index} 
                  required 
                />
              </div>
              <Button type="submit" className="w-full" disabled={updateLevelMutation.isPending}>
                {updateLevelMutation.isPending ? 'Mise à jour...' : 'Mettre à jour le niveau'}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LevelsManagement;
