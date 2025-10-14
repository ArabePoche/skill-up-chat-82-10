import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Edit, Trash2, Plus } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import ProductImageUpload from './ProductImageUpload';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useUserRole } from '@/hooks/useAuth';

const ProductsManagement = () => {
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [productImages, setProductImages] = useState<File[]>([]);
  const { uploadFile, isUploading } = useFileUpload();
  const { data: userRole, isLoading: isLoadingRole } = useUserRole();
  
  // Récupérer les catégories
  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ['product-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_categories')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Récupérer les types filtrés par catégorie
  const { data: productTypes, isLoading: typesLoading } = useQuery({
    queryKey: ['product-types', selectedCategory],
    queryFn: async () => {
      if (!selectedCategory) return [];
      const { data, error } = await supabase
        .from('product_types')
        .select('*')
        .eq('category_id', selectedCategory)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCategory,
  });

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
      product_category_id: string;
      product_type_id: string;
      is_active: boolean;
      product_type: 'formation' | 'article' | 'service';
      characteristics?: string;
      stock?: number;
      condition?: 'new' | 'used';
      size?: string;
      color?: string;
      delivery_available?: boolean;
      images?: File[];
    }) => {
      // Créer le produit
      const { data: product, error: productError } = await supabase
        .from('products')
        .insert({
          title: productData.title,
          description: productData.description,
          price: productData.price,
          product_category_id: productData.product_category_id,
          product_type_id: productData.product_type_id,
          is_active: productData.is_active,
          product_type: productData.product_type,
          characteristics: productData.characteristics,
          stock: productData.stock,
          condition: productData.condition,
          size: productData.size,
          color: productData.color,
          delivery_available: productData.delivery_available,
        })
        .select()
        .single();

      if (productError) throw productError;

      // Upload des images si présentes
      if (productData.images && productData.images.length > 0) {
        const uploadPromises = productData.images.map(async (file, index) => {
          const uploadResult = await uploadFile(file, 'product-images');
          
          return supabase
            .from('product_media')
            .insert({
              product_id: product.id,
              media_url: uploadResult.fileUrl,
              media_type: 'image',
              display_order: index,
            });
        });

        await Promise.all(uploadPromises);
      }

      return { id: product.id, data: product };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast.success('Produit créé avec succès');
      setProductImages([]);
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
    
    if (!selectedCategory) {
      toast.error('Veuillez sélectionner une catégorie');
      return;
    }
    
    if (!selectedType) {
      toast.error('Veuillez sélectionner un type de produit');
      return;
    }
    
    const formData = new FormData(event.currentTarget);
    
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const price = parseFloat(formData.get('price') as string) || 0;
    const is_active = formData.get('is_active') === 'on';
    const characteristics = formData.get('characteristics') as string;
    const stock = parseInt(formData.get('stock') as string) || 0;
    const condition = formData.get('condition') as 'new' | 'used';
    const size = formData.get('size') as string;
    const color = formData.get('color') as string;
    const delivery_available = formData.get('delivery_available') === 'on';

    // Déterminer le product_type basé sur le type sélectionné
    const productType: 'formation' | 'article' | 'service' = 
      selectedType.toLowerCase().includes('formation') ? 'formation' :
      selectedType.toLowerCase().includes('service') ? 'service' : 'article';

    const productData = {
      title,
      description,
      price,
      product_category_id: selectedCategory,
      product_type_id: selectedType,
      is_active,
      product_type: productType,
      characteristics,
      stock,
      condition,
      size,
      color,
      delivery_available,
      images: productImages,
    };

    if (isEdit && productId) {
      updateProductMutation.mutate({ id: productId, data: productData as any });
    } else {
      createProductMutation.mutate(productData);
    }
    
    // Reset après soumission
    setSelectedCategory('');
    setSelectedType('');
    setProductImages([]);
  };

  const handleDelete = (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce produit ?')) {
      deleteProductMutation.mutate(id);
    }
  };

  if (isLoading || isLoadingRole) {
    return <div className="text-center py-8">Chargement des produits...</div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Gestion des produits</CardTitle>
        {userRole?.isAdmin && (
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
            <form onSubmit={(e) => handleSubmit(e)} className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
              <div>
                <label className="block text-sm font-medium mb-1">Nom</label>
                <Input name="title" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <Textarea name="description" required />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Prix (€)</label>
                  <Input name="price" type="number" min="0" step="0.01" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Stock</label>
                  <Input name="stock" type="number" min="0" defaultValue="0" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Catégorie</label>
                <Select 
                  value={selectedCategory} 
                  onValueChange={(value) => {
                    setSelectedCategory(value);
                    setSelectedType(''); // Reset type quand catégorie change
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une catégorie" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoriesLoading ? (
                      <SelectItem value="loading" disabled>Chargement...</SelectItem>
                    ) : categories && categories.length > 0 ? (
                      categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="empty" disabled>Aucune catégorie disponible</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Type de produit</label>
                <Select 
                  value={selectedType} 
                  onValueChange={setSelectedType}
                  disabled={!selectedCategory}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={
                      !selectedCategory 
                        ? "Sélectionnez d'abord une catégorie" 
                        : "Sélectionner un type"
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {typesLoading ? (
                      <SelectItem value="loading" disabled>Chargement...</SelectItem>
                    ) : productTypes && productTypes.length > 0 ? (
                      productTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.label || type.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="empty" disabled>Aucun type disponible pour cette catégorie</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Taille</label>
                  <Input name="size" placeholder="Ex: M, L, XL" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Couleur</label>
                  <Input name="color" placeholder="Ex: Bleu, Rouge" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">État</label>
                <Select name="condition" defaultValue="new">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">Neuf</SelectItem>
                    <SelectItem value="used">Seconde main</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Caractéristiques</label>
                <Textarea 
                  name="characteristics" 
                  placeholder="Décrivez les caractéristiques du produit..."
                  rows={3}
                />
              </div>

              <ProductImageUpload
                images={productImages}
                onImagesChange={setProductImages}
                maxImages={5}
              />

              <div className="space-y-3 pt-2">
                <div className="flex items-center space-x-2">
                  <input type="checkbox" name="delivery_available" id="delivery_available" />
                  <label htmlFor="delivery_available" className="text-sm font-medium">
                    Livraison disponible
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <input type="checkbox" name="is_active" id="is_active" defaultChecked />
                  <label htmlFor="is_active" className="text-sm font-medium">
                    Produit actif
                  </label>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={isUploading}
              >
                {isUploading ? 'Upload en cours...' : 'Créer le produit'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
        )}
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
