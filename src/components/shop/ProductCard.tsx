
import React, { useState, useCallback } from 'react';
import { ShoppingCart, Star, Heart, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import useEmblaCarousel from 'embla-carousel-react';

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

interface ProductCardProps {
  product: Product;
  user: any;
  onAddToCart?: (productId: string) => void;
  onClick?: (product: Product) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, user, onAddToCart, onClick }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, skipSnaps: false });
  
  // Récupérer toutes les images disponibles
  const images = product.product_media?.map(m => m.media_url) || 
                 (product.image_url ? [product.image_url] : []);
  
  const hasMultipleImages = images.length > 1;
  
  const scrollPrev = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCurrentImageIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  React.useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, onSelect]);
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
    <Card 
      className="group hover:shadow-xl transition-all duration-300 bg-white border border-gray-200 hover:border-orange-300 relative cursor-pointer"
      onClick={() => onClick?.(product)}
    >
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
          <div ref={emblaRef} className="overflow-hidden w-full h-48">
            <div className="flex">
              {images.length > 0 ? (
                images.map((image, index) => (
                  <div key={index} className="flex-[0_0_100%] min-w-0">
                    <div className="w-full h-48 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                      <img 
                        src={image} 
                        alt={`${product.title || 'Produit'} - Image ${index + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex-[0_0_100%] min-w-0">
                  <div className="w-full h-48 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                    <span className="text-gray-400">Image produit</span>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Boutons de navigation des images */}
          {hasMultipleImages && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 rounded-full w-8 h-8 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                onClick={scrollPrev}
              >
                <ChevronLeft size={16} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 rounded-full w-8 h-8 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                onClick={scrollNext}
              >
                <ChevronRight size={16} />
              </Button>
              
              {/* Indicateurs de pagination */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10">
                {images.map((_, index) => (
                  <div
                    key={index}
                    className={`w-1.5 h-1.5 rounded-full transition-colors ${
                      index === currentImageIndex ? 'bg-white' : 'bg-white/50'
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-4">
        <div className="mb-2">
          <Badge variant="outline" className="text-xs capitalize">
            {product.product_type}
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
          onClick={(e) => {
            e.stopPropagation();
            onAddToCart?.(product.id);
          }}
        >
          <ShoppingCart size={16} className="mr-2" />
          {!user ? 'Connectez-vous' : 'Ajouter au panier'}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ProductCard;
