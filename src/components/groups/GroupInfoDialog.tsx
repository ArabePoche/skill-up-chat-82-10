import React from 'react';
import { Users, Calendar, Settings } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface GroupInfoDialogProps {
  open: boolean;
  onClose: () => void;
  group: any;
}

const GroupInfoDialog: React.FC<GroupInfoDialogProps> = ({ open, onClose, group }) => {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Informations du groupe</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Avatar et nom */}
          <div className="flex items-center space-x-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white text-2xl font-bold">
              {group?.name?.[0]?.toUpperCase() || 'G'}
            </div>
            <div>
              <h3 className="text-lg font-semibold">{group?.name || 'Groupe'}</h3>
              <p className="text-sm text-slate-500">{group?.description || 'Aucune description'}</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center space-x-2 rounded-lg bg-slate-50 p-3">
              <Users className="h-5 w-5 text-violet-500" />
              <div>
                <p className="text-sm font-medium">{group?.member_count || 0}</p>
                <p className="text-xs text-slate-500">Membres</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 rounded-lg bg-slate-50 p-3">
              <Calendar className="h-5 w-5 text-violet-500" />
              <div>
                <p className="text-sm font-medium">
                  {new Date(group?.created_at).toLocaleDateString('fr-FR')}
                </p>
                <p className="text-xs text-slate-500">Créé le</p>
              </div>
            </div>
          </div>

          {/* Type de groupe */}
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-sm font-medium">Type de groupe</p>
            <p className="text-sm text-slate-600">
              {group?.group_type === 'public' ? 'Public' : group?.group_type === 'private' ? 'Privé' : 'Limité'}
            </p>
          </div>

          {/* Description détaillée */}
          {group?.description && (
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-sm font-medium">Description</p>
              <p className="text-sm text-slate-600">{group.description}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GroupInfoDialog;
