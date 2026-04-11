import React, { useMemo, useState } from 'react';
import { Loader2, Megaphone, Trash2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useFileUpload } from '@/hooks/useFileUpload';
import {
  type FormationPublicMessageMediaType,
  type FormationPublicMessageScope,
  useFormationPublicMessagesAdmin,
} from '@/hooks/formation-public-messages/useFormationPublicMessages';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface LevelOption {
  id: string;
  title: string;
}

interface PublicMessageManagerDialogProps {
  formationId: string;
  levels: LevelOption[];
}

const PublicMessageManagerDialog: React.FC<PublicMessageManagerDialogProps> = ({ formationId, levels }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { uploadFile, isUploading } = useFileUpload();
  const { data: messages = [], isLoading } = useFormationPublicMessagesAdmin(formationId);

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scope, setScope] = useState<FormationPublicMessageScope>('specific_level');
  const [levelId, setLevelId] = useState<string>('');
  const [mediaType, setMediaType] = useState<FormationPublicMessageMediaType>('video');
  const [urgent, setUrgent] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const sortedLevels = useMemo(
    () => [...levels].sort((left, right) => left.title.localeCompare(right.title, 'fr')),
    [levels],
  );

  const invalidateMessages = async () => {
    await queryClient.invalidateQueries({ queryKey: ['formation-public-messages-admin', formationId] });
    await queryClient.invalidateQueries({ queryKey: ['formation-public-messages', formationId] });
  };

  const createMessage = useMutation({
    mutationFn: async () => {
      if (!user?.id) {
        throw new Error('Utilisateur non authentifié');
      }

      if (!selectedFile) {
        throw new Error('Veuillez sélectionner un fichier audio ou vidéo.');
      }

      if (scope === 'specific_level' && !levelId) {
        throw new Error('Veuillez sélectionner un niveau cible.');
      }

      const uploadResult = await uploadFile(selectedFile, 'media');

      const { error } = await supabase.from('formation_public_messages').insert({
        formation_id: formationId,
        level_id: scope === 'specific_level' ? levelId : null,
        author_id: user.id,
        scope,
        media_type: mediaType,
        title: title.trim() || null,
        description: description.trim() || null,
        media_url: uploadResult.fileUrl,
        media_path: uploadResult.filePath,
        urgent,
        is_active: true,
        updated_at: new Date().toISOString(),
      });

      if (error) {
        throw error;
      }
    },
    onSuccess: async () => {
      toast.success('Message public publié');
      setTitle('');
      setDescription('');
      setScope('specific_level');
      setLevelId('');
      setMediaType('video');
      setUrgent(false);
      setSelectedFile(null);
      await invalidateMessages();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Impossible de publier le message public');
    },
  });

  const toggleMessage = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('formation_public_messages')
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) {
        throw error;
      }
    },
    onSuccess: async (_, variables) => {
      toast.success(variables.isActive ? 'Message réactivé' : 'Message désactivé');
      await invalidateMessages();
    },
    onError: () => {
      toast.error('Impossible de mettre à jour ce message');
    },
  });

  const deleteMessage = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('formation_public_messages').delete().eq('id', id);

      if (error) {
        throw error;
      }
    },
    onSuccess: async () => {
      toast.success('Message supprimé');
      await invalidateMessages();
    },
    onError: () => {
      toast.error('Impossible de supprimer ce message');
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-white text-blue-600 hover:bg-blue-50">
          <Megaphone className="mr-2 h-4 w-4" />
          Messages publics
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Messages publics par niveau</DialogTitle>
        </DialogHeader>

        <div className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
          <div className="space-y-4 rounded-2xl border border-slate-200 p-4">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Publier un nouveau message</h3>
              <p className="text-sm text-slate-500">
                Les messages urgents bloquent l’accès jusqu’à lecture complète.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Type de média</Label>
                <Select
                  value={mediaType}
                  onValueChange={(value) => {
                    setMediaType(value as FormationPublicMessageMediaType);
                    setSelectedFile(null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="video">Vidéo</SelectItem>
                    <SelectItem value="audio">Audio</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Portée</Label>
                <Select value={scope} onValueChange={(value) => setScope(value as FormationPublicMessageScope)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir la portée" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="specific_level">Un niveau précis</SelectItem>
                    <SelectItem value="all_levels">Tous les niveaux</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {scope === 'specific_level' && (
              <div className="space-y-2">
                <Label>Niveau cible</Label>
                <Select value={levelId} onValueChange={setLevelId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un niveau" />
                  </SelectTrigger>
                  <SelectContent>
                    {sortedLevels.map((level) => (
                      <SelectItem key={level.id} value={level.id}>
                        {level.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Titre</Label>
              <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Titre affiché aux élèves" />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Contexte ou consigne courte"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Fichier {mediaType === 'video' ? 'vidéo' : 'audio'}</Label>
              <Input
                type="file"
                accept={mediaType === 'video' ? 'video/*' : 'audio/*'}
                onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
              />
              {selectedFile && (
                <p className="text-xs text-slate-500">
                  Fichier sélectionné : {selectedFile.name}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-slate-900">Marquer comme urgent</p>
                <p className="text-xs text-slate-500">Bloque le niveau tant que le média n’est pas terminé.</p>
              </div>
              <Switch checked={urgent} onCheckedChange={setUrgent} />
            </div>

            <Button
              onClick={() => void createMessage.mutateAsync()}
              disabled={createMessage.isPending || isUploading}
              className="w-full bg-blue-600 text-white hover:bg-blue-700"
            >
              {(createMessage.isPending || isUploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Publier le message public
            </Button>
          </div>

          <div className="space-y-4 rounded-2xl border border-slate-200 p-4">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Messages existants</h3>
              <p className="text-sm text-slate-500">Activez, désactivez ou supprimez un message.</p>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-10 text-sm text-slate-500">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Chargement...
              </div>
            ) : messages.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
                Aucun message public pour cette formation.
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((message) => (
                  <div key={message.id} className="rounded-2xl border border-slate-200 p-4">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <Badge variant={message.is_active ? 'default' : 'secondary'}>
                        {message.is_active ? 'Actif' : 'Désactivé'}
                      </Badge>
                      {message.urgent && <Badge variant="destructive">Urgent</Badge>}
                      <Badge variant="outline">{message.media_type === 'video' ? 'Vidéo' : 'Audio'}</Badge>
                      <Badge variant="outline">
                        {message.scope === 'all_levels'
                          ? 'Tous les niveaux'
                          : sortedLevels.find((level) => level.id === message.level_id)?.title || 'Niveau ciblé'}
                      </Badge>
                    </div>

                    <div className="space-y-1">
                      <p className="font-medium text-slate-900">
                        {message.title?.trim() || 'Message public sans titre'}
                      </p>
                      {message.description && (
                        <p className="text-sm text-slate-600">{message.description}</p>
                      )}
                    </div>

                    <div className="mt-3">
                      {message.media_type === 'video' ? (
                        <video src={message.media_url} controls className="max-h-52 w-full rounded-xl bg-black" />
                      ) : (
                        <audio src={message.media_url} controls className="w-full" />
                      )}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        onClick={() => toggleMessage.mutate({ id: message.id, isActive: !message.is_active })}
                        disabled={toggleMessage.isPending}
                      >
                        {message.is_active ? 'Désactiver' : 'Réactiver'}
                      </Button>
                      <Button
                        variant="outline"
                        className="text-red-600 hover:bg-red-50 hover:text-red-700"
                        onClick={() => deleteMessage.mutate(message.id)}
                        disabled={deleteMessage.isPending}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Supprimer
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PublicMessageManagerDialog;