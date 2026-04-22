/**
 * Types pour le système de formulaire produit dynamique par secteur
 */

export type FieldType = 
  | 'text'
  | 'number'
  | 'date'
  | 'select'
  | 'boolean'
  | 'textarea'
  | 'multiselect';

export interface FieldConfig {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
  defaultValue?: any;
  validation?: (value: any) => string | null;
  conditional?: {
    field: string;
    value: any;
  };
}

export interface SectorConfig {
  id: string;
  name: string;
  description: string;
  icon?: string;
  fields: FieldConfig[];
}

export type ProductSector = 
  | 'default'
  | 'pharmaceutical'
  | 'food'
  | 'clothing'
  | 'electronics'
  | 'school_supplies'
  | 'hardware'
  | 'services';

export interface ProductFormData {
  // Champs communs
  title: string;
  description: string;
  price: number;
  stock?: number;
  barcode?: string;
  product_category_id: string;
  product_type_id: string;
  is_active: boolean;
  delivery_available?: boolean;
  
  // Champs dynamiques selon le secteur
  [key: string]: any;
}
