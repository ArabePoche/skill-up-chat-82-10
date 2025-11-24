// Dialog pour créer/éditer un enseignant
import React, { useState, useEffect } from 'react';
import { useCreateTeacher, useUpdateTeacher } from '../hooks';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Teacher } from '../types';

interface TeacherDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacher?: Teacher | null;
}

export const TeacherDialog: React.FC<TeacherDialogProps> = ({
  open,
  onOpenChange,
  teacher,
}) => {
  const [userId, setUserId] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [type, setType] = useState<'generalist' | 'specialist'>('generalist');
  const [specialty, setSpecialty] = useState('');

  const { mutate: createTeacher, isPending: isCreating } = useCreateTeacher();
  const { mutate: updateTeacher, isPending: isUpdating } = useUpdateTeacher();

  useEffect(() => {
    if (teacher) {
      setUserId(teacher.user_id);
      setFirstName(teacher.profiles?.first_name || '');
      setLastName(teacher.profiles?.last_name || '');
      setEmail(teacher.profiles?.email || '');
      // Le type vient déjà avec les bonnes valeurs ('generaliste' ou 'specialiste')
      setType(teacher.type);
      setSpecialty(teacher.specialty || '');
    } else {
      setUserId('');
      setFirstName('');
      setLastName('');
      setEmail('');
      setType('generalist');
      setSpecialty('');
    }
  }, [teacher]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (teacher) {
      updateTeacher(
        { id: teacher.id, type, specialty: type === 'specialist' ? specialty : undefined },
        { onSuccess: () => onOpenChange(false) }
      );
    } else {
      createTeacher(
        { 
          user_id: userId,
          first_name: firstName,
          last_name: lastName,
          email,
          type,
          specialty: type === 'specialist' ? specialty : undefined 
        },
        { onSuccess: () => onOpenChange(false) }
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {teacher ? 'Modifier l\'enseignant' : 'Ajouter un enseignant'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!teacher && (
            <>
              <div>
                <Label htmlFor="userId">ID Utilisateur *</Label>
                <Input
                  id="userId"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder="UUID de l'utilisateur"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">Prénom *</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Nom *</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </>
          )}

          <div>
            <Label htmlFor="type">Type d'enseignant *</Label>
            <Select value={type} onValueChange={(v) => setType(v as 'generalist' | 'specialist')}>
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="generalist">Generalist (Main teacher)</SelectItem>
                <SelectItem value="specialist">Specialist (Specific subject)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {type === 'specialist' && (
            <div>
              <Label htmlFor="specialty">Spécialité *</Label>
              <Input
                id="specialty"
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                placeholder="Ex: Mathématiques, Français, Histoire..."
                required
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={isCreating || isUpdating}>
              {teacher ? 'Mettre à jour' : 'Créer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
