import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, XCircle, Clock, User, Eye, Crown, Star } from 'lucide-react';
import { toast } from 'sonner';
import EnrollmentApprovalModal from './EnrollmentApprovalModal';

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
    } | null;
    formations?: {
      title?: string;
      image_url?: string;
    } | null;
  };
  onApprove: (params: { 
    enrollmentId: string; 
    status: 'approved' | 'rejected'; 
    rejectedReason?: string; 
    planType?: 'free' | 'standard' | 'premium'; 
    userId?: string; 
    formationId?: string 
  }) => void;
  isUpdating: boolean;
}

const EnrollmentRequestCard: React.FC<EnrollmentRequestCardProps> = ({ 
  enrollment, 
  onApprove, 
  isUpdating 
}) => {
  const [rejectionReason, setRejectionReason] = useState('');
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'free' | 'standard' | 'premium'>('free');

  const getStatusBadge = () => {
    switch (enrollment.status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800 border-green-200">✅ Approuvé</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800 border-red-200">❌ Rejeté</Badge>;
      default:
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">⏳ En attente</Badge>;
    }
  };

  const getPlanInfo = (plan: string) => {
    switch (plan) {
      case 'free':
        return { 
          label: 'Gratuit', 
          icon: <User size={16} />, 
          color: 'bg-gray-100 text-gray-800 border-gray-200' 
        };
      case 'standard':
        return { 
          label: 'Standard', 
          icon: <Star size={16} />, 
          color: 'bg-blue-100 text-blue-800 border-blue-200' 
        };
      case 'premium':
        return { 
          label: 'Premium', 
          icon: <Crown size={16} />, 
          color: 'bg-purple-100 text-purple-800 border-purple-200' 
        };
      default:
        return { 
          label: 'Gratuit', 
          icon: <User size={16} />, 
          color: 'bg-gray-100 text-gray-800 border-gray-200' 
        };
    }
  };

  // Cette fonction ouvre le modal
  const handleApprovalClick = () => {
    console.log('Opening approval modal');
    setShowApprovalModal(true);
  };

  // Cette fonction est appelée par le modal avec le plan sélectionné
  const handleModalApprove = (planType: 'free' | 'standard' | 'premium') => {
    console.log('Modal approve with plan:', planType);
    onApprove({
      enrollmentId: enrollment.id,
      status: 'approved',
      planType: planType,
      userId: enrollment.user_id,
      formationId: enrollment.formation_id
    });
    setShowApprovalModal(false);
  };

  const handleReject = () => {
    if (!rejectionReason.trim()) {
      toast.error('Veuillez indiquer une raison pour le rejet');
      return;
    }
    
    onApprove({
      enrollmentId: enrollment.id,
      status: 'rejected',
      rejectedReason: rejectionReason
    });
  };

  const handlePlanChange = (value: string) => {
    if (value === 'free' || value === 'standard' || value === 'premium') {
      setSelectedPlan(value);
    }
  };

  const handleUpdatePlan = () => {
    onApprove({
      enrollmentId: enrollment.id,
      status: 'approved',
      planType: selectedPlan,
      userId: enrollment.user_id,
      formationId: enrollment.formation_id
    });
  };

  const requestedPlan = getPlanInfo(enrollment.plan_type || 'free');
  const selectedPlanInfo = getPlanInfo(selectedPlan);

  // Nom complet de l'étudiant
  const studentName = enrollment.profiles?.first_name && enrollment.profiles?.last_name
    ? `${enrollment.profiles.first_name} ${enrollment.profiles.last_name}`
    : enrollment.profiles?.username || 'Utilisateur inconnu';

  return (
    <>
      <Card className="w-full shadow-sm hover:shadow-md transition-shadow bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
        <CardHeader className="pb-3 bg-gradient-to-r from-indigo-100 to-purple-100 rounded-t-lg">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2 text-indigo-800">
              <Clock size={18} />
              Demande d'inscription
            </CardTitle>
            <div className="flex items-center gap-2">
              {getStatusBadge()}
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-1 border-indigo-300 text-indigo-700 hover:bg-indigo-50"
              >
                <Eye size={14} />
                Voir
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Informations utilisateur */}
          <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-indigo-100">
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
              <h3 className="font-semibold text-gray-800">{studentName}</h3>
              <p className="text-sm text-gray-600">{enrollment.profiles?.email}</p>
              <p className="text-xs text-gray-500">
                Demande créée le {new Date(enrollment.created_at).toLocaleDateString('fr-FR')}
              </p>
            </div>
          </div>

          {/* Informations formation */}
          <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-100">
            <h4 className="font-medium text-indigo-900">Formation demandée</h4>
            <p className="text-sm text-indigo-700">
              {enrollment.formations?.title || 'Formation inconnue'}
            </p>
          </div>

          {/* Plan demandé */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Plan demandé :</span>
            <Badge className={requestedPlan.color}>
              <div className="flex items-center gap-1">
                {requestedPlan.icon}
                {requestedPlan.label}
              </div>
            </Badge>
          </div>

          {/* Raison du rejet pour les demandes en attente */}
          {enrollment.status === 'pending' && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Raison du rejet (optionnel) :
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full p-3 border border-indigo-300 rounded-md text-sm resize-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                rows={3}
                placeholder="Expliquez pourquoi la demande est rejetée..."
              />
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3 pt-2">
            {/* Boutons d'action */}
            {enrollment.status === 'pending' ? (
              <div className="flex gap-3">
                <Button
                  onClick={handleApprovalClick}
                  disabled={isUpdating}
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"
                >
                  <CheckCircle size={16} className="mr-2" />
                  {isUpdating ? 'Approbation...' : 'Approuver'}
                </Button>
                <Button
                  onClick={handleReject}
                  disabled={isUpdating}
                  variant="destructive"
                  className="flex-1"
                >
                  <XCircle size={16} className="mr-2" />
                  {isUpdating ? 'Rejet...' : 'Rejeter'}
                </Button>
              </div>
            ) : enrollment.status === 'approved' && (
              <>
                {/* Sélecteur de plan pour modification */}
                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium text-gray-700 min-w-fit">
                    Modifier le plan :
                  </label>
                  <Select value={selectedPlan} onValueChange={handlePlanChange}>
                    <SelectTrigger className="flex-1 border-indigo-300 focus:ring-indigo-500">
                      <SelectValue>
                        <div className="flex items-center gap-2">
                          {selectedPlanInfo.icon}
                          {selectedPlanInfo.label}
                        </div>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">
                        <div className="flex items-center gap-2">
                          <User size={16} />
                          Gratuit
                        </div>
                      </SelectItem>
                      <SelectItem value="standard">
                        <div className="flex items-center gap-2">
                          <Star size={16} />
                          Standard
                        </div>
                      </SelectItem>
                      <SelectItem value="premium">
                        <div className="flex items-center gap-2">
                          <Crown size={16} />
                          Premium
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <Button
                  onClick={handleUpdatePlan}
                  disabled={isUpdating}
                  className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white"
                >
                  <CheckCircle size={16} className="mr-2" />
                  {isUpdating ? 'Mise à jour...' : `Mettre à jour le plan (${selectedPlanInfo.label})`}
                </Button>

                {/* Affichage du plan actuel */}
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-sm text-green-800 flex items-center gap-2">
                    <CheckCircle size={16} />
                    <strong>Plan actuel :</strong> 
                    <Badge className={getPlanInfo(enrollment.plan_type || 'free').color}>
                      <div className="flex items-center gap-1">
                        {getPlanInfo(enrollment.plan_type || 'free').icon}
                        {getPlanInfo(enrollment.plan_type || 'free').label}
                      </div>
                    </Badge>
                  </p>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modal d'approbation */}
      <EnrollmentApprovalModal
        isOpen={showApprovalModal}
        onClose={() => setShowApprovalModal(false)}
        onApprove={handleModalApprove}
        isUpdating={isUpdating}
        studentName={studentName}
        formationTitle={enrollment.formations?.title}
      />
    </>
  );
};

export default EnrollmentRequestCard;
