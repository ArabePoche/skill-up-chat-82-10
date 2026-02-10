/**
 * Application de pré-inscription des enfants pour les parents
 * Permet aux parents de soumettre des demandes d'inscription pour leurs enfants
 */
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSchoolYear } from '@/school/context/SchoolYearContext';
import { useAuth } from '@/hooks/useAuth';
import { useParentChildren } from '@/school-os/apps/classes/hooks/useParentChildren';
import { useSchoolJoinRequest } from '@/school/hooks/useSchoolJoinRequest';
import { useSchoolClasses } from '@/school/hooks/useClasses';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { UserPlus, User, Plus, X, CheckCircle, Clock, XCircle, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

interface ChildForm {
  id: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  gender: string;
  classId: string;
}

export const ParentEnrollmentApp: React.FC = () => {
  const { t } = useTranslation();
  const { school, activeSchoolYear } = useSchoolYear();
  const { user } = useAuth();
  const { data: existingChildren, isLoading: isLoadingChildren } = useParentChildren(school?.id, activeSchoolYear?.id);
  const { data: classes } = useSchoolClasses(school?.id, activeSchoolYear?.id);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [children, setChildren] = useState<ChildForm[]>([
    { id: '1', firstName: '', lastName: '', birthDate: '', gender: '', classId: '' }
  ]);

  // Récupérer les demandes en cours
  const { data: pendingRequests } = useQuery({
    queryKey: ['parent-enrollment-requests', school?.id, user?.id],
    queryFn: async () => {
      if (!school?.id || !user?.id) return [];
      const { data, error } = await supabase
        .from('school_join_requests')
        .select('*')
        .eq('school_id', school.id)
        .eq('user_id', user.id)
        .eq('role', 'parent-enrollment')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!school?.id && !!user?.id,
  });

  const addChild = () => {
    setChildren(prev => [...prev, {
      id: Date.now().toString(),
      firstName: '',
      lastName: '',
      birthDate: '',
      gender: '',
      classId: '',
    }]);
  };

  const removeChild = (id: string) => {
    if (children.length > 1) {
      setChildren(prev => prev.filter(c => c.id !== id));
    }
  };

  const updateChild = (id: string, field: keyof ChildForm, value: string) => {
    setChildren(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school?.id || !user?.id) return;

    // Validation
    const isValid = children.every(c => c.firstName && c.lastName && c.birthDate && c.gender);
    if (!isValid) {
      toast.error('Veuillez remplir tous les champs obligatoires pour chaque enfant');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('school_join_requests')
        .insert({
          school_id: school.id,
          user_id: user.id,
          role: 'parent-enrollment',
          status: 'pending',
          form_data: {
            children: children.map(c => ({
              firstName: c.firstName,
              lastName: c.lastName,
              birthDate: c.birthDate,
              gender: c.gender,
              classId: c.classId || null,
              className: classes?.find((cl: any) => cl.id === c.classId)?.name || null,
            })),
            message,
          },
        });

      if (error) throw error;

      toast.success('Demande de pré-inscription envoyée avec succès !');
      setChildren([{ id: '1', firstName: '', lastName: '', birthDate: '', gender: '', classId: '' }]);
      setMessage('');
    } catch (error) {
      console.error('Error submitting enrollment:', error);
      toast.error("Erreur lors de l'envoi de la demande");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" /> En attente</Badge>;
      case 'approved':
        return <Badge variant="default"><CheckCircle className="w-3 h-3 mr-1" /> Approuvée</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Refusée</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (!school || !activeSchoolYear) {
    return (
      <div className="p-6 h-full flex items-center justify-center">
        <Card className="p-6">
          <p className="text-muted-foreground">Aucune année scolaire active</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 h-full flex flex-col overflow-hidden">
      <div className="flex items-center gap-3 mb-6 flex-shrink-0">
        <UserPlus className="w-6 h-6 text-primary" />
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">Inscription enfants</h2>
          <p className="text-sm text-muted-foreground">
            Pré-inscrivez vos enfants dans cette école
          </p>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-6 pr-2">
          {/* Enfants déjà inscrits */}
          {existingChildren && existingChildren.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Enfants déjà inscrits ({existingChildren.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {existingChildren.map(child => (
                  <div key={child.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        {child.photo_url ? (
                          <img src={child.photo_url} alt="" className="w-full h-full rounded-full object-cover" />
                        ) : (
                          <User className="w-4 h-4 text-primary" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{child.last_name} {child.first_name}</p>
                        <p className="text-xs text-muted-foreground">{child.class_name || 'Non assigné'}</p>
                      </div>
                    </div>
                    <Badge variant="default">
                      <CheckCircle className="w-3 h-3 mr-1" /> Inscrit
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Demandes en cours */}
          {pendingRequests && pendingRequests.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Demandes précédentes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {pendingRequests.map((req: any) => {
                  const formData = req.form_data as any;
                  const reqChildren = formData?.children || [];
                  return (
                    <div key={req.id} className="p-3 rounded-lg border space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          {new Date(req.created_at).toLocaleDateString('fr-FR')}
                        </span>
                        {getStatusBadge(req.status)}
                      </div>
                      <div className="text-sm">
                        {reqChildren.map((c: any, i: number) => (
                          <span key={i}>
                            {c.lastName} {c.firstName}{c.className ? ` (${c.className})` : ''}
                            {i < reqChildren.length - 1 ? ', ' : ''}
                          </span>
                        ))}
                      </div>
                      {req.rejection_reason && (
                        <p className="text-sm text-destructive">Motif : {req.rejection_reason}</p>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Formulaire de pré-inscription */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Nouvelle pré-inscription
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {children.map((child, index) => (
                  <div key={child.id} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Enfant {index + 1}</span>
                      {children.length > 1 && (
                        <Button type="button" size="sm" variant="ghost" onClick={() => removeChild(child.id)}>
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <Label>Prénom *</Label>
                        <Input
                          value={child.firstName}
                          onChange={(e) => updateChild(child.id, 'firstName', e.target.value)}
                          placeholder="Prénom de l'enfant"
                          required
                        />
                      </div>
                      <div>
                        <Label>Nom *</Label>
                        <Input
                          value={child.lastName}
                          onChange={(e) => updateChild(child.id, 'lastName', e.target.value)}
                          placeholder="Nom de l'enfant"
                          required
                        />
                      </div>
                      <div>
                        <Label>Date de naissance *</Label>
                        <Input
                          type="date"
                          value={child.birthDate}
                          onChange={(e) => updateChild(child.id, 'birthDate', e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <Label>Genre *</Label>
                        <Select value={child.gender} onValueChange={(v) => updateChild(child.id, 'gender', v)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner" />
                          </SelectTrigger>
                          <SelectContent className="z-[70]">
                            <SelectItem value="male">Garçon</SelectItem>
                            <SelectItem value="female">Fille</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="sm:col-span-2">
                        <Label>Classe souhaitée</Label>
                        <Select value={child.classId} onValueChange={(v) => updateChild(child.id, 'classId', v)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner une classe (optionnel)" />
                          </SelectTrigger>
                          <SelectContent className="z-[70]">
                            {classes?.map((cls: any) => (
                              <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                ))}

                <Button type="button" variant="outline" onClick={addChild} className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter un enfant
                </Button>

                <div>
                  <Label>Message (optionnel)</Label>
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Informations complémentaires, motivations..."
                    rows={3}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? 'Envoi...' : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Envoyer la demande de pré-inscription
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
};
