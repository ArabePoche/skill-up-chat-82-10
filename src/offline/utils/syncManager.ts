/**
 * Gestionnaire de synchronisation automatique
 * Détecte le retour de connexion et synchronise avec Supabase
 */

import { supabase } from '@/integrations/supabase/client';
import { offlineStore } from './offlineStore';
import { localMessageStore } from '@/message-cache/utils/localMessageStore';
import { toast } from 'sonner';

type SyncCallback = (isOnline: boolean) => void;
type SyncEventCallback = (event: SyncEvent) => void;

interface SyncEvent {
  type: 'start' | 'progress' | 'complete' | 'error';
  current?: number;
  total?: number;
  message?: string;
}

class SyncManager {
  private isOnline: boolean = navigator.onLine;
  private syncInProgress: boolean = false;
  private callbacks: Set<SyncCallback> = new Set();
  private syncEventCallbacks: Set<SyncEventCallback> = new Set();
  private syncQueue: Array<() => Promise<void>> = [];
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 5000;

  private hasRunStartupSync: boolean = false;
  private checkConnectionTimer: ReturnType<typeof setInterval> | null = null;
  private isCheckingConnection: boolean = false;

  constructor() {
    this.init();
  }

  private init() {
    // Écouter les changements de connexion
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());

    // Vérifier périodiquement la connexion (toutes les 60 secondes au lieu de 15)
    this.checkConnectionTimer = setInterval(() => this.checkConnection(), 60000);

    // Vérification initiale
    this.checkConnection();
  }

  private handleOnline() {
    console.log('🌐 Connection restored');
    this.reconnectAttempts = 0;
    this.isOnline = true;
    this.notifyCallbacks(true);
    this.syncAll();
  }

  private handleOffline() {
    console.log('📵 Connection lost');
    this.isOnline = false;
    this.notifyCallbacks(false);
  }

  private async checkConnection() {
    // Éviter les vérifications concurrentes
    if (this.isCheckingConnection) return;
    this.isCheckingConnection = true;

    const wasOnline = this.isOnline;

    // Se fier uniquement à navigator.onLine pour détecter l'absence totale d'internet
    // Les timeouts et lenteurs réseau ne doivent PAS déclencher le mode hors ligne
    if (!navigator.onLine) {
      this.isOnline = false;
      this.isCheckingConnection = false;
    } else {
      // navigator.onLine = true → on fait un ping léger pour confirmer
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);

        const pingResponse = await fetch('https://jiasafdbfqqhhdazoybu.supabase.co/rest/v1/', {
          method: 'HEAD',
          cache: 'no-store',
          signal: controller.signal
        });

        clearTimeout(timeout);

        // Toute réponse HTTP = le réseau fonctionne
        this.isOnline = true;
        this.reconnectAttempts = 0;
      } catch (err: unknown) {
        const errName = err instanceof Error ? err.name : '';
        const errMsg = err instanceof Error ? err.message.toLowerCase() : '';

        // AbortError = timeout → connexion lente mais présente, on reste en ligne
        if (errName === 'AbortError') {
          console.log('⏱️ Ping timeout (connexion lente), on reste en ligne');
          // Ne PAS passer hors ligne pour un simple timeout
        } else {
          // TypeError / failed to fetch = vraie absence de réseau
          const isRealNetworkFailure =
            errName === 'TypeError' ||
            errMsg.includes('failed to fetch') ||
            errMsg.includes('network');

          if (isRealNetworkFailure && !navigator.onLine) {
            console.log('📵 Vraie absence de réseau détectée');
            this.isOnline = false;
          } else {
            console.warn('⚠️ Erreur ping ignorée, on reste en ligne:', errName, errMsg);
          }
        }
      }
      this.isCheckingConnection = false;
    }

    // Si changement d'état
    if (wasOnline !== this.isOnline) {
      console.log(`🔄 Connection status changed: ${wasOnline} -> ${this.isOnline}`);
      this.notifyCallbacks(this.isOnline);

      if (this.isOnline) {
        toast.success('Connexion rétablie', {
          description: 'Synchronisation automatique en cours...',
        });
        this.syncAll();
      } else if (wasOnline) {
        toast.warning('Connexion perdue', {
          description: 'Mode hors ligne activé. Les modifications seront synchronisées au retour.',
        });
      }
    }
  }

  /**
   * Synchronise toutes les données offline avec le serveur
   */
  async syncAll(): Promise<void> {
    if (!this.isOnline || this.syncInProgress) return;

    this.syncInProgress = true;
    console.log('🔄 Starting sync...');
    this.notifySyncEvent({ type: 'start' });

    try {
      // 1. D'abord synchroniser toutes les mutations en attente
      const pendingMutations = await offlineStore.getPendingMutations();
      const total = pendingMutations.length;

      if (total > 0) {
        console.log(`📤 Syncing ${total} pending mutations...`);

        for (let i = 0; i < pendingMutations.length; i++) {
          const mutation = pendingMutations[i];
          this.notifySyncEvent({ type: 'progress', current: i + 1, total });

          try {
            const success = await this.syncMutation(mutation);

            if (success) {
              await offlineStore.removePendingMutation(mutation.id);
              console.log(`✅ Mutation ${mutation.id} synced`);
            } else {
              await offlineStore.incrementMutationRetry(mutation.id);

              if (mutation.retryCount >= 5) {
                await offlineStore.removePendingMutation(mutation.id);
                console.warn(`❌ Mutation ${mutation.id} abandoned after 5 retries`);
              }
            }
          } catch (error) {
            console.error(`Error syncing mutation ${mutation.id}:`, error);
            await offlineStore.incrementMutationRetry(mutation.id);
          }
        }
      }

      // 2. Synchroniser les formations offline
      const offlineFormations = await offlineStore.getAllFormations();

      for (const formation of offlineFormations) {
        await this.syncFormation(formation.id);
      }

      // 3. Nettoyer les caches expirés
      await localMessageStore.cleanExpiredCache();

      console.log('✅ Sync completed');
      this.notifySyncEvent({ type: 'complete', message: 'Synchronisation terminée' });

      // Notifier du succès si des mutations ont été sync
      if (total > 0) {
        toast.success(`${total} modification(s) synchronisée(s)`);
      }
    } catch (error) {
      console.error('❌ Sync failed:', error);
      this.notifySyncEvent({ type: 'error', message: 'Erreur de synchronisation' });
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Synchronise une mutation selon son type
   */
  private async syncMutation(mutation: any): Promise<boolean> {
    switch (mutation.type) {
      case 'message':
        return this.syncMessageMutation(mutation.payload);

      case 'progress':
        return this.syncProgressMutation(mutation.payload);

      case 'profile':
        return this.syncProfileMutation(mutation.payload);

      case 'grade':
        return this.syncGradeMutation(mutation.payload);

      case 'attendance':
        return this.syncAttendanceMutation(mutation.payload);

      case 'payment':
        return this.syncPaymentMutation(mutation.payload);

      case 'note':
        return this.syncNoteMutation(mutation.payload);

      case 'transfer':
        return this.syncTransferMutation(mutation.payload);

      case 'return':
        return this.syncReturnMutation(mutation.payload);

      case 'update_boutique_product':
        return this.syncUpdateBoutiqueProductMutation(mutation.payload);

      case 'delete_boutique_product':
        return this.syncDeleteBoutiqueProductMutation(mutation.payload);

      case 'generic':
        return this.syncGenericMutation(mutation.payload);

      case 'create_boutique_sale':
        return this.syncCreateBoutiqueSaleMutation(mutation.payload);

      case 'cancel_boutique_sale':
        return this.syncCancelBoutiqueSaleMutation(mutation.payload);

      default:
        console.warn('Unknown mutation type:', mutation.type);
        return false;
    }
  }

  private async syncMessageMutation(payload: any): Promise<boolean> {
    const { error } = await (supabase as any)
      .from('lesson_messages')
      .insert({
        lesson_id: payload.lessonId,
        formation_id: payload.formationId,
        promotion_id: payload.promotionId || null,
        sender_id: payload.senderId,
        content: payload.content,
        message_type: payload.messageType || 'text',
        replied_to_message_id: payload.repliedToMessageId || null,
      });
    return !error;
  }

  private async syncProgressMutation(payload: any): Promise<boolean> {
    const { error } = await (supabase as any)
      .from('student_progress')
      .upsert({
        user_id: payload.userId,
        lesson_id: payload.lessonId,
        progress: payload.progress,
        completed: payload.completed,
        completed_at: payload.completedAt,
      }, { onConflict: 'user_id,lesson_id' });
    return !error;
  }

  private async syncProfileMutation(payload: any): Promise<boolean> {
    const { error } = await (supabase as any)
      .from('profiles')
      .update(payload.updates)
      .eq('id', payload.profileId);
    return !error;
  }

  private async syncGradeMutation(payload: any): Promise<boolean> {
    if (payload.operation === 'insert') {
      const { error } = await (supabase as any).from('school_grades').insert(payload.data);
      return !error;
    } else if (payload.operation === 'update') {
      const { error } = await (supabase as any).from('school_grades').update(payload.data).eq('id', payload.id);
      return !error;
    }
    return false;
  }

  private async syncAttendanceMutation(payload: any): Promise<boolean> {
    if (payload.operation === 'insert') {
      const { error } = await (supabase as any).from('school_attendance').insert(payload.data);
      return !error;
    } else if (payload.operation === 'update') {
      const { error } = await (supabase as any).from('school_attendance').update(payload.data).eq('id', payload.id);
      return !error;
    }
    return false;
  }

  private async syncPaymentMutation(payload: any): Promise<boolean> {
    const { error } = await (supabase as any).from('school_fee_payments').insert(payload.data);
    return !error;
  }

  private async syncNoteMutation(payload: any): Promise<boolean> {
    if (payload.operation === 'insert') {
      const { error } = await (supabase as any).from('school_teacher_student_notes').insert(payload.data);
      return !error;
    } else if (payload.operation === 'update') {
      const { error } = await (supabase as any).from('school_teacher_student_notes').update(payload.data).eq('id', payload.id);
      return !error;
    } else if (payload.operation === 'delete') {
      const { error } = await (supabase as any).from('school_teacher_student_notes').delete().eq('id', payload.id);
      return !error;
    }
    return false;
  }

  private async syncTransferMutation(payload: any): Promise<boolean> {
    try {
      const { boutiqueProductId, quantity, sellerId } = payload;

      // 1. Récupérer l'état actuel sur le serveur
      const { data: boutiqueProduct, error: fetchError } = await supabase
        .from('physical_shop_products')
        .select('*')
        .eq('id', boutiqueProductId)
        .single();

      if (fetchError || !boutiqueProduct) return false;

      const newMarketplaceQty = boutiqueProduct.marketplace_quantity + quantity;

      // 2. Mettre à jour physical_shop_products
      const { error: updateError } = await supabase
        .from('physical_shop_products')
        .update({
          marketplace_quantity: newMarketplaceQty,
          updated_at: new Date().toISOString(),
        })
        .eq('id', boutiqueProductId);

      if (updateError) return false;

      // 3. Créer ou mettre à jour dans 'products'
      if (boutiqueProduct.product_id) {
        const { error: productError } = await supabase
          .from('products')
          .update({
            stock: newMarketplaceQty,
            quantity: newMarketplaceQty,
            is_active: newMarketplaceQty > 0,
          })
          .eq('id', boutiqueProduct.product_id);

        if (productError) return false;
      } else {
        const { data: newProduct, error: insertError } = await supabase
          .from('products')
          .insert({
            title: boutiqueProduct.name,
            description: boutiqueProduct.description,
            price: boutiqueProduct.price,
            image_url: boutiqueProduct.image_url,
            seller_id: sellerId,
            is_active: true,
            stock: newMarketplaceQty,
            quantity: newMarketplaceQty,
            product_type: 'physical',
          })
          .select()
          .single();

        if (insertError) return false;

        // Lier le produit marketplace au produit boutique
        await supabase
          .from('physical_shop_products')
          .update({ product_id: newProduct.id })
          .eq('id', boutiqueProductId);
      }

      return true;
    } catch (err) {
      console.error('Error syncing transfer mutation:', err);
      return false;
    }
  }

  private async syncReturnMutation(payload: any): Promise<boolean> {
    try {
      const { boutiqueProductId, quantity } = payload;

      // 1. Récupérer l'état actuel sur le serveur
      const { data: boutiqueProduct, error: fetchError } = await supabase
        .from('physical_shop_products')
        .select('*')
        .eq('id', boutiqueProductId)
        .single();

      if (fetchError || !boutiqueProduct) return false;

      const newMarketplaceQty = Math.max(0, boutiqueProduct.marketplace_quantity - quantity);

      // 2. Mettre à jour physical_shop_products
      const { error: updateError } = await supabase
        .from('physical_shop_products')
        .update({
          marketplace_quantity: newMarketplaceQty,
          updated_at: new Date().toISOString(),
        })
        .eq('id', boutiqueProductId);

      if (updateError) return false;

      // 3. Mettre à jour dans 'products' ( Marketplace )
      if (boutiqueProduct.product_id) {
        const { error: productError } = await supabase
          .from('products')
          .update({
            stock: newMarketplaceQty,
            quantity: newMarketplaceQty,
            is_active: newMarketplaceQty > 0, // Désactiver si stock = 0
          })
          .eq('id', boutiqueProduct.product_id);

        if (productError) return false;
      }

      return true;
    } catch (err) {
      console.error('Error syncing return mutation:', err);
      return false;
    }
  }

  private async syncUpdateBoutiqueProductMutation(payload: any): Promise<boolean> {
    try {
      const { id, shop_id, ...updates } = payload;

      // 1. Mise à jour de la boutique
      const { data, error } = await supabase
        .from('physical_shop_products')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) return false;

      // 2. Propagation vers le Marketplace s'il y a un product_id lié
      if (data.product_id) {
        const productUpdates: any = {};
        if (updates.name !== undefined) productUpdates.title = updates.name;
        if (updates.description !== undefined) productUpdates.description = updates.description;
        if (updates.price !== undefined) productUpdates.price = updates.price;
        if (updates.image_url !== undefined) productUpdates.image_url = updates.image_url;

        if (Object.keys(productUpdates).length > 0) {
          const { error: marketplaceError } = await supabase
            .from('products')
            .update(productUpdates)
            .eq('id', data.product_id);

          if (marketplaceError) {
            console.error('⚠️ Failed to sync update to marketplace:', marketplaceError);
            // On continue quand même car la boutique est à jour
          }
        }
      }

      return true;
    } catch (err) {
      console.error('Error syncing update mutation:', err);
      return false;
    }
  }

  private async syncDeleteBoutiqueProductMutation(payload: any): Promise<boolean> {
    try {
      const { id } = payload;
      const { error } = await supabase
        .from('physical_shop_products')
        .delete()
        .eq('id', id);

      return !error;
    } catch (err) {
      console.error('Error syncing delete mutation:', err);
      return false;
    }
  }

  private async syncCreateBoutiqueSaleMutation(payload: any): Promise<boolean> {
    try {
      const { shopId, items, customerName, paymentMethod, notes } = payload;

      for (const item of items) {
        // Enregistrer la vente
        const { error: saleErr } = await (supabase as any)
          .from('physical_shop_sales')
          .insert({
            shop_id: shopId,
            product_id: item.id,
            quantity: item.quantity,
            unit_price: item.price,
            total_amount: item.price * item.quantity,
            customer_name: customerName,
            payment_method: paymentMethod,
            notes: notes
          });

        if (saleErr) return false;

        // Mettre à jour le stock
        const { data: product, error: fetchErr } = await supabase
          .from('physical_shop_products')
          .select('stock_quantity')
          .eq('id', item.id)
          .single();

        if (fetchErr || !product) return false;

        const newStock = product.stock_quantity - item.quantity;
        const { error: updateErr } = await supabase
          .from('physical_shop_products')
          .update({ stock_quantity: newStock })
          .eq('id', item.id);

        if (updateErr) return false;
      }

      return true;
    } catch (err) {
      console.error('Error syncing create sale:', err);
      return false;
    }
  }

  private async syncCancelBoutiqueSaleMutation(payload: any): Promise<boolean> {
    try {
      const { id, product_id, quantity } = payload;

      // 1. Marquer comme annulée
      const { error: cancelError } = await (supabase as any)
        .from('physical_shop_sales')
        .update({ status: 'canceled' })
        .eq('id', id);

      if (cancelError) return false;

      // 2. Restaurer stock
      const { data: product, error: fetchErr } = await supabase
        .from('physical_shop_products')
        .select('stock_quantity')
        .eq('id', product_id)
        .single();

      if (fetchErr || !product) return false;

      const newStock = product.stock_quantity + quantity;
      await supabase
        .from('physical_shop_products')
        .update({ stock_quantity: newStock })
        .eq('id', product_id);

      return true;
    } catch (err) {
      console.error('Error syncing cancel sale:', err);
      return false;
    }
  }

  private async syncGenericMutation(payload: any): Promise<boolean> {
    try {
      const { table, operation, data, id } = payload;

      if (operation === 'insert') {
        const { error } = await (supabase as any).from(table).insert(data);
        return !error;
      } else if (operation === 'update') {
        const { error } = await (supabase as any).from(table).update(data).eq('id', id);
        return !error;
      } else if (operation === 'delete') {
        const { error } = await (supabase as any).from(table).delete().eq('id', id);
        return !error;
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * S'abonner aux événements de synchronisation
   */
  onSyncEvent(callback: SyncEventCallback) {
    this.syncEventCallbacks.add(callback);
    return () => this.syncEventCallbacks.delete(callback);
  }

  private notifySyncEvent(event: SyncEvent) {
    this.syncEventCallbacks.forEach(callback => callback(event));
  }

  /**
   * Synchronise une formation spécifique
   * Préserve la structure complète (levels/lessons) si elle existe
   */
  private async syncFormation(formationId: string): Promise<void> {
    try {
      // Récupérer les données à jour avec la structure complète
      const { data: formation, error: formationError } = await supabase
        .from('formations')
        .select(`
          *,
          profiles:author_id (id, first_name, last_name, username),
          levels (
            *,
            lessons (
              *,
              exercises!exercises_lesson_id_fkey (id, title, description, content, type)
            )
          )
        `)
        .eq('id', formationId)
        .single();

      if (formationError) throw formationError;

      // Mettre à jour le cache offline avec la structure complète
      await offlineStore.saveFormation(formation);

      // Sauvegarder aussi chaque leçon individuellement
      if (formation.levels) {
        for (const level of formation.levels) {
          for (const lesson of level.lessons || []) {
            await offlineStore.saveLesson({
              ...lesson,
              formation_id: formationId,
              level_id: level.id,
              level_title: level.title,
              level_order_index: level.order_index,
            });
          }
        }
      }

      console.log(`✅ Formation ${formationId} synced with ${formation.levels?.length || 0} levels`);
    } catch (error) {
      console.error(`❌ Failed to sync formation ${formationId}:`, error);
    }
  }

  /**
   * Ajoute une tâche à la queue de synchronisation
   */
  queueSync(task: () => Promise<void>) {
    this.syncQueue.push(task);
    if (this.isOnline) {
      this.processSyncQueue();
    }
  }

  private async processSyncQueue() {
    while (this.syncQueue.length > 0 && this.isOnline) {
      const task = this.syncQueue.shift();
      if (task) {
        try {
          await task();
        } catch (error) {
          console.error('Sync queue task failed:', error);
        }
      }
    }
  }

  /**
   * S'abonner aux changements de connexion
   */
  onConnectionChange(callback: SyncCallback) {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  private notifyCallbacks(isOnline: boolean) {
    this.callbacks.forEach(callback => callback(isOnline));
  }

  /**
   * Obtenir l'état de connexion actuel
   */
  getOnlineStatus(): boolean {
    return this.isOnline;
  }

  /**
   * Forcer une synchronisation manuelle
   */
  async forceSync(): Promise<void> {
    await this.syncAll();
  }

  /**
   * Synchronisation au lancement de l'app
   * Met à jour les formations offline et la progression utilisateur
   */
  async startupSync(): Promise<void> {
    if (this.hasRunStartupSync || !this.isOnline) return;
    this.hasRunStartupSync = true;

    console.log('🚀 Startup sync: refreshing offline data...');
    await this.syncAll();
  }
}

export const syncManager = new SyncManager();
