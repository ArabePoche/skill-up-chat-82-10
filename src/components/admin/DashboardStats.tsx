import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, BookOpen, Package, TrendingUp } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const DashboardStats = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const [usersResult, formationsResult, productsResult, enrollmentsResult] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact' }),
        supabase.from('formations').select('id', { count: 'exact' }),
        supabase.from('products').select('id', { count: 'exact' }),
        supabase.from('enrollment_requests').select('id', { count: 'exact' }).eq('status', 'approved')
      ]);

      return {
        users: usersResult.count || 0,
        formations: formationsResult.count || 0,
        products: productsResult.count || 0,
        enrollments: enrollmentsResult.count || 0
      };
    }
  });

  if (isLoading) {
    return <div className="text-center py-8">Chargement des statistiques...</div>;
  }

  const statsCards = [
    {
      title: 'Utilisateurs totaux',
      value: stats?.users || 0,
      icon: Users,
      color: 'text-blue-600'
    },
    {
      title: 'Formations actives',
      value: stats?.formations || 0,
      icon: BookOpen,
      color: 'text-green-600'
    },
    {
      title: 'Produits disponibles',
      value: stats?.products || 0,
      icon: Package,
      color: 'text-purple-600'
    },
    {
      title: 'Inscriptions totales',
      value: stats?.enrollments || 0,
      icon: TrendingUp,
      color: 'text-orange-600'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statsCards.map((stat, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              {stat.title}
            </CardTitle>
            <stat.icon className={`h-4 w-4 ${stat.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default DashboardStats;
