// Composant pour gérer l'ajout d'élèves à une famille
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRight, ArrowLeft, Search, Users, X, UsersRound } from 'lucide-react';
import { useFamilies, useLinkStudentToFamily, Family } from '../hooks/useFamilies';
import { useStudents } from '@/school-os/apps/students/hooks/useStudents';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface FamilyStudentsManagerProps {
  schoolId: string;
}

export const FamilyStudentsManager: React.FC<FamilyStudentsManagerProps> = ({ schoolId }) => {
  const [selectedFamilyId, setSelectedFamilyId] = useState<string>('');
  const [searchAvailable, setSearchAvailable] = useState('');
  const [searchLinked, setSearchLinked] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'class'>('name');

  const { data: families } = useFamilies(schoolId);
  const { data: students } = useStudents(schoolId);
  const linkMutation = useLinkStudentToFamily();

  const selectedFamily = families?.find(f => f.id === selectedFamilyId);

  // Tous les élèves disponibles et élèves liés à la famille sélectionnée
  const { availableStudents, linkedStudents } = useMemo(() => {
    if (!students || !selectedFamilyId) {
      return { availableStudents: students || [], linkedStudents: [] };
    }

    const linked = students.filter(s => s.family_id === selectedFamilyId);
    const available = students || [];

    return { availableStudents: available, linkedStudents: linked };
  }, [students, selectedFamilyId]);

  // Filtrer et trier les élèves disponibles
  const filteredAvailable = useMemo(() => {
    let filtered = availableStudents.filter(s => {
      const fullName = `${s.first_name} ${s.last_name}`.toLowerCase();
      return fullName.includes(searchAvailable.toLowerCase());
    });

    if (sortBy === 'name') {
      filtered.sort((a, b) => `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`));
    } else if (sortBy === 'class') {
      filtered.sort((a, b) => (a.classes?.name || '').localeCompare(b.classes?.name || ''));
    }

    return filtered;
  }, [availableStudents, searchAvailable, sortBy]);

  // Filtrer les élèves liés
  const filteredLinked = useMemo(() => {
    return linkedStudents.filter(s => {
      const fullName = `${s.first_name} ${s.last_name}`.toLowerCase();
      return fullName.includes(searchLinked.toLowerCase());
    });
  }, [linkedStudents, searchLinked]);

  const handleLinkStudent = (studentId: string) => {
    if (!selectedFamilyId) return;
    linkMutation.mutate({ studentId, familyId: selectedFamilyId });
  };

  const handleUnlinkStudent = (studentId: string) => {
    linkMutation.mutate({ studentId, familyId: null });
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Gestion des Élèves par Famille
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Sélection de la famille */}
          <div className="space-y-2">
            <Label>Sélectionner une famille</Label>
            <Select value={selectedFamilyId} onValueChange={setSelectedFamilyId}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir une famille..." />
              </SelectTrigger>
              <SelectContent>
                {families?.map((family) => (
                  <SelectItem key={family.id} value={family.id}>
                    {family.family_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedFamily && (
            <>
              {/* Informations famille */}
              <Card className="bg-muted/50">
                <CardContent className="pt-4">
                  <div className="space-y-1 text-sm">
                    <p><strong>Contact:</strong> {selectedFamily.primary_contact_name || 'Non renseigné'}</p>
                    <p><strong>Téléphone:</strong> {selectedFamily.primary_contact_phone || 'Non renseigné'}</p>
                    <p><strong>Email:</strong> {selectedFamily.primary_contact_email || 'Non renseigné'}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Tri et recherche */}
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label className="text-xs mb-1">Trier par</Label>
                  <Select value={sortBy} onValueChange={(v) => setSortBy(v as 'name' | 'class')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name">Nom</SelectItem>
                      <SelectItem value="class">Classe</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Deux listes côte à côte */}
              <div className="grid md:grid-cols-2 gap-4">
                {/* Liste des élèves disponibles */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center justify-between">
                      <span>Élèves disponibles ({filteredAvailable.length})</span>
                    </CardTitle>
                    <div className="relative mt-2">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Rechercher..."
                        value={searchAvailable}
                        onChange={(e) => setSearchAvailable(e.target.value)}
                        className="pl-8"
                      />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[400px] pr-4">
                      <div className="space-y-2">
                        {filteredAvailable.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-8">
                            Aucun élève disponible
                          </p>
                        ) : (
                          filteredAvailable.map((student) => {
                            const isInSelectedFamily = student.family_id === selectedFamilyId;
                            const hasFamily = student.family_id && student.school_student_families;
                            const familySiblings = hasFamily ? students?.filter(s => s.family_id === student.family_id && s.id !== student.id) : [];
                            
                            return (
                              <Card key={student.id} className={`p-3 hover:bg-accent transition-colors ${isInSelectedFamily ? 'bg-primary/5' : ''}`}>
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <Avatar className="h-10 w-10">
                                      <AvatarImage src={student.photo_url || undefined} />
                                      <AvatarFallback>
                                        {getInitials(student.first_name, student.last_name)}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium text-sm truncate">
                                        {student.first_name} {student.last_name}
                                      </p>
                                      <div className="flex items-center gap-2 flex-wrap mt-1">
                                        {student.classes?.name && (
                                          <Badge variant="outline" className="text-xs">
                                            {student.classes.name}
                                          </Badge>
                                        )}
                                        {hasFamily && !isInSelectedFamily && (
                                          <Dialog>
                                            <DialogTrigger asChild>
                                              <Badge 
                                                variant="secondary" 
                                                className="text-xs cursor-pointer hover:bg-secondary/80 flex items-center gap-1"
                                              >
                                                <UsersRound className="h-3 w-3" />
                                                {student.school_student_families.family_name}
                                                {familySiblings && familySiblings.length > 0 && ` (${familySiblings.length})`}
                                              </Badge>
                                            </DialogTrigger>
                                            <DialogContent>
                                              <DialogHeader>
                                                <DialogTitle>Famille: {student.school_student_families.family_name}</DialogTitle>
                                              </DialogHeader>
                                              <div className="space-y-2 mt-4">
                                                {/* Élève actuel */}
                                                <Card className="p-3 bg-primary/5">
                                                  <div className="flex items-center gap-3">
                                                    <Avatar className="h-10 w-10">
                                                      <AvatarImage src={student.photo_url || undefined} />
                                                      <AvatarFallback>
                                                        {getInitials(student.first_name, student.last_name)}
                                                      </AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                      <p className="font-medium text-sm">
                                                        {student.first_name} {student.last_name}
                                                      </p>
                                                      {student.classes?.name && (
                                                        <Badge variant="outline" className="text-xs mt-1">
                                                          {student.classes.name}
                                                        </Badge>
                                                      )}
                                                    </div>
                                                  </div>
                                                </Card>
                                                
                                                {/* Frères et sœurs */}
                                                {familySiblings && familySiblings.length > 0 && (
                                                  <>
                                                    <p className="text-sm text-muted-foreground mt-3">Frères et sœurs:</p>
                                                    {familySiblings.map((sibling) => (
                                                      <Card key={sibling.id} className="p-3">
                                                        <div className="flex items-center gap-3">
                                                          <Avatar className="h-10 w-10">
                                                            <AvatarImage src={sibling.photo_url || undefined} />
                                                            <AvatarFallback>
                                                              {getInitials(sibling.first_name, sibling.last_name)}
                                                            </AvatarFallback>
                                                          </Avatar>
                                                          <div>
                                                            <p className="font-medium text-sm">
                                                              {sibling.first_name} {sibling.last_name}
                                                            </p>
                                                            {sibling.classes?.name && (
                                                              <Badge variant="outline" className="text-xs mt-1">
                                                                {sibling.classes.name}
                                                              </Badge>
                                                            )}
                                                          </div>
                                                        </div>
                                                      </Card>
                                                    ))}
                                                  </>
                                                )}
                                              </div>
                                            </DialogContent>
                                          </Dialog>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  {!isInSelectedFamily && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleLinkStudent(student.id)}
                                      disabled={linkMutation.isPending}
                                    >
                                      <ArrowRight className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </Card>
                            );
                          })
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>

                {/* Liste des élèves liés */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center justify-between">
                      <span>Élèves de la famille ({filteredLinked.length})</span>
                    </CardTitle>
                    <div className="relative mt-2">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Rechercher..."
                        value={searchLinked}
                        onChange={(e) => setSearchLinked(e.target.value)}
                        className="pl-8"
                      />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[400px] pr-4">
                      <div className="space-y-2">
                        {filteredLinked.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-8">
                            Aucun élève dans cette famille
                          </p>
                        ) : (
                          filteredLinked.map((student) => (
                            <Card key={student.id} className="p-3 hover:bg-accent transition-colors bg-primary/5">
                              <div className="flex items-center justify-between gap-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleUnlinkStudent(student.id)}
                                  disabled={linkMutation.isPending}
                                >
                                  <ArrowLeft className="h-4 w-4" />
                                </Button>
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                  <Avatar className="h-10 w-10">
                                    <AvatarImage src={student.photo_url || undefined} />
                                    <AvatarFallback>
                                      {getInitials(student.first_name, student.last_name)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm truncate">
                                      {student.first_name} {student.last_name}
                                    </p>
                                    {student.classes?.name && (
                                      <Badge variant="outline" className="text-xs mt-1">
                                        {student.classes.name}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </Card>
                          ))
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            </>
          )}

          {!selectedFamily && (
            <Card className="bg-muted/50">
              <CardContent className="text-center py-12">
                <Users className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                <p className="text-muted-foreground">
                  Sélectionnez une famille pour gérer ses élèves
                </p>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
