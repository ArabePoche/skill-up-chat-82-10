/**
 * Hook pour gérer le panier POS de la boutique physique
 * État local (pas de persistance DB pour le panier en cours)
 */
import { useState, useCallback, useMemo } from 'react';
import type { BoutiqueProduct } from '@/hooks/shop/useBoutiqueProducts';

export interface PosCartItem {
    product: BoutiqueProduct;
    quantity: number;
}

export const usePosCart = () => {
    const [items, setItems] = useState<PosCartItem[]>([]);

    const addItem = useCallback((product: BoutiqueProduct, qty = 1) => {
        setItems(prev => {
            const existing = prev.find(i => i.product.id === product.id);
            const availableStock = product.stock_quantity - product.marketplace_quantity;
            if (existing) {
                const newQty = Math.min(existing.quantity + qty, availableStock);
                return prev.map(i =>
                    i.product.id === product.id ? { ...i, quantity: newQty } : i
                );
            }
            if (qty > availableStock) qty = availableStock;
            if (qty <= 0) return prev;
            return [...prev, { product, quantity: qty }];
        });
    }, []);

    const updateQuantity = useCallback((productId: string, quantity: number) => {
        setItems(prev => {
            if (quantity <= 0) return prev.filter(i => i.product.id !== productId);
            return prev.map(i => {
                if (i.product.id !== productId) return i;
                const max = i.product.stock_quantity - i.product.marketplace_quantity;
                return { ...i, quantity: Math.min(quantity, max) };
            });
        });
    }, []);

    const removeItem = useCallback((productId: string) => {
        setItems(prev => prev.filter(i => i.product.id !== productId));
    }, []);

    const clearCart = useCallback(() => {
        setItems([]);
    }, []);

    const totalAmount = useMemo(() =>
        items.reduce((sum, i) => sum + i.product.price * i.quantity, 0),
        [items]
    );

    const totalItems = useMemo(() =>
        items.reduce((sum, i) => sum + i.quantity, 0),
        [items]
    );

    return {
        items,
        addItem,
        updateQuantity,
        removeItem,
        clearCart,
        totalAmount,
        totalItems,
        isEmpty: items.length === 0,
    };
};
