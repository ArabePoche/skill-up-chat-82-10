/**
 * Hook pour récupérer les services depuis Supabase
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Service {
  id: string;
  user_id: string;
  name: string;
  description: string;
  price: number;
  duration: number;
  category_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ServiceFile {
  id: string;
  service_id: string;
  file_url: string;
  file_type: string;
  file_name?: string;
  order_index: number;
}

export interface ServiceWithFiles extends Service {
  files?: ServiceFile[];
}

// Hook pour récupérer tous les services actifs
export const useServices = (category?: string) => {
  return useQuery({
    queryKey: ['services', category],
    queryFn: async () => {
      let query = supabase
        .from('services')
        .select('*')
        .eq('is_active', true);
      
      if (category && category !== 'all') {
        query = query.eq('category_id', category);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching services:', error);
        throw error;
      }
      
      return data as Service[];
    },
  });
};

// Hook pour récupérer les services d'un utilisateur spécifique
export const useUserServices = (userId?: string) => {
  return useQuery({
    queryKey: ['user-services', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from('services')
        .select(`
          *,
          files:service_files(*)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching user services:', error);
        throw error;
      }
      
      return data as ServiceWithFiles[];
    },
    enabled: !!userId,
  });
};

// Hook pour créer un service
export const useCreateService = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (newService: Omit<Service, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('services')
        .insert([newService])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      queryClient.invalidateQueries({ queryKey: ['user-services'] });
      toast.success('Service créé avec succès');
    },
    onError: (error) => {
      console.error('Error creating service:', error);
      toast.error('Erreur lors de la création du service');
    },
  });
};

// Hook pour mettre à jour un service
export const useUpdateService = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Service> & { id: string }) => {
      const { data, error } = await supabase
        .from('services')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      queryClient.invalidateQueries({ queryKey: ['user-services'] });
      toast.success('Service mis à jour');
    },
    onError: (error) => {
      console.error('Error updating service:', error);
      toast.error('Erreur lors de la mise à jour du service');
    },
  });
};

// Hook pour supprimer un service
export const useDeleteService = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (serviceId: string) => {
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', serviceId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      queryClient.invalidateQueries({ queryKey: ['user-services'] });
      toast.success('Service supprimé');
    },
    onError: (error) => {
      console.error('Error deleting service:', error);
      toast.error('Erreur lors de la suppression du service');
    },
  });
};

// Hook pour ajouter des fichiers à un service
export const useAddServiceFiles = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (files: Omit<ServiceFile, 'id'>[]) => {
      const { data, error } = await supabase
        .from('service_files')
        .insert(files)
        .select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-services'] });
      toast.success('Fichiers ajoutés');
    },
    onError: (error) => {
      console.error('Error adding service files:', error);
      toast.error('Erreur lors de l\'ajout des fichiers');
    },
  });
};
