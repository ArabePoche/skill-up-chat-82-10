// Composant de confirmation de code parental côté parent
import React, { useState } from 'react';
import { Key, Users, ShieldCheck, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { useMyPendingConfirmations, useConfirmParentalCode, useStudentsByFamily } from '../hooks/useParentJoinConfirmation';

const ConfirmationItem: React.FC<{ confirmation: any }> = ({ confirmation }) => {
  const [code, setCode] = useState('');
  const confirmMutation = useConfirmParentalCode();
  const { data: students = [] } = useStudentsByFamily(confirmation.family_id);
  const schoolName = confirmation.schools?.name || 'École';

  const handleConfirm = async () => {
    await confirmMutation.mutateAsync({
      confirmationId: confirmation.id,
      code: code.toUpperCase(),
    });
  };

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="w-5 h-5 text-primary" />
          Confirmation requise — {schoolName}
        </CardTitle>
        <CardDescription>
          Un administrateur vous a associé à des élèves. Saisissez le code parental pour confirmer.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Liste des élèves liés */}
        {students.length > 0 && (
          <div className="rounded-lg bg-background border p-3">
            <Label className="flex items-center gap-2 text-sm mb-2">
              <Users className="w-4 h-4" />
              Élèves associés
            </Label>
            <div className="space-y-1">
              {students.map((student: any) => (
                <div key={student.id} className="flex items-center gap-2 text-sm">
                  <span className="font-medium">{student.first_name} {student.last_name}</span>
                  {student.classes && (
                    <Badge variant="outline" className="text-xs">{student.classes.name}</Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Message avec le code à saisir */}
        <div className="rounded-lg bg-warning/10 border border-warning/30 p-3">
          <p className="text-sm text-warning-foreground">
            <Key className="w-4 h-4 inline mr-1" />
            Saisissez le code parental que vous avez reçu de l'école pour confirmer votre accès. 
            Ce code se trouve sur le dossier scolaire de votre enfant.
          </p>
        </div>

        {/* Champ de saisie du code */}
        <div>
          <Label htmlFor={`code-${confirmation.id}`}>Code parental</Label>
          <Input
            id={`code-${confirmation.id}`}
            placeholder="Ex: FAM-AB12CD"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className="font-mono mt-1"
          />
        </div>

        <Button
          className="w-full gap-2"
          onClick={handleConfirm}
          disabled={!code.trim() || confirmMutation.isPending}
        >
          {confirmMutation.isPending ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Vérification...</>
          ) : (
            <><ShieldCheck className="w-4 h-4" /> Confirmer le code</>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

/**
 * Affiche les confirmations de code parental en attente pour le parent connecté.
 * Disparaît automatiquement une fois confirmé (confirmed_at non null).
 */
export const ParentCodeConfirmation: React.FC = () => {
  const { data: confirmations = [], isLoading } = useMyPendingConfirmations();

  if (isLoading || confirmations.length === 0) return null;

  return (
    <div className="space-y-3">
      {confirmations.map((c: any) => (
        <ConfirmationItem key={c.id} confirmation={c} />
      ))}
    </div>
  );
};
