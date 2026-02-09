// Formulaire de saisie du code parental pour un parent
import React, { useState } from 'react';
import { Key, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAssociateParentWithCode } from '../hooks/useParentalCode';

interface ParentalCodeInputProps {
  onSuccess?: () => void;
}

export const ParentalCodeInput: React.FC<ParentalCodeInputProps> = ({ onSuccess }) => {
  const [code, setCode] = useState('');
  const associateMutation = useAssociateParentWithCode();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    associateMutation.mutate(code.trim().toUpperCase(), {
      onSuccess: () => {
        setCode('');
        onSuccess?.();
      },
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Key className="w-5 h-5" />
          Associer un code parental
        </CardTitle>
        <CardDescription>
          Saisissez le code parental fourni par l'établissement pour accéder aux informations de vos enfants.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="flex-1">
            <Label htmlFor="parental-code" className="sr-only">Code parental</Label>
            <Input
              id="parental-code"
              placeholder="Ex: FAM-AB12CD"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="font-mono"
              disabled={associateMutation.isPending}
            />
          </div>
          <Button type="submit" disabled={!code.trim() || associateMutation.isPending}>
            {associateMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              'Associer'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
