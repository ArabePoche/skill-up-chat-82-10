/**
 * Dialog pour modifier une matière existante
 */
import React from 'react';
import { useForm } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUpdateSubject, type Subject } from '../hooks/useSubjects';

interface SubjectEditDialogProps {
  subject: Subject | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FormData {
  name: string;
  code: string;
}

const SubjectEditDialog: React.FC<SubjectEditDialogProps> = ({
  subject,
  open,
  onOpenChange,
}) => {
  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormData>({
    defaultValues: {
      name: subject?.name || '',
      code: subject?.code || '',
    },
  });

  const updateSubject = useUpdateSubject();

  React.useEffect(() => {
    if (subject) {
      reset({
        name: subject.name,
        code: subject.code || '',
      });
    }
  }, [subject, reset]);

  const onSubmit = async (data: FormData) => {
    if (!subject) return;

    await updateSubject.mutateAsync({
      id: subject.id,
      data: {
        name: data.name,
        code: data.code || undefined,
      },
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier la matière</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="name">Nom de la matière *</Label>
            <Input
              id="name"
              {...register('name', { required: 'Le nom est requis' })}
              placeholder="ex: Mathématiques"
            />
            {errors.name && (
              <p className="text-sm text-destructive mt-1">{errors.name.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="code">Code (optionnel)</Label>
            <Input
              id="code"
              {...register('code')}
              placeholder="ex: MATH-01"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={updateSubject.isPending}>
              {updateSubject.isPending ? 'Modification...' : 'Modifier'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SubjectEditDialog;
