
import React, { useState } from 'react';
import ProductCard from './ProductCard';
import ProductDetailsModal from './ProductDetailsModal';
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
  product_media?: Array<{
    media_url: string;
    display_order: number;
  }>;
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
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  // Filtrer les produits similaires (même type, exclure le produit sélectionné)
  const getSimilarProducts = (product: Product) => {
    return products
      .filter(p => p.id !== product.id && p.product_type === product.product_type)
      .slice(0, 4);
  };
  
  if (products.length === 0) {
    return (
      <div className="text-center py-8 sm:py-12">
        <p className="text-gray-500 text-sm sm:text-base">{t('shop.noProductsFound')}</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-4 px-2 sm:px-0">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            user={user}
            onAddToCart={onAddToCart}
            onClick={(product) => setSelectedProduct(product)}
          />
        ))}
      </div>

      <ProductDetailsModal
        product={selectedProduct}
        isOpen={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        user={user}
        onAddToCart={onAddToCart}
        similarProducts={selectedProduct ? getSimilarProducts(selectedProduct) : []}
      />
    </>
  );
};

export default ProductGrid;
