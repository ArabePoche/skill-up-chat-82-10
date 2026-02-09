/**
 * Dialogue affichant les détails d'une famille
 */
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Users, Phone, Mail, MapPin, FileText } from 'lucide-react';
import { useFamilies } from '../hooks/useFamilies';
import { useFamilySiblings } from '../hooks/useFamilies';
import { useFamilyParents } from '../hooks/useParentalCode';
import { ParentalCodeDisplay } from './ParentalCodeDisplay';
import { StudentAvatar } from '@/school-os/apps/students/components/StudentAvatar';

interface FamilyDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  familyId: string | null;
  schoolId: string;
  currentStudentId?: string;
}

export const FamilyDetailsDialog: React.FC<FamilyDetailsDialogProps> = ({
  open,
  onOpenChange,
  familyId,
  schoolId,
  currentStudentId,
}) => {
  const { data: families = [] } = useFamilies(schoolId);
  const { data: siblings = [] } = useFamilySiblings(familyId, currentStudentId);
  const { data: parents = [] } = useFamilyParents(familyId);

  const family = families.find(f => f.id === familyId);

  if (!family) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            {family.family_name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Code parental */}
          {family.parental_code && (
            <Card>
              <CardContent className="pt-6">
                <ParentalCodeDisplay code={family.parental_code} />
              </CardContent>
            </Card>
          )}

          {/* Parents associés */}
          {parents.length > 0 && (
            <Card>
              <CardContent className="pt-6 space-y-2">
                <p className="text-sm font-medium mb-2">Parents associés ({parents.length})</p>
                {parents.map((parent: any) => (
                  <div key={parent.id} className="flex items-center gap-2 text-sm">
                    <span className="font-medium">
                      {parent.profiles?.first_name} {parent.profiles?.last_name}
                    </span>
                    <Badge variant="outline" className="text-xs">Actif</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Informations de contact */}
          <Card>
            <CardContent className="pt-6 space-y-3">
              {family.primary_contact_name && (
                <div className="flex items-start gap-3">
                  <Users className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Contact principal</p>
                    <p className="text-sm text-muted-foreground">{family.primary_contact_name}</p>
                  </div>
                </div>
              )}

              {family.primary_contact_phone && (
                <div className="flex items-start gap-3">
                  <Phone className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Téléphone</p>
                    <p className="text-sm text-muted-foreground">{family.primary_contact_phone}</p>
                  </div>
                </div>
              )}

              {family.primary_contact_email && (
                <div className="flex items-start gap-3">
                  <Mail className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Email</p>
                    <p className="text-sm text-muted-foreground">{family.primary_contact_email}</p>
                  </div>
                </div>
              )}

              {family.address && (
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Adresse</p>
                    <p className="text-sm text-muted-foreground">{family.address}</p>
                  </div>
                </div>
              )}

              {family.notes && (
                <div className="flex items-start gap-3">
                  <FileText className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Notes</p>
                    <p className="text-sm text-muted-foreground">{family.notes}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Membres de la famille */}
          {siblings.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Autres membres de la famille</h3>
              <div className="space-y-2">
                {siblings.map((sibling: any) => (
                  <Card key={sibling.id}>
                    <CardContent className="py-3">
                      <div className="flex items-center gap-3">
                        <StudentAvatar
                          photoUrl={sibling.photo_url}
                          firstName={sibling.first_name}
                          lastName={sibling.last_name}
                          size="sm"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">
                            {sibling.first_name} {sibling.last_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {sibling.classes?.name || 'Aucune classe'} • {sibling.classes?.cycle || ''}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {sibling.student_code || 'N/A'}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
