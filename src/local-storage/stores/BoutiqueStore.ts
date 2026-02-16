/**
 * Store IndexedDB pour les produits de boutique physique
 * Permet le fonctionnement offline-first
 */
import { BaseStore } from './BaseStore';

export interface LocalBoutiqueProduct {
    id: string;
    shopId: string;
    productId?: string;
    name: string;
    description?: string;
    price: number;
    stockQuantity: number;
    marketplaceQuantity: number;
    imageUrl?: string;
    updatedAt: number;
}

export interface LocalPhysicalShop {
    id: string;
    ownerId: string;
    name: string;
    address?: string;
    updatedAt: number;
}

class BoutiqueProductStore extends BaseStore<LocalBoutiqueProduct> {
    constructor() {
        super('boutique_db', 1, 'boutique_products');
    }

    createStore(db: IDBDatabase): void {
        if (!db.objectStoreNames.contains(this.storeName)) {
            const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
            store.createIndex('shopId', 'shopId', { unique: false });
            store.createIndex('productId', 'productId', { unique: false });
        }
    }

    async getByShop(shopId: string): Promise<LocalBoutiqueProduct[]> {
        return this.getByIndex('shopId', shopId);
    }
}

class PhysicalShopStore extends BaseStore<LocalPhysicalShop> {
    constructor() {
        super('boutique_db', 1, 'physical_shops');
    }

    createStore(db: IDBDatabase): void {
        if (!db.objectStoreNames.contains(this.storeName)) {
            const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
            store.createIndex('ownerId', 'ownerId', { unique: false });
        }
    }

    async getByOwner(ownerId: string): Promise<LocalPhysicalShop[]> {
        return this.getByIndex('ownerId', ownerId);
    }
}

export const boutiqueProductStore = new BoutiqueProductStore();
export const physicalShopStore = new PhysicalShopStore();
