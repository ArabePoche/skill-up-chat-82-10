/**
 * Composant affichant la liste des contacts trouvés sur la plateforme
 */
import { User, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface MatchingUser {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  phone_country_code: string | null;
}

interface ContactsListProps {
  users: MatchingUser[];
  onStartConversation: (userId: string) => void;
}

export const ContactsList = ({ users, onStartConversation }: ContactsListProps) => {
  if (users.length === 0) {
    return (
      <div className="text-center py-8">
        <User className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">
          Aucun de vos contacts n'utilise encore la plateforme
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {users.map((user) => (
        <div
          key={user.id}
          className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">
                {user.first_name && user.last_name
                  ? `${user.first_name} ${user.last_name}`
                  : user.first_name || user.last_name || 'Utilisateur'}
              </p>
              <p className="text-sm text-muted-foreground">
                {user.phone_country_code} {user.phone}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => onStartConversation(user.id)}
            className="gap-2"
          >
            <MessageCircle className="h-4 w-4" />
            Discuter
          </Button>
        </div>
      ))}
    </div>
  );
};
