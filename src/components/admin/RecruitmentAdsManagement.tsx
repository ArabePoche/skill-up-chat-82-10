/**
 * Gestion des annonces de recrutement en attente d'approbation (admin)
 * Permet d'approuver ou rejeter les annonces avant publication
 */
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, MapPin, Briefcase, DollarSign, Clock, Users, Megaphone, Image, ShoppingBag } from 'lucide-react';
import {
  usePendingRecruitmentAds,
  useApproveRecruitmentAd,
  useRejectRecruitmentAd,
  type RecruitmentAd,
} from '@/cv-search/hooks/useRecruitmentAds';

const RecruitmentAdsManagement: React.FC = () => {
  const { data: pendingAds = [], isLoading } = usePendingRecruitmentAds();
  const approveAd = useApproveRecruitmentAd();
  const rejectAd = useRejectRecruitmentAd();

  const handleApprove = (ad: RecruitmentAd) => {
    approveAd.mutate(ad);
  };

  const handleReject = (ad: RecruitmentAd) => {
    rejectAd.mutate({ adId: ad.id, ownerId: ad.owner_id, title: ad.title });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Megaphone className="w-5 h-5" />
          Annonces en attente
        </h2>
        <Badge variant="secondary" className="text-sm">
          {pendingAds.length} en attente
        </Badge>
      </div>

      {pendingAds.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Megaphone className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Aucune annonce en attente d'approbation</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {pendingAds.map((ad) => (
            <Card key={ad.id} className="border-l-4 border-l-yellow-500">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <CardTitle className="text-base">{ad.title}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                      Soumise le {new Date(ad.created_at).toLocaleDateString('fr-FR', {
                        day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <Badge variant="outline" className="shrink-0">
                    {ad.budget.toLocaleString('fr-FR')} FCFA
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Description */}
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {ad.description}
                </p>

                {/* Infos clés */}
                <div className="flex flex-wrap gap-2 text-xs">
                  {ad.location && (
                    <span className="flex items-center gap-1 bg-muted px-2 py-1 rounded">
                      <MapPin className="w-3 h-3" /> {ad.location}
                    </span>
                  )}
                  <span className="flex items-center gap-1 bg-muted px-2 py-1 rounded">
                    <Briefcase className="w-3 h-3" /> {ad.contract_type}
                  </span>
                  <span className="flex items-center gap-1 bg-muted px-2 py-1 rounded">
                    <Clock className="w-3 h-3" /> {ad.experience_level}
                  </span>
                  {ad.salary_range && (
                    <span className="flex items-center gap-1 bg-muted px-2 py-1 rounded">
                      <DollarSign className="w-3 h-3" /> {ad.salary_range}
                    </span>
                  )}
                  <span className="flex items-center gap-1 bg-muted px-2 py-1 rounded">
                    <Users className="w-3 h-3" /> ~{ad.estimated_reach} vues
                  </span>
                </div>

                {/* Compétences */}
                {(ad.skills || []).length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {ad.skills.map((s) => (
                      <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>
                    ))}
                  </div>
                )}

                {/* Médias */}
                {(ad.media_urls || []).length > 0 && (
                  <div className="flex gap-2 overflow-x-auto">
                    {ad.media_urls.map((url, idx) => (
                      <div key={idx} className="w-16 h-16 rounded border overflow-hidden shrink-0 bg-muted">
                        {url.match(/\.(mp4|webm|mov)/) ? (
                          <video src={url} className="w-full h-full object-cover" muted />
                        ) : (
                          <img src={url} alt="" className="w-full h-full object-cover" />
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Type de publication */}
                <div className="flex gap-2 text-xs text-muted-foreground">
                  <span>Publication prévue :</span>
                  {ad.publish_as_post && <Badge variant="outline" className="text-[10px]">📝 Post</Badge>}
                  {ad.publish_as_status && <Badge variant="outline" className="text-[10px]">🔵 Statut</Badge>}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={() => handleApprove(ad)}
                    disabled={approveAd.isPending}
                    className="flex-1 gap-2"
                    size="sm"
                  >
                    <Check className="w-4 h-4" />
                    Approuver & Publier
                  </Button>
                  <Button
                    onClick={() => handleReject(ad)}
                    disabled={rejectAd.isPending}
                    variant="destructive"
                    className="flex-1 gap-2"
                    size="sm"
                  >
                    <X className="w-4 h-4" />
                    Refuser
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default RecruitmentAdsManagement;
