
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, XCircle, Clock, User, Eye } from 'lucide-react';
import { usePromotions, useAssignStudentToPromotion } from '@/hooks/usePromotion';

interface EnrollmentRequestCardProps {
  enrollment: {
    id: string;
    user_id: string;
    formation_id: string;
    status: string;
    plan_type?: string;
    created_at: string;
    profiles?: {
      id: string;
      first_name?: string;
      last_name?: string;
      username?: string;
      avatar_url?: string;
      email?: string;
      phone?: string;
      country?: string;
    } | null;
    formations?: {
      title?: string;
      image_url?: string;
    } | null;
  };
  onApprove: (params: { enrollmentId: string; status: 'approved' | 'rejected'; rejectedReason?: string; planType?: 'free' | 'standard' | 'premium' | 'groupe'; userId?: string; formationId?: string; promotionId?: string }) => void;
  isUpdating: boolean;
}

const EnrollmentRequestCard: React.FC<EnrollmentRequestCardProps> = ({ 
  enrollment, 
  onApprove, 
  isUpdating 
}) => {
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectionField, setShowRejectionField] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'free' | 'standard' | 'premium' | 'groupe'>(
    (enrollment.plan_type as 'free' | 'standard' | 'premium' | 'groupe') || 'free'
  );

  useEffect(() => {
    if (enrollment.plan_type) {
      setSelectedPlan(enrollment.plan_type as 'free' | 'standard' | 'premium' | 'groupe');
    }
  }, [enrollment.plan_type]);

  const [selectedPromotion, setSelectedPromotion] = useState<string>('');

  // Charger les promotions pour cette formation seulement si plan groupe est sélectionné
  const { data: promotions = [], isLoading: isLoadingPromotions, error: promotionsError } = usePromotions(
    selectedPlan === 'groupe' ? enrollment.formation_id : undefined
  );
  const assignToPromotion = useAssignStudentToPromotion();
  
  // Debug des promotions
  console.log('Formation ID:', enrollment.formation_id);
  console.log('Promotions:', promotions);
  console.log('Loading promotions:', isLoadingPromotions);
  console.log('Promotions error:', promotionsError);

  const getStatusBadge = () => {
    switch (enrollment.status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Approuvé</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Rejeté</Badge>;
      default:
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">En attente</Badge>;
    }
  };

  const getPlanLabel = (plan: string) => {
    switch (plan) {
      case 'free':
        return 'Gratuit';
      case 'standard':
        return 'Standard';
      case 'premium':
        return 'Premium';
      case 'groupe':
        return 'Groupe';
      default:
        return 'Gratuit';
    }
  };

  const getPlanBadgeColor = (plan: string) => {
    switch (plan) {
      case 'free':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'standard':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'premium':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'groupe':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleApprove = () => {
    onApprove({
      enrollmentId: enrollment.id,
      status: 'approved',
      rejectedReason: undefined,
      planType: selectedPlan,
      userId: enrollment.user_id,
      formationId: enrollment.formation_id,
      promotionId: selectedPlan === 'groupe' && selectedPromotion ? selectedPromotion : undefined
    });
  };

  const handleReject = () => {
    if (rejectionReason.trim()) {
      onApprove({
        enrollmentId: enrollment.id,
        status: 'rejected',
        rejectedReason: rejectionReason
      });
    }
  };

  const handleView = () => {
    console.log('Voir les détails de la demande:', enrollment.id);
  };

  const handleRejectClick = () => {
    setShowRejectionField(true);
  };

  return (
    <Card className="w-full shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock size={18} />
            Demande d'inscription
          </CardTitle>
          <div className="flex items-center gap-2">
            {getStatusBadge()}
            <Button
              variant="outline"
              size="sm"
              onClick={handleView}
              className="flex items-center gap-1"
            >
              <Eye size={14} />
              Voir
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Informations utilisateur */}
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
          <Avatar className="h-12 w-12">
            <AvatarImage 
              src={enrollment.profiles?.avatar_url || ''} 
              alt={enrollment.profiles?.username || 'User'} 
            />
            <AvatarFallback>
              <User size={20} />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h3 className="font-semibold">
              {enrollment.profiles?.first_name && enrollment.profiles?.last_name
                ? `${enrollment.profiles.first_name} ${enrollment.profiles.last_name}`
                : enrollment.profiles?.username || 'Utilisateur inconnu'
              }
            </h3>
            <p className="text-sm text-gray-600">{enrollment.profiles?.email || 'Email non fourni'}</p>
            <p className="text-sm text-gray-600">📞 {enrollment.profiles?.phone || 'Téléphone non renseigné'}</p>
            <p className="text-sm text-gray-600">🌍 {enrollment.profiles?.country || 'Pays non renseigné'}</p>
            <p className="text-xs text-gray-500">
              Demande créée le {new Date(enrollment.created_at).toLocaleDateString('fr-FR')}
            </p>
          </div>
        </div>

        {/* Informations formation */}
        <div className="p-3 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-900">Formation demandée</h4>
          <p className="text-sm text-blue-700">
            {enrollment.formations?.title || 'Formation inconnue'}
          </p>
        </div>

        {/* Section plan avec sélecteur pour admin */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              Plan demandé par l'étudiant:
            </span>
            <Badge className={getPlanBadgeColor(enrollment.plan_type || 'free')}>
              {getPlanLabel(enrollment.plan_type || 'free')}
            </Badge>
          </div>
          
          {enrollment.status === 'pending' && (
            <div className="space-y-3">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Plan à approuver (Admin):
                </label>
                <Select
                  value={selectedPlan}
                  onValueChange={(value: 'free' | 'standard' | 'premium' | 'groupe') => setSelectedPlan(value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Gratuit</SelectItem>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                    <SelectItem value="groupe">Groupe</SelectItem>
                  </SelectContent>
                </Select>
                {selectedPlan !== enrollment.plan_type && (
                  <p className="text-xs text-orange-600">
                    ⚠️ Vous approuvez un plan différent de celui demandé par l'étudiant
                  </p>
                )}
              </div>

              {/* Sélecteur de promotion pour plan groupe - Correction du SelectItem vide */}
              {selectedPlan === 'groupe' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Assigner cet élève à une promotion:
                  </label>
                  <Select
                    value={selectedPromotion}
                    onValueChange={setSelectedPromotion}
                    disabled={isLoadingPromotions}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={
                        isLoadingPromotions 
                          ? "Chargement des promotions..." 
                          : "Sélectionner une promotion"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {isLoadingPromotions ? (
                        <SelectItem value="loading" disabled>
                          Chargement des promotions...
                        </SelectItem>
                      ) : promotions && promotions.length > 0 ? (
                        promotions.map((promotion) => (
                          <SelectItem 
                            key={promotion.id} 
                            value={promotion.id}
                          >
                            {promotion.name}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-promotions" disabled>
                          Aucune promotion disponible
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  {!isLoadingPromotions && (!promotions || promotions.length === 0) && (
                    <div className="space-y-2">
                      <p className="text-xs text-amber-600">
                        ⚠️ Aucune promotion disponible pour cette formation.
                      </p>
                      <p className="text-xs text-gray-500">
                        Créez une promotion dans la gestion des formations avant d'assigner un plan groupe.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          
          {enrollment.status === 'approved' && (
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm text-green-800">
                <strong>Plan approuvé:</strong> {getPlanLabel(enrollment.plan_type || 'free')}
              </p>
            </div>
          )}
        </div>

        {/* Champ de justification du rejet (visible uniquement si rejet cliqué) */}
        {showRejectionField && enrollment.status === 'pending' && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Raison du rejet:
            </label>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
              placeholder="Expliquez pourquoi la demande est rejetée..."
              required
            />
          </div>
        )}

        {/* Actions */}
        {enrollment.status === 'pending' && (
          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleApprove}
              disabled={isUpdating || (selectedPlan === 'groupe' && (!selectedPromotion || selectedPromotion === 'no-promotions' || selectedPromotion === 'loading'))}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            >
              <CheckCircle size={16} className="mr-2" />
              {isUpdating ? 'Approbation...' : 'Approuver'}
            </Button>
            
            {!showRejectionField ? (
              <Button
                onClick={handleRejectClick}
                disabled={isUpdating}
                variant="destructive"
                className="flex-1"
              >
                <XCircle size={16} className="mr-2" />
                Rejeter
              </Button>
            ) : (
              <Button
                onClick={handleReject}
                disabled={isUpdating || !rejectionReason.trim()}
                variant="destructive"
                className="flex-1"
              >
                <XCircle size={16} className="mr-2" />
                {isUpdating ? 'Rejet...' : 'Confirmer le rejet'}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EnrollmentRequestCard;