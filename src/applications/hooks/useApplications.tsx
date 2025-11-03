// Hook pour gérer les candidatures aux posts de recrutement
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Application {
  id: string;
  user_id: string;
  recruiter_id: string;
  source_id: string;
  source_type: string;
  cv_url: string | null;
  message: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  profiles?: {
    first_name: string;
    last_name: string;
    avatar_url: string;
    phone: string;
  };
}

export const useApplications = (recruiterId?: string) => {
  return useQuery({
    queryKey: ['applications', recruiterId],
    queryFn: async () => {
      let query = supabase
        .from('applications')
        .select('*')
        .order('created_at', { ascending: false });

      if (recruiterId) {
        query = query.eq('recruiter_id', recruiterId);
      }

      const { data: applications, error } = await query;

      if (error) throw error;

      // Récupérer les profils des candidats
      const userIds = applications?.map(app => app.user_id) || [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, avatar_url, phone')
        .in('id', userIds);

      // Combiner les données
      const result = applications?.map(app => ({
        ...app,
        profiles: profiles?.find(p => p.id === app.user_id)
      })) || [];

      return result as Application[];
    },
    enabled: !!recruiterId,
    staleTime: 1 * 60 * 1000,
  });
};

export const useSubmitApplication = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      recruiterId,
      sourceId,
      sourceType,
      message,
      cvFile
    }: {
      userId: string;
      recruiterId: string;
      sourceId: string;
      sourceType: string;
      message: string;
      cvFile?: File;
    }) => {
      let cvUrl: string | null = null;

      // Upload du CV si présent
      if (cvFile) {
        const fileExt = cvFile.name.split('.').pop();
        const fileName = `${userId}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('application-files')
          .upload(fileName, cvFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('application-files')
          .getPublicUrl(fileName);

        cvUrl = publicUrl;
      }

      // Créer la candidature
      const { data, error } = await supabase
        .from('applications')
        .insert({
          user_id: userId,
          recruiter_id: recruiterId,
          source_id: sourceId,
          source_type: sourceType,
          message: message.trim(),
          cv_url: cvUrl,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      // Créer une notification pour le recruteur
      await supabase
        .from('notifications')
        .insert({
          user_id: recruiterId,
          type: 'application_received',
          title: 'Nouvelle candidature',
          message: 'Vous avez reçu une nouvelle candidature',
          application_id: data.id,
          is_read: false,
        });

      return data;
    },
    onSuccess: () => {
      toast({
        title: "Candidature envoyée !",
        description: "Votre candidature a été soumise avec succès.",
      });
      queryClient.invalidateQueries({ queryKey: ['applications'] });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'envoyer la candidature",
        variant: "destructive",
      });
    }
  });
};

export const useUpdateApplicationStatus = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      applicationId,
      status
    }: {
      applicationId: string;
      status: 'approved' | 'rejected';
    }) => {
      const { data, error } = await supabase
        .from('applications')
        .update({ status })
        .eq('id', applicationId)
        .select()
        .single();

      if (error) throw error;

      return data;
    },
    onSuccess: (_, variables) => {
      toast({
        title: variables.status === 'approved' ? "Candidature approuvée" : "Candidature rejetée",
        description: variables.status === 'approved' 
          ? "Le candidat a été accepté." 
          : "Le candidat a été rejeté.",
      });
      queryClient.invalidateQueries({ queryKey: ['applications'] });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de mettre à jour la candidature",
        variant: "destructive",
      });
    }
  });
};

export const useCheckExistingApplication = (userId: string, sourceId: string, sourceType: string) => {
  return useQuery({
    queryKey: ['application-check', userId, sourceId, sourceType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('applications')
        .select('id, status')
        .eq('user_id', userId)
        .eq('source_id', sourceId)
        .eq('source_type', sourceType)
        .maybeSingle();

      if (error) throw error;

      return data;
    },
    enabled: !!userId && !!sourceId && !!sourceType,
  });
};
