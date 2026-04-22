import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Edit, Trash2, Plus, ScanBarcode } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import ProductImageUpload from './ProductImageUpload';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useUserRole } from '@/hooks/useAuth';
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';
import { CameraBarcodeScanner } from '@/components/shop/boutique/CameraBarcodeScanner';
import DynamicProductForm from '@/components/products/DynamicProductForm';
import { ProductFormData } from '@/types/product-form';

const ProductsManagement = () => {
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [productImages, setProductImages] = useState<File[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [barcodeValue, setBarcodeValue] = useState('');
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);
  const { uploadFile, isUploading } = useFileUpload();
  const { data: userRole, isLoading: isLoadingRole } = useUserRole();

  useBarcodeScanner(
    (barcode) => {
      setBarcodeValue(barcode);
      toast.success(`Code-barres scanne: ${barcode}`);
    },
    isCreateDialogOpen && !isCameraScannerOpen,
  );
  
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
      barcode?: string;
      delivery_available?: boolean;
      images?: File[];
    }) => {
      // Récupérer l'utilisateur actuel
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

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
          barcode: productData.barcode || null,
          delivery_available: productData.delivery_available,
          seller_id: user.id,
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
      setIsCreateDialogOpen(false);
      setBarcodeValue('');
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
    const barcode = (barcodeValue || (formData.get('barcode') as string) || '').trim();
    const delivery_available = formData.get('delivery_available') === 'on';

    // Récupérer le product_type depuis les données du type sélectionné
    const selectedProductType = productTypes?.find(type => type.id === selectedType);
    const productType: 'formation' | 'article' | 'service' = 
      selectedProductType?.name === 'formation' ? 'formation' :
      selectedProductType?.name === 'service' ? 'service' : 'article';

    console.log('Selected type:', selectedProductType, 'Product type:', productType);

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
      barcode: barcode || undefined,
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
    setBarcodeValue('');
    setProductImages([]);
  };

  const handleDelete = (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce produit ?')) {
      deleteProductMutation.mutate(id);
    }
  };

  const handleDynamicFormSubmit = (data: ProductFormData & { images?: File[] }) => {
    // Récupérer le product_type depuis les données du type sélectionné
    const selectedProductType = productTypes?.find(type => type.id === data.product_type_id);
    const productType: 'formation' | 'article' | 'service' = 
      selectedProductType?.name === 'formation' ? 'formation' :
      selectedProductType?.name === 'service' ? 'service' : 'article';

    createProductMutation.mutate({
      title: data.title,
      description: data.description,
      price: data.price,
      product_category_id: data.product_category_id,
      product_type_id: data.product_type_id,
      is_active: data.is_active,
      product_type: productType,
      characteristics: data.characteristics,
      stock: data.stock,
      condition: data.condition,
      size: data.size,
      color: data.color,
      barcode: data.barcode,
      delivery_available: data.delivery_available,
      images: data.images || productImages,
    });
  };

  if (isLoading || isLoadingRole) {
    return <div className="text-center py-8">Chargement des produits...</div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Gestion des produits</CardTitle>
        {userRole?.isAdmin && (
          <Dialog
            open={isCreateDialogOpen}
            onOpenChange={(open) => {
              setIsCreateDialogOpen(open);
              if (!open) {
                setBarcodeValue('');
                setIsCameraScannerOpen(false);
              }
            }}
          >
            <DialogTrigger asChild>
              <Button className="bg-[#25d366] hover:bg-[#25d366]/90">
                <Plus size={16} className="mr-2" />
                Nouveau produit
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Créer un nouveau produit</DialogTitle>
            </DialogHeader>
            <DynamicProductForm
              onSubmit={handleDynamicFormSubmit}
              onCancel={() => setIsCreateDialogOpen(false)}
              categories={categories || []}
              productTypes={productTypes || []}
              isLoading={isUploading}
            />
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

      {isCameraScannerOpen && (
        <CameraBarcodeScanner
          onClose={() => setIsCameraScannerOpen(false)}
          onScan={(barcode) => {
            setBarcodeValue(barcode);
            toast.success(`Code-barres scanne: ${barcode}`);
          }}
        />
      )}
    </Card>
  );
};

export default ProductsManagement;
