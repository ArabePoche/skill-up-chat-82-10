import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Props {
  authorId: string;
}

const CreatorPaymentsView = ({ authorId }: Props) => {
  const { data: requests, isLoading } = useQuery({
    queryKey: ['creator-enrollment-requests', authorId],
    queryFn: async () => {
      // 1. Fetch author's formations
      const { data: myFormations } = await supabase
        .from('formations')
        .select('id')
        .eq('author_id', authorId);
      
      const formationIds = myFormations?.map(f => f.id) || [];
      
      if (formationIds.length === 0) return [];
      
      // 2. Fetch enrollments for these formations
      const { data, error } = await supabase
        .from('enrollment_requests')
        .select(`
          *,
          user_profile:user_id ( id, first_name, last_name, username ),
          formation_detail:formation_id ( id, title, price )
        `)
        .in('formation_id', formationIds)
        .order('created_at', { ascending: false });

      if (error && error.code !== 'PGRST116') {
        const { data: fallbackData } = await supabase
          .from('enrollment_requests')
          .select(`*`)
          .in('formation_id', formationIds)
          .order('created_at', { ascending: false });
        return fallbackData || [];
      }
      return data || [];
    }
  });

  if (isLoading) {
    return <div className="text-center py-8 text-gray-500">Chargement des paiements...</div>;
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-200"><CheckCircle size={14} className="mr-1" /> Approuvé</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-200"><XCircle size={14} className="mr-1" /> Rejeté</Badge>;
      default:
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200"><Clock size={14} className="mr-1" /> En attente</Badge>;
    }
  };

  return (
    <Card className="border shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg">Historique des Paiements & Inscriptions</CardTitle>
        <CardDescription>Consultez toutes les inscriptions à vos différentes formations.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Élève</TableHead>
              <TableHead>Formation</TableHead>
              <TableHead>Montant/Plan</TableHead>
              <TableHead>Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                  Aucun paiement ou inscription trouvé pour le moment
                </TableCell>
              </TableRow>
            ) : (
              requests?.map((req) => (
                <TableRow key={req.id}>
                  <TableCell>{format(new Date(req.created_at), 'dd MMM yyyy, HH:mm', { locale: fr })}</TableCell>
                  <TableCell className="font-medium text-gray-900">
                    {req.user_profile ? `${req.user_profile.first_name || ''} ${req.user_profile.last_name || ''}`.trim() || req.user_profile.username : 'Privé/Inconnu'}
                  </TableCell>
                  <TableCell>{req.formation_detail?.title || 'Formation protégée'}</TableCell>
                  <TableCell className="text-gray-600">
                    {req.plan_type === 'lifetime' ? 'Accès à vie' 
                    : req.plan_type === 'monthly' ? 'Abonnement Mensuel'
                    : req.plan_type === 'yearly' ? 'Abonnement Annuel'
                    : 'Standard'}
                  </TableCell>
                  <TableCell>{getStatusBadge(req.status)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default CreatorPaymentsView;
