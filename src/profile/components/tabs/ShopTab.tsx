/**
 * Onglet boutique du profil - affiche et gère les produits/services de l'utilisateur
 */
import React, { useState } from 'react';
import { Plus, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { 
  useUserServices, 
  useCreateService, 
  useUpdateService, 
  useDeleteService,
  type ServiceWithFiles 
} from '@/components/shop/services/hooks/useServices';
import { useAddServiceFiles } from '@/components/shop/services/hooks/useServices';
import ServiceCard from '@/components/shop/services/components/ServiceCard';
import ServiceForm from '@/components/shop/services/components/ServiceForm';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ShopTabProps {
  userId?: string;
}

const ShopTab: React.FC<ShopTabProps> = ({ userId }) => {
  const { user } = useAuth();
  const isOwnProfile = !userId || userId === user?.id;

  const { data: services, isLoading } = useUserServices(userId || user?.id);
  const createService = useCreateService();
  const updateService = useUpdateService();
  const deleteService = useDeleteService();
  const addServiceFiles = useAddServiceFiles();

  const [showForm, setShowForm] = useState(false);
  const [editingService, setEditingService] = useState<ServiceWithFiles | undefined>();
  const [deletingServiceId, setDeletingServiceId] = useState<string | null>(null);

  const handleCreateOrUpdate = async (serviceData: any, files: any[]) => {
    try {
      if (editingService) {
        // Mise à jour
        await updateService.mutateAsync(serviceData);
        
        // Ajouter les nouveaux fichiers si nécessaire
        const newFiles = files.filter(f => !f.id).map(f => ({
          service_id: editingService.id,
          file_url: f.file_url,
          file_type: f.file_type,
          file_name: f.file_name,
          order_index: f.order_index,
        }));
        
        if (newFiles.length > 0) {
          await addServiceFiles.mutateAsync(newFiles);
        }
      } else {
        // Création
        const newService = await createService.mutateAsync(serviceData);
        
        // Ajouter les fichiers au nouveau service
        if (files.length > 0) {
          const serviceFiles = files.map(f => ({
            service_id: newService.id,
            file_url: f.file_url,
            file_type: f.file_type,
            file_name: f.file_name,
            order_index: f.order_index,
          }));
          await addServiceFiles.mutateAsync(serviceFiles);
        }
      }
      
      setShowForm(false);
      setEditingService(undefined);
    } catch (error) {
      console.error('Error saving service:', error);
    }
  };

  const handleEdit = (service: ServiceWithFiles) => {
    setEditingService(service);
    setShowForm(true);
  };

  const handleDelete = async () => {
    if (!deletingServiceId) return;
    
    try {
      await deleteService.mutateAsync(deletingServiceId);
      setDeletingServiceId(null);
    } catch (error) {
      console.error('Error deleting service:', error);
    }
  };

  const handleToggleActive = async (serviceId: string, isActive: boolean) => {
    try {
      await updateService.mutateAsync({ id: serviceId, is_active: isActive });
    } catch (error) {
      console.error('Error toggling service:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header avec bouton d'ajout */}
      {isOwnProfile && (
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Mes services</h2>
          <Button onClick={() => setShowForm(true)} size="sm">
            <Plus size={16} className="mr-2" />
            Nouveau service
          </Button>
        </div>
      )}

      {/* Liste des services */}
      {services && services.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              isOwner={isOwnProfile}
              onEdit={handleEdit}
              onDelete={(id) => setDeletingServiceId(id)}
              onToggleActive={handleToggleActive}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Package size={48} className="mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">
            {isOwnProfile 
              ? 'Vous n\'avez pas encore créé de service' 
              : 'Aucun service disponible'}
          </p>
          {isOwnProfile && (
            <Button onClick={() => setShowForm(true)}>
              <Plus size={16} className="mr-2" />
              Créer mon premier service
            </Button>
          )}
        </div>
      )}

      {/* Dialog de création/modification */}
      <Dialog open={showForm} onOpenChange={(open) => {
        setShowForm(open);
        if (!open) setEditingService(undefined);
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingService ? 'Modifier le service' : 'Créer un service'}
            </DialogTitle>
          </DialogHeader>
          <ServiceForm
            service={editingService}
            onSubmit={handleCreateOrUpdate}
            onCancel={() => {
              setShowForm(false);
              setEditingService(undefined);
            }}
            isSubmitting={createService.isPending || updateService.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmation de suppression */}
      <AlertDialog open={!!deletingServiceId} onOpenChange={(open) => !open && setDeletingServiceId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le service</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer ce service ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ShopTab;
