
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export const useAvatarUpload = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (file: File) => {
      if (!user?.id) throw new Error('User not authenticated');

      // Upload du nouveau fichier
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Récupérer l'URL publique
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const avatarUrl = urlData.publicUrl;

      // Mettre à jour le profil utilisateur dans la table profiles
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({ 
          id: user.id,
          avatar_url: avatarUrl 
        }, {
          onConflict: 'id'
        });

      if (profileError) throw profileError;

      return avatarUrl;
    },
    onSuccess: (avatarUrl) => {
      toast.success('Photo de profil mise à jour avec succès !');
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      // Rafraîchir les données utilisateur
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
    onError: (error) => {
      console.error('Error uploading avatar:', error);
      toast.error('Erreur lors de la mise à jour de la photo de profil');
    },
  });
};
