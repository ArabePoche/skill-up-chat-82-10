/**
 * Store IndexedDB pour les produits de boutique physique
 * Les deux stores partagent la même DB avec version 2 pour garantir
 * que les deux object stores sont créés ensemble
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

/**
 * Fonction utilitaire pour créer tous les object stores de la boutique DB
 * Appelée par les deux classes pour garantir la cohérence
 */
function createAllBoutiqueStores(db: IDBDatabase): void {
    if (!db.objectStoreNames.contains('boutique_products')) {
        const store = db.createObjectStore('boutique_products', { keyPath: 'id' });
        store.createIndex('shopId', 'shopId', { unique: false });
        store.createIndex('productId', 'productId', { unique: false });
    }
    if (!db.objectStoreNames.contains('physical_shops')) {
        const store = db.createObjectStore('physical_shops', { keyPath: 'id' });
        store.createIndex('ownerId', 'ownerId', { unique: false });
    }
}

class BoutiqueProductStore extends BaseStore<LocalBoutiqueProduct> {
    constructor() {
        super('boutique_db', 2, 'boutique_products');
    }

    createStore(db: IDBDatabase): void {
        createAllBoutiqueStores(db);
    }

    async getByShop(shopId: string): Promise<LocalBoutiqueProduct[]> {
        return this.getByIndex('shopId', shopId);
    }
}

class PhysicalShopStore extends BaseStore<LocalPhysicalShop> {
    constructor() {
        super('boutique_db', 2, 'physical_shops');
    }

    createStore(db: IDBDatabase): void {
        createAllBoutiqueStores(db);
    }

    async getByOwner(ownerId: string): Promise<LocalPhysicalShop[]> {
        return this.getByIndex('ownerId', ownerId);
    }
}

export const boutiqueProductStore = new BoutiqueProductStore();
export const physicalShopStore = new PhysicalShopStore();
