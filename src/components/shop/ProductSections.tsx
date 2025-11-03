/**
 * Composant gérant l'affichage des produits en sections
 * - Recommandés selon centres d'intérêt
 * - Découvertes (tous les autres produits)
 */

import React, { useState } from 'react';
import ProductCard from './ProductCard';
import ProductDetailsModal from './ProductDetailsModal';
import { Badge } from '@/components/ui/badge';
import { Star, Sparkles } from 'lucide-react';
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

interface ProductSectionsProps {
  products: Product[];
  user: any;
  onAddToCart?: (productId: string) => void;
  userInterests?: string[];
}

const ProductSections: React.FC<ProductSectionsProps> = ({
  products,
  user,
  onAddToCart,
  userInterests = []
}) => {
  const { t } = useTranslation();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Produits recommandés basés sur les centres d'intérêt
  const recommendedProducts = products.filter(product => {
    if (userInterests.length === 0) return false;
    
    const productText = `${product.title} ${product.description || ''} ${product.product_type}`.toLowerCase();
    return userInterests.some(interest => 
      productText.includes(interest.toLowerCase())
    );
  }).slice(0, 8); // Limiter à 8 recommandations

  // Produits découvertes (tous les autres)
  const discoveryProducts = products.filter(product => 
    !recommendedProducts.find(r => r.id === product.id)
  );

  // Filtrer les produits similaires
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
      <div className="space-y-8">
        {/* Section Recommandés */}
        {recommendedProducts.length > 0 && (
          <section>
            <div className="flex items-center space-x-2 mb-6">
              <Star className="text-yellow-500" size={24} />
              <h2 className="text-2xl font-bold text-gray-900">{t('shop.recommendedForYou')}</h2>
              <Badge variant="secondary">{t('shop.basedOnInterests')}</Badge>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-4 px-2 sm:px-0">
              {recommendedProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  user={user}
                  onAddToCart={onAddToCart}
                  onClick={(product) => setSelectedProduct(product)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Section Découvertes */}
        {discoveryProducts.length > 0 && (
          <section>
            <div className="flex items-center space-x-2 mb-6">
              <Sparkles className="text-purple-500" size={24} />
              <h2 className="text-2xl font-bold text-gray-900">{t('shop.discoveries')}</h2>
              <Badge variant="outline">{discoveryProducts.length} {t('shop.products')}</Badge>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-4 px-2 sm:px-0">
              {discoveryProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  user={user}
                  onAddToCart={onAddToCart}
                  onClick={(product) => setSelectedProduct(product)}
                />
              ))}
            </div>
          </section>
        )}
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

export default ProductSections;
