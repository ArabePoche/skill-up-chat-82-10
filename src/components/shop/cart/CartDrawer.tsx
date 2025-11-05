/**
 * Composant drawer du panier d'achat
 * Affiche les articles du panier avec possibilité de modifier/supprimer
 */

import React, { useEffect, useState } from 'react';
import { X, ShoppingCart, Trash2, Plus, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCart } from '@/hooks/useCart';
import { useOrders } from '@/hooks/shop/useOrders';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const CartDrawer: React.FC<CartDrawerProps> = ({ isOpen, onClose }) => {
  const { cartItems, removeFromCart, updateQuantity, cartItemsCount, refreshCart, clearCart } = useCart();
  const { createOrder, loading: orderLoading } = useOrders();
  const { user } = useAuth();
  const { toast } = useToast();
  const [showCheckoutForm, setShowCheckoutForm] = useState(false);
  const [formData, setFormData] = useState({
    delivery_address: '',
    delivery_city: '',
    delivery_postal_code: '',
    delivery_phone: '',
    buyer_notes: '',
  });

  // Rafraîchir le panier à chaque ouverture du drawer
  useEffect(() => {
    if (isOpen) {
      refreshCart();
    }
  }, [isOpen, refreshCart]);

  // Préremplir le téléphone depuis le profil utilisateur
  useEffect(() => {
    const prefillPhone = async () => {
      if (!showCheckoutForm || !user || formData.delivery_phone) return;
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('phone')
          .eq('id', user.id)
          .single();
        if (!error && data?.phone) {
          setFormData((prev) => ({ ...prev, delivery_phone: data.phone }));
        }
      } catch (e) {
        console.warn('Impossible de pré-remplir le téléphone:', e);
      }
    };
    prefillPhone();
  }, [showCheckoutForm, user, formData.delivery_phone]);

  // Récupérer les détails des produits du panier avec le seller_id
  const { data: productsDetails } = useQuery({
    queryKey: ['cart-products', cartItems.map(item => item.product_id)],
    queryFn: async () => {
      if (cartItems.length === 0) return [];
      
      const productIds = cartItems.map(item => item.product_id);
      const { data, error } = await supabase
        .from('products')
        .select('id, title, price, image_url, seller_id, product_media(media_url)')
        .in('id', productIds);

      if (error) throw error;
      return data || [];
    },
    enabled: cartItems.length > 0,
  });

  const getProductDetails = (productId: string) => {
    return productsDetails?.find(p => p.id === productId);
  };

  const calculateTotal = () => {
    if (!productsDetails) return 0;
    return cartItems.reduce((total, item) => {
      const product = getProductDetails(item.product_id);
      return total + (product?.price || 0) * item.quantity;
    }, 0);
  };

  const handleCheckout = async () => {
    if (!user) {
      toast({
        title: 'Connexion requise',
        description: 'Veuillez vous connecter pour passer commande',
        variant: 'destructive',
      });
      return;
    }

    if (!productsDetails) {
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les détails des produits',
        variant: 'destructive',
      });
      return;
    }

    const items = cartItems.map(item => {
      const product = getProductDetails(item.product_id);
      return {
        product_id: item.product_id,
        quantity: item.quantity,
        price: product?.price || 0,
        seller_id: product?.seller_id || '',
      };
    }).filter(item => item.seller_id);

    if (items.length === 0) {
      toast({
        title: 'Erreur',
        description: 'Aucun produit valide dans le panier',
        variant: 'destructive',
      });
      return;
    }

    const orders = await createOrder({
      delivery_address: formData.delivery_address,
      delivery_city: formData.delivery_city,
      delivery_postal_code: formData.delivery_postal_code,
      delivery_phone: formData.delivery_phone,
      buyer_notes: formData.buyer_notes,
      items,
    });

    if (orders) {
      await clearCart();
      setShowCheckoutForm(false);
      setFormData({
        delivery_address: '',
        delivery_city: '',
        delivery_postal_code: '',
        delivery_phone: '',
        buyer_notes: '',
      });
      onClose();
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0">
        <SheetHeader className="border-b p-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <ShoppingCart size={20} />
              Mon Panier ({cartItemsCount})
            </SheetTitle>
          </div>
        </SheetHeader>

        {cartItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] text-center px-4">
            <ShoppingCart size={64} className="text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Votre panier est vide</h3>
            <p className="text-gray-500 text-sm mb-6">Ajoutez des produits pour commencer vos achats</p>
            <Button onClick={onClose} className="bg-orange-500 hover:bg-orange-600">
              Continuer mes achats
            </Button>
          </div>
        ) : (
          <>
            {!showCheckoutForm ? (
              <>
                <ScrollArea className="h-[calc(100vh-250px)]">
                  <div className="p-4 space-y-4">
                    {cartItems.map((item) => {
                      const product = getProductDetails(item.product_id);
                      const imageUrl = product?.image_url || product?.product_media?.[0]?.media_url;

                      return (
                        <div key={item.id} className="flex gap-3 bg-white border rounded-lg p-3">
                          <div className="w-20 h-20 flex-shrink-0 bg-gray-100 rounded-md overflow-hidden">
                            {imageUrl ? (
                              <img 
                                src={imageUrl} 
                                alt={product?.title || 'Produit'} 
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                                Image
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm text-gray-900 line-clamp-2 mb-1">
                              {product?.title || 'Chargement...'}
                            </h4>
                            <p className="text-orange-600 font-bold text-sm mb-2">
                              {Math.round((product?.price || 0) * item.quantity)}€
                            </p>
                            
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 hover:bg-white"
                                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                  disabled={item.quantity <= 1}
                                >
                                  <Minus size={14} />
                                </Button>
                                <span className="text-sm font-medium w-8 text-center">{item.quantity}</span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 hover:bg-white"
                                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                >
                                  <Plus size={14} />
                                </Button>
                              </div>
                              
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={() => removeFromCart(item.id)}
                              >
                                <Trash2 size={16} />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>

                <div className="border-t p-4 space-y-4">
                  <div className="flex items-center justify-between text-lg font-bold">
                    <span>Total</span>
                    <span className="text-orange-600">{Math.round(calculateTotal())}€</span>
                  </div>

                  <Button 
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white h-12 text-base font-semibold"
                    onClick={() => setShowCheckoutForm(true)}
                  >
                    Passer la commande
                  </Button>
                </div>
              </>
            ) : (
              <>
                <ScrollArea className="h-[calc(100vh-250px)]">
                  <div className="p-4 space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="delivery_phone">Téléphone *</Label>
                      <Input
                        id="delivery_phone"
                        type="tel"
                        value={formData.delivery_phone}
                        onChange={(e) => setFormData({...formData, delivery_phone: e.target.value})}
                        placeholder="+33 6 12 34 56 78"
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="delivery_address">Adresse *</Label>
                      <Input
                        id="delivery_address"
                        value={formData.delivery_address}
                        onChange={(e) => setFormData({...formData, delivery_address: e.target.value})}
                        placeholder="123 Rue Example"
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="delivery_city">Ville *</Label>
                      <Input
                        id="delivery_city"
                        value={formData.delivery_city}
                        onChange={(e) => setFormData({...formData, delivery_city: e.target.value})}
                        placeholder="Paris"
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="delivery_postal_code">Code postal *</Label>
                      <Input
                        id="delivery_postal_code"
                        value={formData.delivery_postal_code}
                        onChange={(e) => setFormData({...formData, delivery_postal_code: e.target.value})}
                        placeholder="75001"
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="buyer_notes">Notes (optionnel)</Label>
                      <Textarea
                        id="buyer_notes"
                        value={formData.buyer_notes}
                        onChange={(e) => setFormData({...formData, buyer_notes: e.target.value})}
                        placeholder="Instructions spéciales..."
                        rows={2}
                      />
                    </div>
                  </div>
                </ScrollArea>

                <div className="border-t p-4">
                  <div className="flex gap-2">
                    <Button 
                      variant="outline"
                      className="flex-1"
                      onClick={() => setShowCheckoutForm(false)}
                    >
                      Retour
                    </Button>
                    <Button 
                      className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
                      onClick={handleCheckout}
                      disabled={orderLoading || !formData.delivery_phone || !formData.delivery_address || !formData.delivery_city || !formData.delivery_postal_code}
                    >
                      {orderLoading ? 'Envoi...' : 'Confirmer'}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default CartDrawer;
 