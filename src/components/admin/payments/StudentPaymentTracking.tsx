import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Clock, Search, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { StudentPaymentManager } from '../StudentPaymentManager';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

/**
 * Composant pour le suivi des paiements de tous les étudiants
 */
const StudentPaymentTracking = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFormation, setSelectedFormation] = useState<string>('all');
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);

  // Récupérer toutes les formations
  const { data: formations } = useQuery({
    queryKey: ['admin-formations-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('formations')
        .select('id, title')
        .eq('is_active', true)
        .order('title');

      if (error) throw error;
      return data || [];
    },
  });

  // Récupérer tous les étudiants avec leurs progrès de paiement
  const { data: studentsPayments, isLoading, refetch } = useQuery({
    queryKey: ['admin-students-payments', selectedFormation],
    queryFn: async () => {
      let query = supabase
        .from('enrollment_requests')
        .select(`
          id,
          user_id,
          formation_id,
          plan_type,
          profiles!enrollment_requests_user_id_fkey (
            id,
            first_name,
            last_name,
            avatar_url,
            email
          ),
          formations!enrollment_requests_formation_id_fkey (
            id,
            title
          )
        `)
        .eq('status', 'approved');

      if (selectedFormation !== 'all') {
        query = query.eq('formation_id', selectedFormation);
      }

      const { data: enrollments, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      // Récupérer les progrès de paiement pour chaque étudiant
      const studentIds = enrollments?.map(e => e.user_id) || [];
      
      if (studentIds.length === 0) return [];

      const { data: progressData, error: progressError } = await supabase
        .from('student_payment_progress')
        .select('*')
        .in('user_id', studentIds);

      if (progressError) throw progressError;

      // Combiner les données
      return enrollments?.map(enrollment => {
        const progress = progressData?.find(
          p => p.user_id === enrollment.user_id && p.formation_id === enrollment.formation_id
        );

        // Calculer les jours restants en temps réel
        let daysRemaining = progress?.total_days_remaining || 0;
        if (progress?.last_payment_date && progress?.total_days_remaining > 0) {
          const lastPaymentDate = new Date(progress.last_payment_date);
          const currentDate = new Date();
          const daysSincePayment = Math.floor(
            (currentDate.getTime() - lastPaymentDate.getTime()) / (1000 * 60 * 60 * 24)
          );
          daysRemaining = Math.max(0, progress.total_days_remaining - daysSincePayment);
        }

        return {
          ...enrollment,
          payment_progress: progress,
          days_remaining: daysRemaining,
          hours_remaining: progress?.hours_remaining || 0,
        };
      }) || [];
    },
    refetchInterval: 30000, // Actualiser toutes les 30 secondes
  });

  // Filtrer les étudiants par recherche
  const filteredStudents = studentsPayments?.filter(student => {
    const profile = student.profiles as any;
    const formation = student.formations as any;
    const searchLower = searchTerm.toLowerCase();
    
    return (
      profile?.first_name?.toLowerCase().includes(searchLower) ||
      profile?.last_name?.toLowerCase().includes(searchLower) ||
      profile?.email?.toLowerCase().includes(searchLower) ||
      formation?.title?.toLowerCase().includes(searchLower)
    );
  });

  const getStatusColor = (days: number) => {
    if (days === 0) return 'text-red-600 bg-red-50';
    if (days <= 3) return 'text-red-600 bg-red-50';
    if (days <= 7) return 'text-orange-600 bg-orange-50';
    return 'text-green-600 bg-green-50';
  };

  const getStatusIcon = (days: number) => {
    if (days === 0) return <XCircle className="w-4 h-4" />;
    if (days <= 7) return <AlertTriangle className="w-4 h-4" />;
    return <CheckCircle className="w-4 h-4" />;
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Chargement des données de paiement...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-6 h-6 text-primary" />
            Suivi des paiements étudiants
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filtres */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Rechercher par nom ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedFormation} onValueChange={setSelectedFormation}>
              <SelectTrigger className="w-full sm:w-[280px]">
                <SelectValue placeholder="Filtrer par formation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les formations</SelectItem>
                {formations?.map((formation) => (
                  <SelectItem key={formation.id} value={formation.id}>
                    {formation.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Statistiques rapides */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <CardContent className="p-4">
                <p className="text-sm text-blue-700 mb-1">Total étudiants</p>
                <p className="text-2xl font-bold text-blue-900">{filteredStudents?.length || 0}</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <CardContent className="p-4">
                <p className="text-sm text-green-700 mb-1">Accès actif</p>
                <p className="text-2xl font-bold text-green-900">
                  {filteredStudents?.filter(s => s.days_remaining > 7).length || 0}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
              <CardContent className="p-4">
                <p className="text-sm text-orange-700 mb-1">Attention</p>
                <p className="text-2xl font-bold text-orange-900">
                  {filteredStudents?.filter(s => s.days_remaining > 0 && s.days_remaining <= 7).length || 0}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
              <CardContent className="p-4">
                <p className="text-sm text-red-700 mb-1">Expiré</p>
                <p className="text-2xl font-bold text-red-900">
                  {filteredStudents?.filter(s => s.days_remaining === 0).length || 0}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Tableau des étudiants */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Étudiant</TableHead>
                  <TableHead>Formation</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead className="text-center">Jours restants</TableHead>
                  <TableHead className="text-center">Statut</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents?.map((student) => {
                  const profile = student.profiles as any;
                  const formation = student.formations as any;
                  const isExpanded = expandedStudent === `${student.user_id}-${student.formation_id}`;

                  return (
                    <React.Fragment key={`${student.user_id}-${student.formation_id}`}>
                      <TableRow className="hover:bg-muted/50">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={profile?.avatar_url} />
                              <AvatarFallback className="bg-primary/10 text-primary">
                                {profile?.first_name?.[0]}{profile?.last_name?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">
                                {profile?.first_name} {profile?.last_name}
                              </p>
                              <p className="text-xs text-muted-foreground">{profile?.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="font-medium text-sm">{formation?.title}</p>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm capitalize px-2 py-1 bg-muted rounded-full">
                            {student.plan_type}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <span className="text-lg font-bold">{student.days_remaining}</span>
                            {student.hours_remaining > 0 && (
                              <span className="text-xs text-muted-foreground">
                                +{student.hours_remaining}h
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full ${getStatusColor(student.days_remaining)}`}>
                            {getStatusIcon(student.days_remaining)}
                            <span className="text-xs font-medium">
                              {student.days_remaining === 0 ? 'Expiré' : student.days_remaining <= 7 ? 'Urgent' : 'Actif'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <button
                            onClick={() => setExpandedStudent(isExpanded ? null : `${student.user_id}-${student.formation_id}`)}
                            className="text-primary hover:underline text-sm font-medium"
                          >
                            {isExpanded ? 'Masquer' : 'Gérer'}
                          </button>
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow>
                          <TableCell colSpan={6} className="bg-muted/30 p-4">
                            <StudentPaymentManager
                              studentId={student.user_id}
                              formationId={student.formation_id}
                              isExpanded={true}
                              onToggleExpand={() => setExpandedStudent(null)}
                            />
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>

            {filteredStudents?.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Aucun étudiant trouvé</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentPaymentTracking;
