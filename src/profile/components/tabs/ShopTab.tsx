/**
 * Onglet boutique du profil - affiche et gère les produits/services de l'utilisateur
 * Permet aussi de créer une boutique physique
 */
import React, { useState } from 'react';
import { Plus, Package, Store } from 'lucide-react';
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
import { usePhysicalShop } from '@/hooks/shop/usePhysicalShop';
import { useUserShops } from '@/hooks/shop/useMultiShop';
import CreateShopDialog from '@/components/shop/multi-boutique/CreateShopDialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';

interface ShopTabProps {
  userId?: string;
}

const ShopTab: React.FC<ShopTabProps> = ({ userId }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isOwnProfile = !userId || userId === user?.id;

  // Services
  const { data: services, isLoading } = useUserServices(userId || user?.id);
  const createService = useCreateService();
  const updateService = useUpdateService();
  const deleteService = useDeleteService();
  const addServiceFiles = useAddServiceFiles();

  // Boutiques physiques
  const { data: userShops, isLoading: isLoadingShops } = useUserShops();

  const [showForm, setShowForm] = useState(false);
  const [showCreateShopDialog, setShowCreateShopDialog] = useState(false);
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

  if (isLoading || isLoadingShops) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Section Boutiques physiques */}
      {isOwnProfile && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Store size={20} className="text-primary" />
              Mes boutiques
            </h2>
            <Button onClick={() => setShowCreateShopDialog(true)} size="sm" variant="outline">
              <Plus size={16} className="mr-2" />
              Nouvelle boutique
            </Button>
          </div>

          {userShops && userShops.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {userShops.map((shop) => (
                <Card 
                  key={shop.id} 
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigate(`/shop?id=${shop.id}`)}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Store size={16} className="text-emerald-600" />
                      {shop.name}
                    </CardTitle>
                    {shop.address && (
                      <CardDescription className="text-xs">{shop.address}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>{shop.products_count} produits</span>
                      <span>{shop.total_stock_units} en stock</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-8">
                <Store size={40} className="text-muted-foreground mb-3" />
                <p className="text-muted-foreground text-center mb-4">
                  Vous n'avez pas encore de boutique physique
                </p>
                <Button onClick={() => setShowCreateShopDialog(true)}>
                  <Plus size={16} className="mr-2" />
                  Créer ma boutique
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Séparateur */}
      {isOwnProfile && <hr className="border-border" />}

      {/* Section Services */}
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

      {/* Dialog de création/modification service */}
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

      {/* Dialog de création de boutique */}
      <CreateShopDialog 
        open={showCreateShopDialog} 
        onOpenChange={setShowCreateShopDialog} 
      />
    </div>
  );
};

export default ShopTab;
