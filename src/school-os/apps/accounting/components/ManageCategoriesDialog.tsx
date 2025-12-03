/**
 * Dialog pour gérer les catégories de transactions
 */
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Pencil, Trash2, X, Check, Settings2 } from 'lucide-react';
import { 
  useTransactionCategories, 
  useAddTransactionCategory, 
  useUpdateTransactionCategory,
  useDeleteTransactionCategory,
  useInitializeDefaultCategories 
} from '../hooks/useTransactionCategories';

interface ManageCategoriesDialogProps {
  schoolId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ManageCategoriesDialog: React.FC<ManageCategoriesDialogProps> = ({
  schoolId,
  open,
  onOpenChange,
}) => {
  const [activeTab, setActiveTab] = useState<'income' | 'expense'>('income');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const { data: categories, isLoading } = useTransactionCategories(schoolId);
  const addCategory = useAddTransactionCategory();
  const updateCategory = useUpdateTransactionCategory();
  const deleteCategory = useDeleteTransactionCategory();
  const initializeCategories = useInitializeDefaultCategories();

  const handleAddCategory = async () => {
    if (!schoolId || !newCategoryName.trim()) return;
    
    await addCategory.mutateAsync({
      school_id: schoolId,
      name: newCategoryName.trim(),
      type: activeTab,
    });
    setNewCategoryName('');
  };

  const handleUpdateCategory = async (id: string) => {
    if (!editingName.trim()) return;
    
    await updateCategory.mutateAsync({ id, name: editingName.trim() });
    setEditingId(null);
    setEditingName('');
  };

  const handleDeleteCategory = async (id: string) => {
    await deleteCategory.mutateAsync(id);
  };

  const handleInitialize = async () => {
    if (!schoolId) return;
    await initializeCategories.mutateAsync(schoolId);
  };

  const rawCategories = categories?.raw || [];
  const hasCustomCategories = rawCategories.length > 0;

  const filteredCategories = rawCategories.filter(c => c.type === activeTab);
  const displayCategories = hasCustomCategories 
    ? filteredCategories 
    : (activeTab === 'income' ? categories?.income : categories?.expense) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Gérer les catégories
          </DialogTitle>
        </DialogHeader>

        {!hasCustomCategories && (
          <div className="bg-muted/50 rounded-lg p-4 mb-4">
            <p className="text-sm text-muted-foreground mb-3">
              Vous utilisez les catégories par défaut. Personnalisez-les pour votre école.
            </p>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleInitialize}
              disabled={initializeCategories.isPending}
            >
              {initializeCategories.isPending ? 'Initialisation...' : 'Initialiser les catégories'}
            </Button>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'income' | 'expense')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="income">Revenus</TabsTrigger>
            <TabsTrigger value="expense">Dépenses</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-4 mt-4">
            {/* Formulaire d'ajout */}
            {hasCustomCategories && (
              <div className="flex gap-2">
                <Input
                  placeholder="Nouvelle catégorie..."
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                />
                <Button 
                  size="icon" 
                  onClick={handleAddCategory}
                  disabled={addCategory.isPending || !newCategoryName.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Liste des catégories */}
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {isLoading ? (
                <p className="text-sm text-muted-foreground text-center py-4">Chargement...</p>
              ) : hasCustomCategories ? (
                filteredCategories.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Aucune catégorie. Ajoutez-en une ci-dessus.
                  </p>
                ) : (
                  filteredCategories.map((category) => (
                    <div 
                      key={category.id} 
                      className="flex items-center gap-2 p-2 rounded-md bg-muted/30 hover:bg-muted/50"
                    >
                      {editingId === category.id ? (
                        <>
                          <Input
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            className="flex-1 h-8"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleUpdateCategory(category.id);
                              if (e.key === 'Escape') setEditingId(null);
                            }}
                          />
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-8 w-8"
                            onClick={() => handleUpdateCategory(category.id)}
                          >
                            <Check className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-8 w-8"
                            onClick={() => setEditingId(null)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <span className="flex-1 text-sm">{category.name}</span>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-8 w-8"
                            onClick={() => {
                              setEditingId(category.id);
                              setEditingName(category.name);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {!category.is_default && (
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => handleDeleteCategory(category.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  ))
                )
              ) : (
                // Afficher les catégories par défaut (non modifiables)
                (displayCategories as string[]).map((name, index) => (
                  <div 
                    key={index} 
                    className="flex items-center gap-2 p-2 rounded-md bg-muted/30"
                  >
                    <span className="flex-1 text-sm text-muted-foreground">{name}</span>
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
