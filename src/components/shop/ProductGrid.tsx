
import React from 'react';
import ProductCard from './ProductCard';
import { useTranslation } from 'react-i18next';

interface Product {
  id: string;
  title: string;
  description?: string;
  image_url?: string;
  price: number;
  original_price?: number;
  discount_percentage?: number;
  rating?: number;
  product_type: string;
  profiles?: {
    first_name?: string;
    last_name?: string;
    username?: string;
  };
}

interface ProductGridProps {
  products: Product[];
  user: any;
  onAddToCart?: (productId: string) => void;
}

const ProductGrid: React.FC<ProductGridProps> = ({ products, user, onAddToCart }) => {
  const { t } = useTranslation();
  
  if (products.length === 0) {
    return (
      <div className="text-center py-8 sm:py-12">
        <p className="text-gray-500 text-sm sm:text-base">{t('shop.noProductsFound')}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-4 px-2 sm:px-0">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          user={user}
          onAddToCart={onAddToCart}
        />
      ))}
    </div>
  );
};

export default ProductGrid;
