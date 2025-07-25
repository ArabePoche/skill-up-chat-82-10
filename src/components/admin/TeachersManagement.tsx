import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Users, BarChart3, Phone, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Teacher {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  avatar_url?: string;
  user_id: string;
  created_at: string;
}

interface Formation {
  id: string;
  title: string;
}

interface TeacherFormation {
  formation_id: string;
  formation_title: string;
}

interface TeacherStats {
  total_interviews: number;
  interviews_today: number;
  interviews_this_month: number;
  interviews_this_year: number;
  total_exercises_validated: number;
  total_earnings: number;
}

const TeachersManagement = () => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [formations, setFormations] = useState<Formation[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isStatsDialogOpen, setIsStatsDialogOpen] = useState(false);
  const [teacherStats, setTeacherStats] = useState<TeacherStats | null>(null);
  const [teacherFormations, setTeacherFormations] = useState<TeacherFormation[]>([]);
  const [loading, setLoading] = useState(true);

  const [newTeacher, setNewTeacher] = useState({
    first_name: '',
    last_name: '',
    email: '',
    user_id: ''
  });

  const [selectedFormationId, setSelectedFormationId] = useState('');

  useEffect(() => {
    fetchTeachers();
    fetchFormations();
  }, []);

  const fetchTeachers = async () => {
    try {
      const { data, error } = await supabase
        .from('teachers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTeachers(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des professeurs:', error);
      toast.error('Erreur lors du chargement des professeurs');
    } finally {
      setLoading(false);
    }
  };

  const fetchFormations = async () => {
    try {
      const { data, error } = await supabase
        .from('formations')
        .select('id, title')
        .eq('is_active', true)
        .order('title');

      if (error) throw error;
      setFormations(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des formations:', error);
    }
  };

  const fetchTeacherFormations = async (teacherId: string) => {
    try {
      const { data, error } = await supabase
        .from('teacher_formations')
        .select(`
          formation_id,
          formations!inner(title)
        `)
        .eq('teacher_id', teacherId);

      if (error) throw error;
      
      const formattedData = data?.map(item => ({
        formation_id: item.formation_id,
        formation_title: (item.formations as any)?.title || 'Formation inconnue'
      })) || [];

      setTeacherFormations(formattedData);
    } catch (error) {
      console.error('Erreur lors du chargement des formations du professeur:', error);
    }
  };

  const fetchTeacherStats = async (teacherId: string) => {
    try {
      // Statistiques des entretiens
      const { data: interviewsData, error: interviewsError } = await supabase
        .from('interview_evaluations')
        .select('created_at')
        .eq('teacher_id', teacherId);

      if (interviewsError) throw interviewsError;

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const thisYear = new Date(now.getFullYear(), 0, 1);

      const total_interviews = interviewsData?.length || 0;
      const interviews_today = interviewsData?.filter(item => 
        new Date(item.created_at) >= today
      ).length || 0;
      const interviews_this_month = interviewsData?.filter(item => 
        new Date(item.created_at) >= thisMonth
      ).length || 0;
      const interviews_this_year = interviewsData?.filter(item => 
        new Date(item.created_at) >= thisYear
      ).length || 0;

      // Statistiques des exercices validés
      const { data: exercisesData, error: exercisesError } = await supabase
        .from('lesson_messages')
        .select('id')
        .eq('exercise_status', 'approved')
        .in('formation_id', teacherFormations.map(tf => tf.formation_id));

      if (exercisesError) throw exercisesError;

      // Revenus totaux
      const { data: walletData, error: walletError } = await supabase
        .from('teacher_wallets')
        .select('total_earned')
        .eq('teacher_id', teacherId)
        .single();

      if (walletError && walletError.code !== 'PGRST116') throw walletError;

      setTeacherStats({
        total_interviews,
        interviews_today,
        interviews_this_month,
        interviews_this_year,
        total_exercises_validated: exercisesData?.length || 0,
        total_earnings: walletData?.total_earned || 0
      });
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
      toast.error('Erreur lors du chargement des statistiques');
    }
  };

  const createTeacher = async () => {
    if (!newTeacher.first_name || !newTeacher.last_name || !newTeacher.email) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('teachers')
        .insert({
          id: crypto.randomUUID(),
          ...newTeacher
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Professeur créé avec succès');
      setIsCreateDialogOpen(false);
      setNewTeacher({ first_name: '', last_name: '', email: '', user_id: '' });
      fetchTeachers();
    } catch (error) {
      console.error('Erreur lors de la création du professeur:', error);
      toast.error('Erreur lors de la création du professeur');
    }
  };

  const deleteTeacher = async (teacherId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce professeur ?')) return;

    try {
      const { error } = await supabase
        .from('teachers')
        .delete()
        .eq('id', teacherId);

      if (error) throw error;

      toast.success('Professeur supprimé avec succès');
      fetchTeachers();
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast.error('Erreur lors de la suppression du professeur');
    }
  };

  const assignFormation = async () => {
    if (!selectedTeacher || !selectedFormationId) {
      toast.error('Veuillez sélectionner une formation');
      return;
    }

    try {
      const { error } = await supabase
        .from('teacher_formations')
        .insert({
          id: crypto.randomUUID(),
          teacher_id: selectedTeacher.id,
          formation_id: selectedFormationId,
          assigned_at: new Date().toISOString()
        });

      if (error) throw error;

      toast.success('Formation assignée avec succès');
      setIsAssignDialogOpen(false);
      setSelectedFormationId('');
      fetchTeacherFormations(selectedTeacher.id);
    } catch (error) {
      console.error('Erreur lors de l\'assignation:', error);
      toast.error('Erreur lors de l\'assignation de la formation');
    }
  };

  const openStats = async (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    await fetchTeacherFormations(teacher.id);
    await fetchTeacherStats(teacher.id);
    setIsStatsDialogOpen(true);
  };

  const openAssignment = async (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    await fetchTeacherFormations(teacher.id);
    setIsAssignDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Chargement des professeurs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-t-lg">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Gestion des Professeurs</CardTitle>
              <p className="text-purple-100 text-sm">
                Gérez les professeurs, leurs formations et leurs performances
              </p>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="secondary" className="bg-white text-purple-600 hover:bg-gray-100">
                  <Plus size={16} className="mr-2" />
                  Ajouter un professeur
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Ajouter un nouveau professeur</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="first_name">Prénom *</Label>
                    <Input
                      id="first_name"
                      value={newTeacher.first_name}
                      onChange={(e) => setNewTeacher({ ...newTeacher, first_name: e.target.value })}
                      placeholder="Prénom du professeur"
                    />
                  </div>
                  <div>
                    <Label htmlFor="last_name">Nom *</Label>
                    <Input
                      id="last_name"
                      value={newTeacher.last_name}
                      onChange={(e) => setNewTeacher({ ...newTeacher, last_name: e.target.value })}
                      placeholder="Nom du professeur"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newTeacher.email}
                      onChange={(e) => setNewTeacher({ ...newTeacher, email: e.target.value })}
                      placeholder="email@exemple.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="user_id">ID Utilisateur</Label>
                    <Input
                      id="user_id"
                      value={newTeacher.user_id}
                      onChange={(e) => setNewTeacher({ ...newTeacher, user_id: e.target.value })}
                      placeholder="UUID de l'utilisateur (optionnel)"
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      Annuler
                    </Button>
                    <Button onClick={createTeacher}>
                      Créer
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid gap-4">
            {teachers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users size={48} className="mx-auto mb-4 opacity-50" />
                <p>Aucun professeur trouvé</p>
              </div>
            ) : (
              teachers.map((teacher) => (
                <Card key={teacher.id} className="border hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={teacher.avatar_url} alt={`${teacher.first_name} ${teacher.last_name}`} />
                          <AvatarFallback className="bg-purple-100 text-purple-600">
                            {teacher.first_name.charAt(0)}{teacher.last_name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold text-lg">
                            {teacher.first_name} {teacher.last_name}
                          </h3>
                          <p className="text-gray-600">{teacher.email}</p>
                          <p className="text-sm text-gray-500">
                            Inscrit le {new Date(teacher.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openStats(teacher)}
                        >
                          <BarChart3 size={16} className="mr-1" />
                          Stats
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openAssignment(teacher)}
                        >
                          <Users size={16} className="mr-1" />
                          Formations
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteTeacher(teacher.id)}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dialog Assignation de Formations */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Formations de {selectedTeacher?.first_name} {selectedTeacher?.last_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Formations assignées</Label>
              <div className="mt-2 space-y-2">
                {teacherFormations.length === 0 ? (
                  <p className="text-gray-500 text-sm">Aucune formation assignée</p>
                ) : (
                  teacherFormations.map((tf) => (
                    <Badge key={tf.formation_id} variant="secondary">
                      {tf.formation_title}
                    </Badge>
                  ))
                )}
              </div>
            </div>
            <div>
              <Label htmlFor="formation">Assigner une nouvelle formation</Label>
              <Select value={selectedFormationId} onValueChange={setSelectedFormationId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une formation" />
                </SelectTrigger>
                <SelectContent>
                  {formations.map((formation) => (
                    <SelectItem key={formation.id} value={formation.id}>
                      {formation.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
                Fermer
              </Button>
              <Button onClick={assignFormation} disabled={!selectedFormationId}>
                Assigner
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Statistiques */}
      <Dialog open={isStatsDialogOpen} onOpenChange={setIsStatsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Statistiques de {selectedTeacher?.first_name} {selectedTeacher?.last_name}
            </DialogTitle>
          </DialogHeader>
          {teacherStats && (
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Phone className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="text-sm text-gray-600">Entretiens totaux</p>
                      <p className="text-2xl font-bold">{teacherStats.total_interviews}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="text-sm text-gray-600">Aujourd'hui</p>
                      <p className="text-2xl font-bold">{teacherStats.interviews_today}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-5 w-5 text-orange-500" />
                    <div>
                      <p className="text-sm text-gray-600">Ce mois</p>
                      <p className="text-2xl font-bold">{teacherStats.interviews_this_month}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-5 w-5 text-purple-500" />
                    <div>
                      <p className="text-sm text-gray-600">Cette année</p>
                      <p className="text-2xl font-bold">{teacherStats.interviews_this_year}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Edit className="h-5 w-5 text-indigo-500" />
                    <div>
                      <p className="text-sm text-gray-600">Exercices validés</p>
                      <p className="text-2xl font-bold">{teacherStats.total_exercises_validated}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <BarChart3 className="h-5 w-5 text-emerald-500" />
                    <div>
                      <p className="text-sm text-gray-600">Revenus totaux</p>
                      <p className="text-2xl font-bold">{teacherStats.total_earnings}€</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          <div className="flex justify-end">
            <Button onClick={() => setIsStatsDialogOpen(false)}>
              Fermer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeachersManagement;