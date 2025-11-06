import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/**
 * Hook pour charger les notifications détaillées d'une catégorie spécifique
 * Utilisé en lazy loading quand l'utilisateur déplie une catégorie
 */
export const useCategoryNotifications = (category: string, enabled: boolean = false) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['category-notifications', category, user?.id],
    staleTime: 30000,
    queryFn: async () => {
      if (!user?.id) return [];

      // Déterminer le type de notification selon la catégorie
      let typeFilter: string[] = [];
      
      switch (category) {
        case 'friend_requests':
          typeFilter = ['friend_request'];
          break;
        case 'enrollment_requests':
          typeFilter = ['enrollment_request'];
          break;
        case 'plan_changes':
          typeFilter = ['plan_change_request'];
          break;
        case 'payment_requests':
          typeFilter = ['payment_request'];
          break;
        case 'applications':
          typeFilter = ['application_received'];
          break;
        case 'reactions':
          typeFilter = ['post_reaction', 'video_reaction'];
          break;
        case 'orders':
          typeFilter = ['new_order'];
          break;
        default:
          // Pour "others", on prend tout sauf les types connus
          typeFilter = [];
      }

      // Construire la requête de base
      let query = supabase
        .from('notifications')
        .select('*')
        .or(`user_id.eq.${user.id},is_for_all_admins.eq.true`)
        .order('created_at', { ascending: false });

      // Appliquer le filtre de type
      if (typeFilter.length > 0) {
        query = query.in('type', typeFilter);
      } else if (category === 'others') {
        // Pour "others", exclure les types connus
        query = query.not('type', 'in', '(friend_request,enrollment_request,plan_change_request,payment_request,application_received,post_reaction,video_reaction,new_order)');
      }

      const { data: notifications, error } = await query;

      if (error) {
        console.error(`Error fetching ${category} notifications:`, error);
        return [];
      }

      if (!notifications || notifications.length === 0) return [];

      // Enrichir uniquement les notifications qui en ont besoin
      const enrichedNotifications = await Promise.all(
        notifications.map(async (notification) => {
          try {
            // Pour les demandes d'inscription
            if (notification.type === 'enrollment_request' && notification.enrollment_id) {
              const { data: enrollment } = await supabase
                .from('enrollment_requests')
                .select('user_id, formation_id')
                .eq('id', notification.enrollment_id)
                .single();

              if (enrollment) {
                const [profileRes, formationRes] = await Promise.all([
                  supabase
                    .from('profiles')
                    .select('id, first_name, last_name, email, username, phone, avatar_url, country')
                    .eq('id', enrollment.user_id)
                    .single(),
                  supabase
                    .from('formations')
                    .select('title, image_url')
                    .eq('id', enrollment.formation_id)
                    .single(),
                ]);

                return {
                  ...notification,
                  user_info: profileRes.data || null,
                  formation_info: formationRes.data || null,
                };
              }
            }

            // Pour les changements de plan
            if (notification.type === 'plan_change_request' && notification.user_id && notification.formation_id) {
              const [profileRes, formationRes] = await Promise.all([
                supabase
                  .from('profiles')
                  .select('id, first_name, last_name, email, username, phone, avatar_url, country')
                  .eq('id', notification.user_id)
                  .single(),
                supabase
                  .from('formations')
                  .select('title, image_url')
                  .eq('id', notification.formation_id)
                  .single(),
              ]);

              return {
                ...notification,
                user_info: profileRes.data || null,
                formation_info: formationRes.data || null,
              };
            }

            // Pour les demandes de paiement
            if (notification.type === 'payment_request' && notification.user_id && notification.formation_id) {
              const [profileRes, formationRes] = await Promise.all([
                supabase
                  .from('profiles')
                  .select('id, first_name, last_name, email, username, phone, avatar_url, country')
                  .eq('id', notification.user_id)
                  .single(),
                supabase
                  .from('formations')
                  .select('title, image_url')
                  .eq('id', notification.formation_id)
                  .single(),
              ]);

              // Chercher si la demande de paiement a été traitée et par qui
              let approvedByAdmin = null;
              if (notification.payment_id) {
                const { data: paymentData } = await supabase
                  .from('student_payment')
                  .select('created_by, status')
                  .eq('id', notification.payment_id)
                  .single();

                if (paymentData?.created_by && paymentData?.status === 'processed') {
                  const { data: adminData } = await supabase
                    .from('profiles')
                    .select('first_name, last_name')
                    .eq('id', paymentData.created_by)
                    .single();
                  
                  if (adminData) {
                    approvedByAdmin = adminData;
                  }
                }
              }

              return {
                ...notification,
                user_info: profileRes.data || null,
                formation_info: formationRes.data || null,
                approved_by_admin: approvedByAdmin,
              };
            }

            return notification;
          } catch (error) {
            console.error('Error enriching notification:', error);
            return notification;
          }
        })
      );

      return enrichedNotifications;
    },
    enabled: enabled && !!user?.id,
  });
};
