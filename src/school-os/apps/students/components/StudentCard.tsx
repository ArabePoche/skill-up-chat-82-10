// Card pour afficher un élève
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreVertical, Mail, Phone, MapPin } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface StudentCardProps {
  student: any;
  onEdit?: (student: any) => void;
  onDelete?: (id: string) => void;
}

export const StudentCard: React.FC<StudentCardProps> = ({
  student,
  onEdit,
  onDelete,
}) => {
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
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <Avatar className="w-16 h-16">
            <AvatarImage src={student.photo_url} alt={`${student.first_name} ${student.last_name}`} />
            <AvatarFallback className="bg-primary text-primary-foreground">
              {getInitials()}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-semibold text-lg">
                  {student.first_name} {student.last_name}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {calculateAge(student.date_of_birth)} ans • {student.gender === 'male' ? 'Garçon' : 'Fille'}
                </p>
              </div>

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
                  <DropdownMenuItem
                    onClick={() => onDelete?.(student.id)}
                    className="text-destructive"
                  >
                    Supprimer
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex flex-wrap gap-2 mb-3">
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
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                <MapPin className="h-3 w-3" />
                <span>
                  {student.address}
                  {student.address && student.city && ', '}
                  {student.city}
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
