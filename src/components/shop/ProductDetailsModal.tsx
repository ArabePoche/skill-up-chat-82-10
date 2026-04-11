/**
 * Modal affichant les détails complets d'un produit
 * Inclut carousel d'images, description, prix et produits similaires
 */

import React, { useState, useCallback, useEffect } from 'react';
import { ShoppingCart, Star, Heart, X, ChevronLeft, ChevronRight, Store, Info, Bell, BellOff, ShieldCheck } from 'lucide-react';
import ScPriceDisplay from '@/marketplace/components/ScPriceDisplay';
import BuyWithScDialog from '@/marketplace/components/BuyWithScDialog';
import { useProductRestock } from '@/hooks/shop/useProductRestock';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import useEmblaCarousel from 'embla-carousel-react';
import ProductCard from './ProductCard';

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
  stock?: number;
  seller_id?: string;
  product_media?: Array<{
    media_url: string;
    display_order: number;
  }>;
  profiles?: {
    id?: string;
    first_name?: string;
    last_name?: string;
    username?: string;
  };
}

interface ProductDetailsModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  user: any;
  onAddToCart?: (productId: string) => void;
  similarProducts?: Product[];
}

const ProductDetailsModal: React.FC<ProductDetailsModalProps> = ({
  product,
  isOpen,
  onClose,
  user,
  onAddToCart,
  similarProducts = []
}) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showBuyScDialog, setShowBuyScDialog] = useState(false);
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, skipSnaps: false });
  const { isSubscribed, subscribe, unsubscribe, isSubscribing, isUnsubscribing } = useProductRestock(product?.id, user?.id);
  const [emblaThumbsRef, emblaThumbsApi] = useEmblaCarousel({
    containScroll: 'keepSnaps',
    dragFree: true,
  });
  const [emblaSimilarRef, emblaSimilarApi] = useEmblaCarousel({
    slidesToScroll: 1,
    align: 'start',
  });

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  const onThumbClick = useCallback((index: number) => {
    if (!emblaApi || !emblaThumbsApi) return;
    emblaApi.scrollTo(index);
  }, [emblaApi, emblaThumbsApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCurrentImageIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, onSelect]);

  if (!product) return null;

  const images = product.product_media?.map(m => m.media_url) ||
    (product.image_url ? [product.image_url] : []);

  const formatAuthorName = (profile: any) => {
    if (!profile) return 'Auteur inconnu';
    const firstName = profile.first_name || '';
    const lastName = profile.last_name || '';
    return `${firstName} ${lastName}`.trim() || profile.username || 'Auteur inconnu';
  };

  const discountedPrice = product.original_price && product.discount_percentage
    ? product.original_price * (1 - product.discount_percentage / 100)
    : product.price;
  const resolvedSellerId = product.seller_id || product.profiles?.id;
  const isOwnProduct = !!user?.id && resolvedSellerId === user.id;

  const isOutOfStock = product.stock !== undefined && product.stock <= 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] p-0">
        <ScrollArea className="max-h-[90vh]">
          <div className="p-6">
            <DialogHeader className="mb-6">
              <div className="flex items-center gap-3">
                <DialogTitle className="text-2xl font-bold">{product.title}</DialogTitle>
                {isOutOfStock && (
                  <Badge variant="secondary" className="bg-gray-100 text-gray-700 font-bold border-gray-200">
                    En rupture
                  </Badge>
                )}
              </div>
            </DialogHeader>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Galerie d'images */}
              <div className="space-y-4">
                <div className="relative">
                  <div ref={emblaRef} className="overflow-hidden rounded-lg">
                    <div className="flex">
                      {images.length > 0 ? (
                        images.map((image, index) => (
                          <div key={index} className="flex-[0_0_100%] min-w-0">
                            <img
                              src={image}
                              alt={`${product.title} - Image ${index + 1}`}
                              className={`w-full h-96 object-cover ${isOutOfStock ? 'grayscale-[0.5]' : ''}`}
                            />
                          </div>
                        ))
                      ) : (
                        <div className="flex-[0_0_100%] min-w-0">
                          <div className="w-full h-96 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                            <span className="text-gray-400">Aucune image disponible</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {images.length > 1 && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 rounded-full"
                        onClick={scrollPrev}
                      >
                        <ChevronLeft size={20} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 rounded-full"
                        onClick={scrollNext}
                      >
                        <ChevronRight size={20} />
                      </Button>
                    </>
                  )}
                </div>

                {/* Miniatures */}
                {images.length > 1 && (
                  <div ref={emblaThumbsRef} className="overflow-hidden">
                    <div className="flex gap-2">
                      {images.map((image, index) => (
                        <button
                          key={index}
                          onClick={() => onThumbClick(index)}
                          className={`flex-[0_0_20%] min-w-0 rounded-md overflow-hidden border-2 transition-all ${index === currentImageIndex
                            ? 'border-orange-500'
                            : 'border-transparent opacity-60 hover:opacity-100'
                            }`}
                        >
                          <img
                            src={image}
                            alt={`Miniature ${index + 1}`}
                            className={`w-full h-20 object-cover ${isOutOfStock ? 'grayscale-[0.5]' : ''}`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Détails du produit */}
              <div className="space-y-6">
                {/* Badge promo */}
                {product.discount_percentage && !isOutOfStock && (
                  <Badge className="bg-red-500 text-white">
                    -{product.discount_percentage}%
                  </Badge>
                )}

                {/* Type de produit */}
                <Badge variant="outline">
                  {product.product_type === 'formation' ? 'Formation' :
                    product.product_type === 'article' ? 'Article' : 'Service'}
                </Badge>

                {/* Auteur */}
                <p className="text-sm text-gray-600">
                  Par {formatAuthorName(product.profiles)}
                </p>

                {/* Notes */}
                {product.rating && (
                  <div className="flex items-center">
                    <div className="flex mr-2">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          size={18}
                          className={`${i < Math.floor(product.rating || 0)
                            ? 'text-yellow-400 fill-current'
                            : 'text-gray-300'
                            }`}
                        />
                      ))}
                    </div>
                    <span className="text-sm font-medium">{product.rating}</span>
                  </div>
                )}

                {/* Prix avec équivalent SC */}
                <div className="space-y-1">
                  <ScPriceDisplay priceFcfa={Math.round(discountedPrice || 0)} size="lg" isOutOfStock={isOutOfStock} />
                  {product.original_price && product.discount_percentage && !isOutOfStock && (
                    <span className="text-sm text-muted-foreground line-through">
                      {product.original_price} FCFA
                    </span>
                  )}
                  {product.discount_percentage && !isOutOfStock && (
                    <p className="text-sm text-green-600">
                      Économisez {Math.round((product.original_price || 0) - discountedPrice)} FCFA
                    </p>
                  )}
                </div>

                {/* Description */}
                {product.description && (
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Description</h3>
                    <p className="text-gray-700 leading-relaxed">{product.description}</p>
                  </div>
                )}

                {/* Boutons d'action */}
                <div className="flex gap-3 pt-4">
                  {isOutOfStock ? (
                    <Button
                      className={`w-full flex-1 py-6 text-lg font-bold shadow-lg ${isSubscribed ? 'bg-gray-200 hover:bg-gray-300 text-gray-800' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                      disabled={isSubscribing || isUnsubscribing || !user}
                      onClick={() => {
                        if (!user) {
                          toast.error('Veuillez vous connecter pour être notifié.');
                          return;
                        }
                        if (isSubscribed) {
                          unsubscribe();
                        } else {
                          subscribe();
                        }
                      }}
                    >
                      {isSubscribed ? (
                        <>
                          <BellOff className="mr-2 h-6 w-6" />
                          Ne plus me notifier
                        </>
                      ) : (
                        <>
                          <Bell className="mr-2 h-6 w-6" />
                          Me notifier
                        </>
                      )}
                    </Button>
                  ) : (
                    <>
                      <Button
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white h-12 text-base"
                        disabled={!user || isOwnProduct}
                        onClick={() => {
                          if (!user) {
                            toast.error('Connectez-vous pour acheter');
                            return;
                          }
                          if (isOwnProduct) {
                            toast.error('Vous ne pouvez pas acheter votre propre produit.');
                            return;
                          }
                          setShowBuyScDialog(true);
                        }}
                      >
                        <ShieldCheck size={20} className="mr-2" />
                        {!user ? 'Connectez-vous' : isOwnProduct ? 'Votre produit' : 'Acheter en SC'}
                      </Button>
                      <Button
                        className="flex-1 bg-orange-500 hover:bg-orange-600 text-white h-12 text-base"
                        disabled={!user || isOwnProduct}
                        onClick={() => {
                          if (isOwnProduct) {
                            toast.error('Vous ne pouvez pas acheter votre propre produit.');
                            return;
                          }
                          onAddToCart?.(product.id);
                        }}
                      >
                        <ShoppingCart size={20} className="mr-2" />
                        {isOwnProduct ? 'Votre produit' : 'Panier'}
                      </Button>
                    </>
                  )}
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-12 w-12 border-gray-300 hover:border-red-500 hover:text-red-500"
                  >
                    <Heart size={20} />
                  </Button>
                </div>
              </div>
            </div>

            {/* Buy with SC dialog */}
            <BuyWithScDialog
              product={product ? { ...product, seller_id: resolvedSellerId } : null}
              isOpen={showBuyScDialog}
              onClose={() => setShowBuyScDialog(false)}
            />

            {/* Produits similaires */}
            {similarProducts.length > 0 && (
              <div className="mt-12">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold">Produits similaires</h3>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => emblaSimilarApi?.scrollPrev()}
                    >
                      <ChevronLeft size={16} />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => emblaSimilarApi?.scrollNext()}
                    >
                      <ChevronRight size={16} />
                    </Button>
                  </div>
                </div>
                <div className="relative">
                  <div ref={emblaSimilarRef} className="overflow-hidden">
                    <div className="flex gap-4">
                      {similarProducts.map((similarProduct) => (
                        <div key={similarProduct.id} className="flex-[0_0_280px] min-w-0">
                          <ProductCard
                            product={similarProduct}
                            user={user}
                            onAddToCart={onAddToCart}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default ProductDetailsModal;
