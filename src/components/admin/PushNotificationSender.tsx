/**
 * PushNotificationSender
 * Composant admin pour envoyer des notifications push personnalisées
 * à un ou plusieurs utilisateurs, ou à tous les utilisateurs.
 */
import React, { useState } from 'react';
import { Bell, Send, Users, User, Loader2, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { sendPushNotification } from '@/utils/notificationHelpers';

type TargetMode = 'all' | 'specific';

interface UserResult {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

const PushNotificationSender = () => {
  const [targetMode, setTargetMode] = useState<TargetMode>('all');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [clickAction, setClickAction] = useState('/');
  const [isSending, setIsSending] = useState(false);

  // Recherche d'utilisateurs
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserResult[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<UserResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const searchUsers = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(10);

      if (error) throw error;
      // Filtrer ceux déjà sélectionnés
      const filtered = (data || []).filter(
        (u) => !selectedUsers.some((s) => s.id === u.id)
      );
      setSearchResults(filtered);
    } catch {
      toast.error('Erreur lors de la recherche');
    } finally {
      setIsSearching(false);
    }
  };

  const addUser = (user: UserResult) => {
    setSelectedUsers((prev) => [...prev, user]);
    setSearchResults((prev) => prev.filter((u) => u.id !== user.id));
    setSearchQuery('');
  };

  const removeUser = (userId: string) => {
    setSelectedUsers((prev) => prev.filter((u) => u.id !== userId));
  };

  const handleSend = async () => {
    if (!title.trim()) {
      toast.error('Le titre est obligatoire');
      return;
    }
    if (targetMode === 'specific' && selectedUsers.length === 0) {
      toast.error('Sélectionnez au moins un utilisateur');
      return;
    }

    setIsSending(true);
    try {
      if (targetMode === 'all') {
        // Récupérer tous les user_id ayant un token actif
        const { data: tokens, error } = await supabase
          .from('push_tokens')
          .select('user_id')
          .eq('is_active', true);

        if (error) throw error;
        const userIds = [...new Set((tokens || []).map((t) => t.user_id))];

        if (userIds.length === 0) {
          toast.warning('Aucun utilisateur avec un token push actif');
          setIsSending(false);
          return;
        }

        await sendPushNotification({
          userIds,
          title: title.trim(),
          message: message.trim() || undefined,
          type: 'test',
          clickAction: clickAction.trim() || '/',
        });

        toast.success(`Notification envoyée à ${userIds.length} utilisateur(s)`);
      } else {
        const userIds = selectedUsers.map((u) => u.id);
        await sendPushNotification({
          userIds,
          title: title.trim(),
          message: message.trim() || undefined,
          type: 'test',
          clickAction: clickAction.trim() || '/',
        });

        toast.success(`Notification envoyée à ${userIds.length} utilisateur(s)`);
      }

      // Reset form
      setTitle('');
      setMessage('');
      setClickAction('/');
      setSelectedUsers([]);
    } catch (err) {
      console.error('Erreur envoi notification:', err);
      toast.error('Erreur lors de l\'envoi de la notification');
    } finally {
      setIsSending(false);
    }
  };

  const displayName = (u: UserResult) => {
    const name = [u.first_name, u.last_name].filter(Boolean).join(' ');
    return name || u.email || u.id.substring(0, 8);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Envoyer une notification push
          </CardTitle>
          <CardDescription>
            Envoyez une notification personnalisée à un ou plusieurs utilisateurs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Choix de la cible */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Destinataires</Label>
            <RadioGroup
              value={targetMode}
              onValueChange={(v) => setTargetMode(v as TargetMode)}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="all" />
                <Label htmlFor="all" className="flex items-center gap-1 cursor-pointer">
                  <Users className="h-4 w-4" />
                  Tous les utilisateurs
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="specific" id="specific" />
                <Label htmlFor="specific" className="flex items-center gap-1 cursor-pointer">
                  <User className="h-4 w-4" />
                  Utilisateurs spécifiques
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Recherche d'utilisateurs */}
          {targetMode === 'specific' && (
            <div className="space-y-3">
              <Label>Rechercher des utilisateurs</Label>
              <div className="relative">
                <Input
                  placeholder="Nom, prénom ou email..."
                  value={searchQuery}
                  onChange={(e) => searchUsers(e.target.value)}
                />
                {isSearching && (
                  <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>

              {/* Résultats de recherche */}
              {searchResults.length > 0 && (
                <div className="border rounded-md max-h-40 overflow-y-auto">
                  {searchResults.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => addUser(user)}
                      className="w-full text-left px-3 py-2 hover:bg-muted transition-colors text-sm border-b last:border-b-0"
                    >
                      <span className="font-medium">{displayName(user)}</span>
                      {user.email && (
                        <span className="text-muted-foreground ml-2 text-xs">{user.email}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Utilisateurs sélectionnés */}
              {selectedUsers.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedUsers.map((user) => (
                    <Badge key={user.id} variant="secondary" className="flex items-center gap-1 pr-1">
                      {displayName(user)}
                      <button
                        onClick={() => removeUser(user.id)}
                        className="ml-1 rounded-full hover:bg-destructive/20 p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Contenu de la notification */}
          <div className="space-y-3">
            <Label htmlFor="notif-title">Titre *</Label>
            <Input
              id="notif-title"
              placeholder="Ex: 📢 Nouvelle mise à jour disponible !"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
            />
          </div>

          <div className="space-y-3">
            <Label htmlFor="notif-message">Message</Label>
            <Textarea
              id="notif-message"
              placeholder="Ex: Découvrez les nouvelles fonctionnalités..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              maxLength={500}
            />
          </div>

          <div className="space-y-3">
            <Label htmlFor="notif-action">Lien de redirection</Label>
            <Input
              id="notif-action"
              placeholder="/ (page d'accueil par défaut)"
              value={clickAction}
              onChange={(e) => setClickAction(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Page vers laquelle l'utilisateur sera redirigé en cliquant sur la notification
            </p>
          </div>

          {/* Bouton d'envoi */}
          <Button
            onClick={handleSend}
            disabled={isSending || !title.trim()}
            className="w-full"
            size="lg"
          >
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Envoi en cours...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Envoyer la notification
                {targetMode === 'all' ? ' à tous' : selectedUsers.length > 0 ? ` à ${selectedUsers.length} utilisateur(s)` : ''}
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default PushNotificationSender;
