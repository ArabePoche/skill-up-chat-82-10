
import React from 'react';
import { ShoppingCart, Star, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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

interface ProductCardProps {
  product: Product;
  user: any;
  onAddToCart?: (productId: string) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, user, onAddToCart }) => {
  const formatAuthorName = (profile: any) => {
    if (!profile) return 'Auteur inconnu';
    const firstName = profile.first_name || '';
    const lastName = profile.last_name || '';
    return `${firstName} ${lastName}`.trim() || profile.username || 'Auteur inconnu';
  };

  const discountedPrice = product.original_price && product.discount_percentage
    ? product.original_price * (1 - product.discount_percentage / 100)
    : product.price;

  return (
    <Card className="group hover:shadow-xl transition-all duration-300 bg-white border border-gray-200 hover:border-orange-300 relative">
      {/* Badge promo */}
      {product.discount_percentage && (
        <Badge className="absolute top-2 left-2 z-10 bg-red-500 text-white">
          -{product.discount_percentage}%
        </Badge>
      )}

      {/* Bouton favoris */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 z-10 bg-white/80 hover:bg-white text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Heart size={16} />
      </Button>

      <CardHeader className="p-0">
        <div className="relative overflow-hidden">
          <div className="w-full h-48 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
            {product.image_url ? (
              <img 
                src={product.image_url} 
                alt={product.title || 'Produit'}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <span className="text-gray-400">Image produit</span>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4">
        <div className="mb-2">
          <Badge variant="outline" className="text-xs">
            {product.product_type === 'formation' ? 'Formation' : 
             product.product_type === 'article' ? 'Article' : 'Service'}
          </Badge>
        </div>

        <h3 className="font-medium text-sm mb-2 line-clamp-2 text-gray-900 group-hover:text-blue-600 transition-colors">
          {product.title || 'Titre non disponible'}
        </h3>

        <p className="text-xs text-gray-600 mb-2">
          par {formatAuthorName(product.profiles)}
        </p>

        {/* Notes */}
        {product.rating && (
          <div className="flex items-center mb-2">
            <div className="flex mr-1">
              {[...Array(5)].map((_, i) => (
                <Star 
                  key={i} 
                  size={12} 
                  className={`${i < Math.floor(product.rating || 0) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                />
              ))}
            </div>
            <span className="text-xs text-gray-500">({product.rating})</span>
          </div>
        )}

        {/* Prix */}
        <div className="flex items-center space-x-2 mb-3">
          <span className="text-lg font-bold text-gray-900">
            {Math.round(discountedPrice || 0)}€
          </span>
          {product.original_price && product.discount_percentage && (
            <span className="text-sm text-gray-500 line-through">
              {product.original_price}€
            </span>
          )}
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-0">
        <Button 
          className="w-full bg-orange-500 hover:bg-orange-600 text-white"
          disabled={!user}
          onClick={() => onAddToCart?.(product.id)}
        >
          <ShoppingCart size={16} className="mr-2" />
          {!user ? 'Connectez-vous' : 'Ajouter au panier'}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ProductCard;
