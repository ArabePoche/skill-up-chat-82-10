import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, BookOpen, Package, TrendingUp } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface DashboardStatsProps { authorId?: string; }

interface DashboardStatsProps { authorId?: string; }

const DashboardStats = ({ authorId }: DashboardStatsProps = {}) => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats', authorId || 'all'],
    queryFn: async () => {
      let formationsQuery = supabase.from('formations').select('id', { count: 'exact' });
      let enrollmentsQuery = supabase.from('enrollment_requests').select('id', { count: 'exact' }).eq('status', 'approved');
      
      if (authorId) {
        formationsQuery = formationsQuery.eq('author_id', authorId);
        
        const myFormations = await supabase.from('formations').select('id').eq('author_id', authorId);
        if (myFormations.data && myFormations.data.length > 0) {
            const formationIds = myFormations.data.map(f => f.id);
            enrollmentsQuery = enrollmentsQuery.in('formation_id', formationIds);
        } else {
            enrollmentsQuery = enrollmentsQuery.eq('formation_id', '00000000-0000-0000-0000-000000000000');
        }
      }

      const [usersResult, formationsResult, productsResult, enrollmentsResult] = await Promise.all([
        authorId ? Promise.resolve({ count: null }) : supabase.from('profiles').select('id', { count: 'exact' }),
        formationsQuery,
        authorId ? Promise.resolve({ count: null }) : supabase.from('products').select('id', { count: 'exact' }),
        enrollmentsQuery
      ]);

      return {
        users: authorId ? undefined : usersResult.count || 0,
        formations: formationsResult.count || 0,
        products: authorId ? undefined : productsResult.count || 0,
        enrollments: enrollmentsResult.count || 0
      };
    }
  });

  if (isLoading) {
    return <div className="text-center py-8">Chargement des statistiques...</div>;
  }

  const statsCards = [
    ...(authorId ? [] : [{
      title: 'Utilisateurs totaux',
      value: stats?.users || 0,
      icon: Users,
      color: 'text-blue-600'
    }]),
    {
      title: 'Formations',
      value: stats?.formations || 0,
      icon: BookOpen,
      color: 'text-green-600'
    },
    ...(authorId ? [] : [{
      title: 'Produits disponibles',
      value: stats?.products || 0,
      icon: Package,
      color: 'text-purple-600'
    }]),
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
