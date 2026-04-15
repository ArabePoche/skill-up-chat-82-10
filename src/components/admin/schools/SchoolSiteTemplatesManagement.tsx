/**
 * Gestion des modèles de sites scolaires premium par les administrateurs.
 * Permet de créer, modifier, activer/désactiver et définir le prix en SC des templates.
 */
import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, LayoutTemplate, Coins, Eye, EyeOff, Loader2, Upload, X, Image } from 'lucide-react';

interface SiteTemplate {
  id: string;
  name: string;
  description: string | null;
  thumbnail_url: string | null;
  theme_config: any;
  price_sc: number;
  is_active: boolean;
  template_key: string | null;
  created_at: string;
}

type TemplateForm = {
  name: string;
  description: string;
  thumbnail_url: string;
  price_sc: number;
  is_active: boolean;
  template_key: string;
};

const emptyForm: TemplateForm = {
  name: '',
  description: '',
  thumbnail_url: '',
  price_sc: 0,
  is_active: true,
  template_key: '',
};

export default function SchoolSiteTemplatesManagement() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TemplateForm>(emptyForm);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['admin-school-site-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('school_site_templates')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as SiteTemplate[];
    },
  });

  // Upload de miniature vers Supabase Storage
  const handleThumbnailUpload = async (file: File) => {
    try {
      setUploading(true);
      const ext = file.name.split('.').pop();
      const fileName = `template-${Date.now()}.${ext}`;
      const filePath = `thumbnails/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('school-templates')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('school-templates')
        .getPublicUrl(filePath);

      setForm(prev => ({ ...prev, thumbnail_url: urlData.publicUrl }));
      toast.success('Image uploadée avec succès.');
    } catch (err: any) {
      console.error('Upload error:', err);
      toast.error('Erreur lors de l\'upload de l\'image.');
    } finally {
      setUploading(false);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async (data: TemplateForm & { id?: string }) => {
      const payload = {
        name: data.name,
        description: data.description || null,
        thumbnail_url: data.thumbnail_url || null,
        price_sc: data.price_sc,
        is_active: data.is_active,
        theme_config: {},
        template_key: data.template_key.trim() || null,
      };

      if (data.id) {
        const { error } = await supabase
          .from('school_site_templates')
          .update(payload)
          .eq('id', data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('school_site_templates')
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingId ? 'Modèle mis à jour.' : 'Modèle créé.');
      queryClient.invalidateQueries({ queryKey: ['admin-school-site-templates'] });
      closeDialog();
    },
    onError: (err: any) => toast.error(err.message || 'Erreur'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('school_site_templates').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Modèle supprimé.');
      queryClient.invalidateQueries({ queryKey: ['admin-school-site-templates'] });
    },
    onError: () => toast.error('Erreur lors de la suppression.'),
  });

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (t: SiteTemplate) => {
    setEditingId(t.id);
    setForm({
      name: t.name,
      description: t.description || '',
      thumbnail_url: t.thumbnail_url || '',
      price_sc: t.price_sc,
      is_active: t.is_active,
      template_key: t.template_key || '',
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Le nom est requis.');
    saveMutation.mutate({ ...form, id: editingId || undefined });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <LayoutTemplate className="h-6 w-6" />
            Modèles de sites scolaires
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Gérez les templates premium achetables en Soumboulah Cash
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau modèle
        </Button>
      </div>

      {templates.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            Aucun modèle de site créé pour le moment.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((t) => (
            <Card key={t.id} className={!t.is_active ? 'opacity-60' : ''}>
              {t.thumbnail_url && (
                <div className="aspect-[9/16] overflow-hidden rounded-t-lg">
                  <img src={t.thumbnail_url} alt={t.name} className="w-full h-full object-cover" />
                </div>
              )}
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{t.name}</CardTitle>
                  <Badge variant={t.is_active ? 'default' : 'secondary'}>
                    {t.is_active ? <><Eye className="h-3 w-3 mr-1" /> Actif</> : <><EyeOff className="h-3 w-3 mr-1" /> Inactif</>}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {t.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{t.description}</p>
                )}
                <div className="flex items-center gap-1 text-sm font-semibold">
                  <Coins className="h-4 w-4 text-amber-500" />
                  {t.price_sc === 0 ? 'Gratuit' : `${t.price_sc} SC`}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(t)}>
                    <Pencil className="h-3 w-3 mr-1" /> Modifier
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      if (confirm('Supprimer ce modèle ?')) deleteMutation.mutate(t.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3 mr-1" /> Supprimer
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Modifier le modèle' : 'Nouveau modèle de site'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nom *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Clé du template (slug unique : default, modern, pro)</Label>
              <Input value={form.template_key} onChange={(e) => setForm({ ...form, template_key: e.target.value })} placeholder="modern" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
            </div>

            {/* Upload de miniature */}
            <div className="space-y-2">
              <Label>Image de miniature</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleThumbnailUpload(file);
                }}
              />
              {form.thumbnail_url ? (
                <div className="relative rounded-lg overflow-hidden border aspect-[9/16]">
                  <img src={form.thumbnail_url} alt="Miniature" className="w-full h-full object-cover" />
                  <div className="absolute top-2 right-2 flex gap-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="secondary"
                      className="h-8 w-8"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="destructive"
                      className="h-8 w-8"
                      onClick={() => setForm({ ...form, thumbnail_url: '' })}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-full aspect-[9/16] max-h-64 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                >
                  {uploading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    <>
                      <Image className="h-8 w-8" />
                      <span className="text-sm text-center px-4">Cliquez pour uploader une image (format mobile vertical recommandé)</span>
                    </>
                  )}
                </button>
              )}
            </div>

            <div className="space-y-2">
              <Label>Prix (SC)</Label>
              <Input type="number" min={0} value={form.price_sc} onChange={(e) => setForm({ ...form, price_sc: Number(e.target.value) })} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              <Label>Actif (visible par les écoles)</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>Annuler</Button>
              <Button type="submit" disabled={saveMutation.isPending || uploading}>
                {saveMutation.isPending ? 'Enregistrement...' : editingId ? 'Mettre à jour' : 'Créer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
