
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Edit, Trash2, Plus } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const ProductsManagement = () => {
  const queryClient = useQueryClient();

  const { data: products, isLoading } = useQuery({
    queryKey: ['admin-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    }
  });

  const createProductMutation = useMutation({
    mutationFn: async (productData: {
      title: string;
      description: string;
      price: number;
      category_id: string;
      image_url: string;
      is_active: boolean;
      product_type: 'formation' | 'article' | 'service';
    }) => {
      const { data, error } = await supabase
        .from('products')
        .insert(productData)
        .select()
        .single();

      if (error) throw error;
      return { id: data.id, data };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast.success('Produit créé avec succès');
    },
    onError: (error) => {
      toast.error('Erreur lors de la création du produit');
      console.error(error);
    }
  });

  const updateProductMutation = useMutation({
    mutationFn: async (params: {
      id: string;
      data: {
        title: string;
        description: string;
        price: number;
        category_id: string;
        image_url: string;
        is_active: boolean;
        product_type: 'formation' | 'article' | 'service';
      };
    }) => {
      const { error } = await supabase
        .from('products')
        .update(params.data)
        .eq('id', params.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast.success('Produit mis à jour avec succès');
    },
    onError: (error) => {
      toast.error('Erreur lors de la mise à jour du produit');
      console.error(error);
    }
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast.success('Produit supprimé avec succès');
    },
    onError: (error) => {
      toast.error('Erreur lors de la suppression du produit');
      console.error(error);
    }
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>, isEdit = false, productId?: string) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const price = parseFloat(formData.get('price') as string) || 0;
    const category_id = formData.get('category') as string;
    const image_url = formData.get('image_url') as string;
    const is_active = formData.get('is_active') === 'true';
    const product_type = formData.get('product_type') as 'formation' | 'article' | 'service';

    const productData = {
      title,
      description,
      price,
      category_id,
      image_url,
      is_active,
      product_type
    };

    if (isEdit && productId) {
      updateProductMutation.mutate({ id: productId, data: productData });
    } else {
      createProductMutation.mutate(productData);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce produit ?')) {
      deleteProductMutation.mutate(id);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Chargement des produits...</div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Gestion des produits</CardTitle>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="bg-[#25d366] hover:bg-[#25d366]/90">
              <Plus size={16} className="mr-2" />
              Nouveau produit
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Créer un nouveau produit</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => handleSubmit(e)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nom</label>
                <Input name="title" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <Textarea name="description" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Prix (€)</label>
                <Input name="price" type="number" min="0" step="0.01" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Catégorie</label>
                <Input name="category" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">URL de l'image</label>
                <Input name="image_url" type="url" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Type de produit</label>
                <select name="product_type" className="w-full border border-gray-300 rounded px-3 py-2" required>
                  <option value="formation">Formation</option>
                  <option value="article">Article</option>
                  <option value="service">Service</option>
                </select>
              </div>
              <div className="flex items-center space-x-2">
                <input type="checkbox" name="is_active" id="is_active" defaultChecked />
                <label htmlFor="is_active" className="text-sm font-medium">Produit actif</label>
              </div>
              <Button type="submit" className="w-full">
                Créer le produit
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Catégorie</TableHead>
              <TableHead>Prix</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products?.map((product) => (
              <TableRow key={product.id}>
                <TableCell className="font-medium">{product.title || 'N/A'}</TableCell>
                <TableCell>{product.category_id || 'N/A'}</TableCell>
                <TableCell>{product.price ? `${product.price}€` : 'N/A'}</TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {product.product_type === 'formation' ? 'Formation' : 
                     product.product_type === 'article' ? 'Article' : 'Service'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={product.is_active ? 'default' : 'destructive'}>
                    {product.is_active ? 'Actif' : 'Inactif'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button size="sm" variant="outline">
                      <Edit size={14} />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(product.id)}
                      className="text-red-600"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default ProductsManagement;
