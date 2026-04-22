import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import DynamicField from './DynamicField';
import ProductImageUpload from '@/components/admin/ProductImageUpload';
import { getSectorConfig, getAvailableSectors } from '@/config/product-sectors';
import { ProductFormData, FieldConfig } from '@/types/product-form';
import { toast } from 'sonner';

interface DynamicProductFormProps {
  onSubmit: (data: ProductFormData & { images?: File[] }) => void;
  onCancel?: () => void;
  initialData?: Partial<ProductFormData>;
  categories?: Array<{ id: string; name: string }>;
  productTypes?: Array<{ id: string; name: string; label?: string }>;
  isLoading?: boolean;
}

const DynamicProductForm: React.FC<DynamicProductFormProps> = ({
  onSubmit,
  onCancel,
  initialData,
  categories = [],
  productTypes = [],
  isLoading = false,
}) => {
  const [selectedSector, setSelectedSector] = useState<string>('default');
  const [selectedCategory, setSelectedCategory] = useState<string>(initialData?.product_category_id || '');
  const [selectedType, setSelectedType] = useState<string>(initialData?.product_type_id || '');
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sectorConfig, setSectorConfig] = useState(getSectorConfig('default'));
  const [productImages, setProductImages] = useState<File[]>([]);

  // Mettre à jour la configuration quand le secteur change
  useEffect(() => {
    const config = getSectorConfig(selectedSector);
    setSectorConfig(config);
    
    // Réinitialiser les données dynamiques
    const dynamicData: Record<string, any> = {};
    config.fields.forEach(field => {
      if (field.defaultValue !== undefined) {
        dynamicData[field.name] = field.defaultValue;
      }
    });
    setFormData(dynamicData);
    setErrors({});
  }, [selectedSector]);

  // Gérer le changement des champs dynamiques
  const handleDynamicFieldChange = (name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Effacer l'erreur si elle existe
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // Valider un champ
  const validateField = (field: FieldConfig): string | null => {
    const value = formData[field.name];
    
    // Validation requise
    if (field.required && (value === undefined || value === null || value === '')) {
      return `${field.label} est requis`;
    }
    
    // Validation personnalisée
    if (field.validation) {
      return field.validation(value);
    }
    
    return null;
  };

  // Valider tous les champs
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    let isValid = true;
    
    sectorConfig.fields.forEach(field => {
      const error = validateField(field);
      if (error) {
        newErrors[field.name] = error;
        isValid = false;
      }
    });
    
    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCategory) {
      toast.error('Veuillez sélectionner une catégorie');
      return;
    }
    
    if (!selectedType) {
      toast.error('Veuillez sélectionner un type de produit');
      return;
    }
    
    // Valider les champs dynamiques
    if (!validateForm()) {
      toast.error('Veuillez corriger les erreurs dans le formulaire');
      return;
    }
    
    // Récupérer les données du formulaire standard
    const formElement = e.target as HTMLFormElement;
    const standardFormData = new FormData(formElement);
    
    const productData: ProductFormData & { images?: File[] } = {
      title: standardFormData.get('title') as string,
      description: standardFormData.get('description') as string,
      price: parseFloat(standardFormData.get('price') as string) || 0,
      stock: parseInt(standardFormData.get('stock') as string) || 0,
      barcode: (standardFormData.get('barcode') as string) || undefined,
      product_category_id: selectedCategory,
      product_type_id: selectedType,
      is_active: standardFormData.get('is_active') === 'on',
      delivery_available: standardFormData.get('delivery_available') === 'on',
      
      // Fusionner avec les données dynamiques du secteur
      ...formData,
      
      // Ajouter les images
      images: productImages,
    };
    
    onSubmit(productData);
  };

  const availableSectors = getAvailableSectors();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Créer un nouveau produit</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6 max-h-[70vh] overflow-y-auto px-1">
          {/* Sélecteur de secteur */}
          <div>
            <label className="block text-sm font-medium mb-2">Secteur d'activité</label>
            <Select value={selectedSector} onValueChange={setSelectedSector}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un secteur" />
              </SelectTrigger>
              <SelectContent>
                {availableSectors.map((sector) => (
                  <SelectItem key={sector.id} value={sector.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{sector.name}</span>
                      <span className="text-xs text-gray-500">{sector.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Champs standards */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nom *</label>
              <Input name="title" required defaultValue={initialData?.title} />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Description *</label>
              <Textarea name="description" required defaultValue={initialData?.description} rows={3} />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Prix (€) *</label>
                <Input name="price" type="number" min="0" step="0.01" required defaultValue={initialData?.price} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Stock</label>
                <Input name="stock" type="number" min="0" defaultValue={initialData?.stock || 0} />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Code-barres</label>
              <Input name="barcode" placeholder="Scannez avec la douchette ou saisissez le code" defaultValue={initialData?.barcode} />
            </div>
          </div>

          {/* Catégorie et type de produit */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Catégorie *</label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une catégorie" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Type de produit *</label>
              <Select value={selectedType} onValueChange={setSelectedType} disabled={!selectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder={!selectedCategory ? "Sélectionnez d'abord une catégorie" : "Sélectionner un type"} />
                </SelectTrigger>
                <SelectContent>
                  {productTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.label || type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Champs dynamiques selon le secteur */}
          {sectorConfig.fields.length > 0 && (
            <div className="space-y-4 pt-4 border-t">
              <h3 className="text-sm font-semibold text-gray-700">
                Caractéristiques {sectorConfig.name.toLowerCase()}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sectorConfig.fields.map((field) => (
                  <DynamicField
                    key={field.name}
                    config={field}
                    value={formData[field.name]}
                    onChange={handleDynamicFieldChange}
                    formData={formData}
                    error={errors[field.name]}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Upload d'images */}
          <div className="space-y-4 pt-4 border-t">
            <ProductImageUpload
              images={productImages}
              onImagesChange={setProductImages}
              maxImages={5}
            />
          </div>

          {/* Options supplémentaires */}
          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center space-x-2">
              <input type="checkbox" name="delivery_available" id="delivery_available" defaultChecked={initialData?.delivery_available} />
              <label htmlFor="delivery_available" className="text-sm font-medium">
                Livraison disponible
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <input type="checkbox" name="is_active" id="is_active" defaultChecked={initialData?.is_active !== false} />
              <label htmlFor="is_active" className="text-sm font-medium">
                Produit actif
              </label>
            </div>
          </div>

          {/* Boutons d'action */}
          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1" disabled={isLoading}>
              {isLoading ? 'Création en cours...' : 'Créer le produit'}
            </Button>
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
                Annuler
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default DynamicProductForm;
