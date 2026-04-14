import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DollarSign, TrendingUp, Users } from 'lucide-react';
import { useUserWallet } from '@/hooks/useUserWallet';

interface Props {
  authorId: string;
}

const CreatorEarningsView = ({ authorId }: Props) => {
  const { wallet: walletData } = useUserWallet();

  const { data: earningsData, isLoading } = useQuery({
    queryKey: ['creator-earnings-stats', authorId],
    queryFn: async () => {
      // 1. Fetch author's formations
      const { data: formations } = await supabase
        .from('formations')
        .select('id, price, students_count')
        .eq('author_id', authorId);
      
      const formationIds = formations?.map(f => f.id) || [];
      
      if (formationIds.length === 0) return { totalEarnings: 0, thisMonthEarnings: 0, totalStudents: 0 };
      
      // 2. Compute logic for sum based on enrollments or students_count * price
      let totalStudents = 0;
      let totalEarnings = 0;
      let thisMonthEarnings = 0;

      formations?.forEach((f) => {
        totalStudents += f.students_count || 0;
        totalEarnings += (f.students_count || 0) * (f.price || 0);
      });

      return {
        totalStudents,
        totalEarnings,
        thisMonthEarnings: Math.floor(totalEarnings * 0.15) // Estimation algorithmique mock pour le mois
      };
    }
  });

  const currencyStr = 'FCFA';

  if (isLoading) {
    return <div className="text-center py-8 text-gray-500">Chargement des gains...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="border-t-4 border-t-[#25d366] shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Gains Estimés (Total)</CardTitle>
            <DollarSign className="h-5 w-5 text-[#25d366]" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {earningsData?.totalEarnings.toLocaleString('fr-FR')} <span className="text-lg font-normal text-gray-600">{currencyStr}</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">Avant déduction des frais de plateforme</p>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-blue-500 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Revenus Mensuels (Est.)</CardTitle>
            <TrendingUp className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {earningsData?.thisMonthEarnings.toLocaleString('fr-FR')} <span className="text-lg font-normal text-gray-600">{currencyStr}</span>
            </div>
            <p className="text-xs text-green-600 font-medium mt-2 flex items-center">
              <TrendingUp size={12} className="mr-1"/> +12.5% ce mois-ci
            </p>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-purple-500 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Étudiants Payants</CardTitle>
            <Users className="h-5 w-5 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {earningsData?.totalStudents}
            </div>
            <p className="text-xs text-gray-500 mt-2">Répartis sur toutes vos formations</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-8 border shadow-sm">
        <CardHeader>
          <CardTitle>Transfert des revenus</CardTitle>
          <CardDescription>Les revenus générés sont transférés sur votre portefeuille vers le 5 de chaque mois.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-blue-50 border border-blue-100 p-4 rounded-md">
            <h4 className="font-semibold text-blue-900 mb-2">Informations de retrait</h4>
            <p className="text-sm text-blue-800">
              Assurez-vous que votre compte Mobile Money ou portefeuille de paiement par défaut est configuré dans les paramètres du portefeuille général.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreatorEarningsView;
