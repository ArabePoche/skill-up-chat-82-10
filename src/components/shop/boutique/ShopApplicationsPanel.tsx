/**
 * Panneau des candidatures reçues via les posts/stories de recrutement
 * Affiche les candidatures de la table 'applications' pour le propriétaire de boutique
 */
import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Check, X, FileText, MessageSquare, Loader2, User, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ShopApplicationsPanelProps {
  shopId: string;
}

interface ApplicationWithProfile {
  id: string;
  user_id: string;
  message: string | null;
  cv_url: string | null;
  status: string;
  created_at: string;
  source_type: string;
  profile?: {
    first_name: string;
    last_name: string;
    avatar_url: string | null;
    phone: string | null;
  };
}

const ShopApplicationsPanel: React.FC<ShopApplicationsPanelProps> = ({ shopId }) => {
  const queryClient = useQueryClient();

  // Récupérer les candidatures liées à cette boutique uniquement
  const { data: applications, isLoading, error } = useQuery({
    queryKey: ['shop-applications', shopId],
    queryFn: async () => {
      console.log('📋 [ShopApplicationsPanel] Fetching applications for shop:', shopId);

      // 1. Récupérer les posts de recrutement liés à cette boutique (via shop_id)
      const { data: shopPosts } = await supabase
        .from('posts')
        .select('id')
        .eq('shop_id', shopId)
        .eq('post_type', 'recruitment');

      // 2. Récupérer les annonces de recrutement liées à cette boutique
      const { data: shopAds } = await supabase
        .from('recruitment_ads')
        .select('id')
        .eq('shop_id', shopId);

      const adIds = shopAds?.map(ad => ad.id) || [];
      const postIds = shopPosts?.map(p => p.id) || [];

      // 3. Aussi récupérer les posts liés aux annonces (recruitment_ad_id)
      if (adIds.length > 0) {
        const { data: linkedPosts } = await supabase
          .from('posts')
          .select('id')
          .in('recruitment_ad_id', adIds);
        if (linkedPosts) {
          linkedPosts.forEach(p => {
            if (!postIds.includes(p.id)) postIds.push(p.id);
          });
        }
      }

      console.log('📋 [ShopApplicationsPanel] Found', postIds.length, 'posts and', adIds.length, 'ads for shop');

      if (postIds.length === 0 && adIds.length === 0) return [];

      // 4. Récupérer les candidatures
      let allApplications: any[] = [];

      if (adIds.length > 0) {
        const { data: adApps } = await supabase
          .from('applications')
          .select('*')
          .eq('source_type', 'recruitment_ad')
          .in('source_id', adIds);
        if (adApps) allApplications.push(...adApps);
      }

      if (postIds.length > 0) {
        const { data: postApps } = await supabase
          .from('applications')
          .select('*')
          .eq('source_type', 'post')
          .in('source_id', postIds);
        if (postApps) allApplications.push(...postApps);
      }

      // Dédupliquer
      const uniqueMap = new Map(allApplications.map(a => [a.id, a]));
      allApplications = [...uniqueMap.values()];

      console.log('📋 [ShopApplicationsPanel] Found', allApplications.length, 'applications for this shop');

      if (allApplications.length === 0) return [];

      // 5. Récupérer les profils des candidats
      const userIds = [...new Set(allApplications.map(app => app.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, avatar_url, phone')
        .in('id', userIds);

      allApplications.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      return allApplications.map(app => ({
        ...app,
        profile: profiles?.find(p => p.id === app.user_id),
      })) as ApplicationWithProfile[];
    },
    enabled: !!shopId,
  });

  // Mutation pour mettre à jour le statut
  const updateStatus = useMutation({
    mutationFn: async ({ applicationId, status }: { applicationId: string; status: 'accepted' | 'rejected' }) => {
      console.log('📋 [ShopApplicationsPanel] Updating application', applicationId, 'to', status);
      const { data, error } = await supabase
        .from('applications')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', applicationId)
        .select();
      if (error) {
        console.error('❌ [ShopApplicationsPanel] Update error:', error);
        throw error;
      }
      if (!data || data.length === 0) {
        throw new Error('Impossible de mettre à jour : vérifiez vos permissions');
      }
    },
    onSuccess: (_, variables) => {
      toast.success(variables.status === 'accepted' ? 'Candidature acceptée' : 'Candidature refusée');
      queryClient.invalidateQueries({ queryKey: ['shop-applications'] });
    },
    onError: (err: any) => toast.error(err?.message || 'Erreur lors de la mise à jour'),
  });

  if (isLoading) return null;
  if (error) {
    console.error('❌ [ShopApplicationsPanel] Query error:', error);
    return null;
  }

  const pendingApps = applications?.filter(a => a.status === 'pending') || [];
  const processedApps = applications?.filter(a => a.status !== 'pending') || [];

  if (pendingApps.length === 0 && processedApps.length === 0) return null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'accepted': return <Badge className="bg-emerald-100 text-emerald-700 border-0">Acceptée</Badge>;
      case 'rejected': return <Badge variant="destructive" className="border-0">Refusée</Badge>;
      default: return <Badge variant="secondary"><Clock size={12} className="mr-1" /> En attente</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Candidatures en attente */}
      {pendingApps.length > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare size={18} className="text-primary" />
              Candidatures reçues
              <Badge variant="secondary" className="ml-auto">{pendingApps.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingApps.map((app) => (
              <div key={app.id} className="flex flex-col gap-3 p-3 bg-background rounded-lg border">
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10 shrink-0">
                    {app.profile?.avatar_url ? (
                      <AvatarImage src={app.profile.avatar_url} />
                    ) : (
                      <AvatarFallback><User size={16} /></AvatarFallback>
                    )}
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">
                      {app.profile?.first_name} {app.profile?.last_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(app.created_at), { addSuffix: true, locale: fr })}
                    </p>
                    {app.message && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{app.message}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 justify-end">
                  {app.cv_url && (
                    <Button size="sm" variant="outline" className="h-8 text-xs" asChild>
                      <a href={app.cv_url} target="_blank" rel="noopener noreferrer">
                        <FileText size={14} className="mr-1" /> CV
                      </a>
                    </Button>
                  )}
                  <Button
                    size="sm"
                    className="h-8 px-3"
                    disabled={updateStatus.isPending}
                    onClick={() => updateStatus.mutate({ applicationId: app.id, status: 'accepted' })}
                  >
                    {updateStatus.isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="h-8 px-3"
                    disabled={updateStatus.isPending}
                    onClick={() => updateStatus.mutate({ applicationId: app.id, status: 'rejected' })}
                  >
                    {updateStatus.isPending ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Candidatures traitées */}
      {processedApps.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground">Candidatures traitées ({processedApps.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {processedApps.slice(0, 5).map((app) => (
              <div key={app.id} className="flex items-center gap-3 p-2 rounded-lg">
                <Avatar className="h-8 w-8">
                  {app.profile?.avatar_url ? (
                    <AvatarImage src={app.profile.avatar_url} />
                  ) : (
                    <AvatarFallback className="text-xs"><User size={14} /></AvatarFallback>
                  )}
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {app.profile?.first_name} {app.profile?.last_name}
                  </p>
                </div>
                {getStatusBadge(app.status)}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ShopApplicationsPanel;
