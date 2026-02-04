// Card pour afficher un élève
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreVertical, Mail, Phone, MapPin, Users, ChevronDown, FileText, Scale } from 'lucide-react';
import { ImageModal } from '@/components/ui/image-modal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useFamilySiblings } from '@/school-os/families/hooks/useFamilies';
import { TeacherFollowUpNotesModal } from '@/school-os/apps/teachers/components/TeacherFollowUpNotesModal';
import { StudentDecisionModal } from './StudentDecisionModal';

interface StudentCardProps {
  student: any;
  onEdit?: (student: any) => void;
  onClick?: (student: any) => void;
  showTeacherNotes?: boolean;
  currentTeacherId?: string;
  schoolId?: string;
  showDecisionOption?: boolean;
}

export const StudentCard: React.FC<StudentCardProps> = ({
  student,
  onEdit,
  onClick,
  showTeacherNotes = false,
  currentTeacherId,
  schoolId,
  showDecisionOption = false,
}) => {
  const [showSiblings, setShowSiblings] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const { data: siblings } = useFamilySiblings(student.family_id, student.id);

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

  return (
    <Card className="hover:shadow-md transition-shadow">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            <Avatar 
              className="w-12 h-12 cursor-pointer" 
              onClick={(e) => {
                e.stopPropagation();
                if (student.photo_url) {
                  setShowPhotoModal(true);
                }
              }}
            >
              <AvatarImage src={student.photo_url} alt={`${student.first_name} ${student.last_name}`} />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {getInitials()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-base truncate cursor-pointer" onClick={() => onClick?.(student)}>
                    {student.first_name} {student.last_name}
                  </h3>
                  {student.classes && (
                    <p className="text-sm text-muted-foreground truncate">
                      {student.classes.name}
                    </p>
                  )}
                </div>
                
                <div className="flex items-center gap-1">
                  <Badge
                    variant={
                      student.status === 'active'
                        ? 'default'
                        : student.status === 'inactive'
                        ? 'secondary'
                        : 'destructive'
                    }
                    className="text-xs"
                  >
                    {student.status === 'active'
                      ? 'Actif'
                      : student.status === 'inactive'
                      ? 'Inactif'
                      : 'Transféré'}
                  </Badge>

                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </Button>
                  </CollapsibleTrigger>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit?.(student)}>
                        Modifier
                      </DropdownMenuItem>
                      {showTeacherNotes && currentTeacherId && schoolId && (
                        <DropdownMenuItem onClick={() => setShowNotesModal(true)}>
                          <FileText className="h-4 w-4 mr-2" />
                          Notes de suivi
                        </DropdownMenuItem>
                      )}
                      {showDecisionOption && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setShowDecisionModal(true)}>
                            <Scale className="h-4 w-4 mr-2" />
                            Décision
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          </div>

          <CollapsibleContent>
            <div className="mt-3 pt-3 border-t space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="text-xs">
                  {calculateAge(student.date_of_birth)} ans • {student.gender === 'male' ? 'Garçon' : 'Fille'}
                </Badge>
                {student.student_code && (
                  <Badge variant="outline" className="text-xs">
                    {student.student_code}
                  </Badge>
                )}
                {student.family_id && student.school_student_families && (
                  <Badge 
                    variant="outline" 
                    className="cursor-pointer hover:bg-accent text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowSiblings(true);
                    }}
                  >
                    <Users className="h-3 w-3 mr-1" />
                    Famille: {student.school_student_families.family_name}
                    {siblings && siblings.length > 0 && ` (${siblings.length})`}
                  </Badge>
                )}
              </div>

              {student.parent_name && (
                <div className="space-y-1 text-sm">
                  <p className="font-medium">Parent/Tuteur: {student.parent_name}</p>
                  {student.parent_phone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      <span>{student.parent_phone}</span>
                    </div>
                  )}
                  {student.parent_email && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      <span>{student.parent_email}</span>
                    </div>
                  )}
                </div>
              )}

              {(student.address || student.city) && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span>
                    {student.address}
                    {student.address && student.city && ', '}
                    {student.city}
                  </span>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </CardContent>
      </Collapsible>

      <Dialog open={showSiblings} onOpenChange={setShowSiblings}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Frères et sœurs - Famille {student.school_student_families?.family_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {siblings && siblings.length > 0 ? (
              siblings.map((sibling: any) => (
                <div key={sibling.id} className="flex items-center gap-3 p-3 border rounded-lg">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={sibling.photo_url} />
                    <AvatarFallback className="bg-primary/10">
                      {`${sibling.first_name?.[0] || ''}${sibling.last_name?.[0] || ''}`.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium">{sibling.first_name} {sibling.last_name}</p>
                    {sibling.classes && (
                      <p className="text-sm text-muted-foreground">
                        {sibling.classes.name} - {sibling.classes.cycle}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      {new Date().getFullYear() - new Date(sibling.date_of_birth).getFullYear()} ans
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-4">
                Aucun frère ou sœur dans cette famille
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {student.photo_url && (
        <ImageModal
          isOpen={showPhotoModal}
          onClose={() => setShowPhotoModal(false)}
          imageUrl={student.photo_url}
          fileName={`${student.first_name} ${student.last_name}`}
        />
      )}

      {showTeacherNotes && currentTeacherId && schoolId && (
        <TeacherFollowUpNotesModal
          isOpen={showNotesModal}
          onClose={() => setShowNotesModal(false)}
          student={student}
          teacherId={currentTeacherId}
          schoolId={schoolId}
        />
      )}

      {/* Modal de décision */}
      {showDecisionOption && (
        <StudentDecisionModal
          isOpen={showDecisionModal}
          onClose={() => setShowDecisionModal(false)}
          student={student}
        />
      )}
    </Card>
  );
};
