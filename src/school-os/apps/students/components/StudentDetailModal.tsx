// Modal de détails complet d'un élève
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import {
  Mail,
  Phone,
  MapPin,
  Calendar,
  User,
  Upload,
  Camera,
  Edit,
  Heart,
  Users,
  Trash2,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { StudentFamilySelector } from '@/school-os/families';
import { DeleteStudentDialog } from './DeleteStudentDialog';

interface StudentDetailModalProps {
  student: any;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (student: any) => void;
  onDelete?: (studentId: string) => void;
}

export const StudentDetailModal: React.FC<StudentDetailModalProps> = ({
  student,
  isOpen,
  onClose,
  onEdit,
  onDelete,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const getInitials = () => {
    return `${student.first_name?.[0] || ''}${student.last_name?.[0] || ''}`.toUpperCase();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const calculateAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Vérifier le type et la taille du fichier
    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner une image');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('La taille de l\'image ne doit pas dépasser 5 Mo');
      return;
    }

    setIsUploading(true);

    try {
      // Supprimer l'ancienne photo si elle existe
      if (student.photo_url) {
        const oldPath = student.photo_url.split('/').pop();
        if (oldPath) {
          await supabase.storage
            .from('student-photos')
            .remove([`${student.school_id}/${oldPath}`]);
        }
      }

      // Upload la nouvelle photo
      const fileExt = file.name.split('.').pop();
      const fileName = `${student.id}-${Date.now()}.${fileExt}`;
      const filePath = `${student.school_id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('student-photos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Obtenir l'URL publique
      const { data: { publicUrl } } = supabase.storage
        .from('student-photos')
        .getPublicUrl(filePath);

      // Mettre à jour l'élève
      const { error: updateError } = await supabase
        .from('students_school')
        .update({ photo_url: publicUrl })
        .eq('id', student.id);

      if (updateError) throw updateError;

      toast.success('Photo mise à jour avec succès');
      window.location.reload(); // Recharger pour afficher la nouvelle photo
    } catch (error: any) {
      toast.error('Erreur lors de l\'upload de la photo: ' + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Détails de l'élève</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Photo et informations principales */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative group">
              <Avatar className="w-32 h-32">
                <AvatarImage src={student.photo_url} alt={`${student.first_name} ${student.last_name}`} />
                <AvatarFallback className="bg-primary text-primary-foreground text-3xl">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              
              <label
                htmlFor="photo-upload"
                className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                <Camera className="w-8 h-8 text-white" />
                <input
                  id="photo-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoUpload}
                  disabled={isUploading}
                />
              </label>
            </div>

            <div className="text-center">
              <h3 className="text-2xl font-bold">
                {student.first_name} {student.last_name}
              </h3>
              <p className="text-muted-foreground">
                {calculateAge(student.date_of_birth)} ans • {student.gender === 'male' ? 'Garçon' : 'Fille'}
              </p>
            </div>

            <div className="flex flex-wrap gap-2 justify-center">
              {student.classes && (
                <Badge variant="secondary">
                  {student.classes.name} - {student.classes.cycle}
                </Badge>
              )}
              {student.student_code && (
                <Badge variant="outline">Code: {student.student_code}</Badge>
              )}
              <Badge
                variant={
                  student.status === 'active'
                    ? 'default'
                    : student.status === 'inactive'
                    ? 'secondary'
                    : 'destructive'
                }
              >
                {student.status === 'active'
                  ? 'Actif'
                  : student.status === 'inactive'
                  ? 'Inactif'
                  : 'Transféré'}
              </Badge>
            </div>
          </div>

          <Separator />

          {/* Informations personnelles */}
          <div className="space-y-4">
            <h4 className="font-semibold flex items-center gap-2">
              <User className="w-4 h-4" />
              Informations personnelles
            </h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">Date de naissance</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span>{formatDate(student.date_of_birth)}</span>
                </div>
              </div>

              {student.address && (
                <div className="col-span-2">
                  <Label className="text-muted-foreground">Adresse</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span>
                      {student.address}
                      {student.city && `, ${student.city}`}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Informations du parent/tuteur */}
          {student.parent_name && (
            <>
              <div className="space-y-4">
                <h4 className="font-semibold flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Parent/Tuteur
                </h4>
                
                <div className="space-y-3">
                  <div>
                    <Label className="text-muted-foreground">Nom</Label>
                    <p className="mt-1">{student.parent_name}</p>
                  </div>

                  {student.parent_phone && (
                    <div>
                      <Label className="text-muted-foreground">Téléphone</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <a
                          href={`tel:${student.parent_phone}`}
                          className="text-primary hover:underline"
                        >
                          {student.parent_phone}
                        </a>
                      </div>
                    </div>
                  )}

                  {student.parent_email && (
                    <div>
                      <Label className="text-muted-foreground">Email</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <a
                          href={`mailto:${student.parent_email}`}
                          className="text-primary hover:underline"
                        >
                          {student.parent_email}
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <Separator />
            </>
          )}

          {/* Famille */}
          <div className="space-y-4">
            <h4 className="font-semibold flex items-center gap-2">
              <Users className="w-4 h-4" />
              Famille
            </h4>
            <StudentFamilySelector
              studentId={student.id}
              schoolId={student.school_id}
              currentFamilyId={student.family_id}
            />
          </div>

          <Separator />

          {/* Notes médicales */}
          {student.medical_notes && (
            <>
              <div className="space-y-4">
                <h4 className="font-semibold flex items-center gap-2">
                  <Heart className="w-4 h-4" />
                  Notes médicales
                </h4>
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm">{student.medical_notes}</p>
                </div>
              </div>

              <Separator />
            </>
          )}

          {/* Remises accordées */}
          {(student.discount_percentage || student.discount_amount) && (
            <>
              <div className="space-y-4">
                <h4 className="font-semibold">Remises accordées</h4>
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  {student.discount_percentage && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Remise en pourcentage :</span>
                      <span className="font-medium">{student.discount_percentage}%</span>
                    </div>
                  )}
                  {student.discount_amount && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Remise fixe :</span>
                      <span className="font-medium">{student.discount_amount} FCFA</span>
                    </div>
                  )}
                </div>
              </div>

              <Separator />
            </>
          )}

          {/* Actions */}
          <div className="flex justify-between gap-2">
            <div>
              {onDelete && (
                <Button 
                  variant="destructive"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Supprimer
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Fermer
              </Button>
              {onEdit && (
                <Button onClick={() => onEdit(student)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Modifier
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* Dialog de confirmation de suppression - en dehors du Dialog parent */}
    <DeleteStudentDialog
      open={showDeleteDialog}
      onOpenChange={setShowDeleteDialog}
      studentName={`${student.first_name} ${student.last_name}`}
      onConfirm={() => {
        if (onDelete) {
          onDelete(student.id);
          setShowDeleteDialog(false);
          onClose();
        }
      }}
    />
    </>
  );
};
