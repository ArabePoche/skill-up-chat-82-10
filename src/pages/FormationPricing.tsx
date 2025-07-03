import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import FormationPricing from '@/components/FormationPricing';

const FormationPricingPage: React.FC = () => {
  const { formationId } = useParams<{ formationId: string }>();
  const navigate = useNavigate();

  if (!formationId) {
    navigate('/cours');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-16 md:pt-16 md:pb-0">
      {/* Header */}
      <div className="bg-[#25d366] text-white sticky top-0 md:top-16 z-40 shadow-md">
        <div className="flex items-center p-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="mr-3 p-2 hover:bg-white/20 rounded-full text-white"
          >
            <ArrowLeft size={20} />
          </Button>
          
          <div>
            <h1 className="font-bold text-lg text-white">Options d'abonnement</h1>
            <p className="text-sm text-green-100">
              Choisissez l'offre qui vous convient
            </p>
          </div>
        </div>
      </div>

      {/* Pricing Section */}
      <div className="p-4">
        <FormationPricing formationId={formationId} />
      </div>
    </div>
  );
};

export default FormationPricingPage;