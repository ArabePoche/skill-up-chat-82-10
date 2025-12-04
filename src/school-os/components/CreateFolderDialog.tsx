/**
 * Dialog pour créer un nouveau dossier sur le bureau
 * Permet de choisir le nom, la couleur et la visibilité (privé/public)
 */
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Folder, Lock, Globe } from 'lucide-react';

const FOLDER_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
  '#8B5CF6', '#EC4899', '#06B6D4', '#F97316',
];

interface CreateFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateFolder: (name: string, color: string, isPublic: boolean) => void;
}

export const CreateFolderDialog: React.FC<CreateFolderDialogProps> = ({
  open,
  onOpenChange,
  onCreateFolder,
}) => {
  const [name, setName] = useState('Nouveau dossier');
  const [selectedColor, setSelectedColor] = useState(FOLDER_COLORS[0]);
  const [isPublic, setIsPublic] = useState(false);

  const handleCreate = () => {
    if (name.trim()) {
      onCreateFolder(name.trim(), selectedColor, isPublic);
      setName('Nouveau dossier');
      setSelectedColor(FOLDER_COLORS[0]);
      setIsPublic(false);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Folder className="w-5 h-5" />
            Créer un dossier
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="folder-name">Nom du dossier</Label>
            <Input
              id="folder-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nom du dossier"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
          </div>

          <div className="space-y-2">
            <Label>Couleur</Label>
            <div className="flex flex-wrap gap-2">
              {FOLDER_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={`w-8 h-8 rounded-lg transition-all ${
                    selectedColor === color
                      ? 'ring-2 ring-offset-2 ring-primary scale-110'
                      : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Option visibilité */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
            <div className="flex items-center gap-3">
              {isPublic ? (
                <Globe className="w-5 h-5 text-green-500" />
              ) : (
                <Lock className="w-5 h-5 text-orange-500" />
              )}
              <div>
                <p className="font-medium text-sm">
                  {isPublic ? 'Dossier public' : 'Dossier privé'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isPublic 
                    ? 'Visible par tous les membres' 
                    : 'Visible uniquement par vous'}
                </p>
              </div>
            </div>
            <Switch
              checked={isPublic}
              onCheckedChange={setIsPublic}
            />
          </div>

          <div className="flex justify-center pt-4">
            <div className="relative">
              <div 
                className="w-20 h-20 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${selectedColor}20` }}
              >
                <Folder 
                  className="w-12 h-12" 
                  style={{ color: selectedColor }}
                  fill={selectedColor}
                  fillOpacity={0.3}
                />
              </div>
              {/* Badge visibilité */}
              <div className={`absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center ${
                isPublic ? 'bg-green-500' : 'bg-orange-500'
              }`}>
                {isPublic ? (
                  <Globe className="w-3.5 h-3.5 text-white" />
                ) : (
                  <Lock className="w-3.5 h-3.5 text-white" />
                )}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleCreate} disabled={!name.trim()}>
            Créer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};