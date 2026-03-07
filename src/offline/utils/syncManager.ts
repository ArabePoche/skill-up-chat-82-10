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

    // Si le navigateur dit qu'on est hors ligne, c'est fiable
    if (!navigator.onLine) {
      this.isOnline = false;
      this.isCheckingConnection = false;
    } else {
      // navigator.onLine = true → vérifier avec un ping léger à Supabase
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        
        const { error } = await supabase.from('formations').select('id').limit(1).abortSignal(controller.signal);
        clearTimeout(timeout);
        
        if (error) {
          const errorMessage = error.message?.toLowerCase() || '';
          // Seuls les vrais problèmes réseau doivent passer en offline
          const isNetworkError = errorMessage.includes('fetch') || 
                                errorMessage.includes('network') ||
                                errorMessage.includes('abort') ||
                                errorMessage.includes('timeout') ||
                                errorMessage.includes('failed to fetch');
          
          if (isNetworkError) {
            console.log('📵 Network error detected:', errorMessage);
            this.isOnline = false;
          } else {
            // Erreur Supabase (RLS, quota, etc.) ≠ perte de connexion
            console.log('⚠️ Supabase error but network OK:', errorMessage);
            this.isOnline = true;
            this.reconnectAttempts = 0;
          }
        } else {
          this.isOnline = true;
          this.reconnectAttempts = 0;
        }
      } catch (err: unknown) {
        // Seules les erreurs de type réseau (AbortError, TypeError fetch) = offline
        const errName = err instanceof Error ? err.name : '';
        if (errName === 'AbortError' || errName === 'TypeError') {
          this.isOnline = false;
        } else {
          // Erreur inattendue, garder l'état actuel
          console.warn('⚠️ Unexpected check error, keeping state:', err);
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
      
      case 'generic':
        return this.syncGenericMutation(mutation.payload);
      
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
   * Synchronise les messages en attente vers Supabase
   */
  private async syncPendingMessages(): Promise<void> {
    const pendingMutations = await offlineStore.getPendingMutations();
    const messageMutations = pendingMutations.filter(m => m.type === 'message');

    console.log(`📤 Syncing ${messageMutations.length} pending messages...`);

    for (const mutation of messageMutations) {
      try {
        const { lessonId, formationId, promotionId, senderId, content, messageType, repliedToMessageId } = mutation.payload;

        const { error } = await supabase
          .from('lesson_messages')
          .insert({
            lesson_id: lessonId,
            formation_id: formationId,
            promotion_id: promotionId || null,
            sender_id: senderId,
            content,
            message_type: messageType || 'text',
            replied_to_message_id: repliedToMessageId || null,
            is_exercise_submission: false
          });

        if (error) {
          console.error('Failed to sync message:', error);
          await offlineStore.incrementMutationRetry(mutation.id);
          
          // Si trop de tentatives, supprimer la mutation
          if (mutation.retryCount >= 5) {
            await offlineStore.removePendingMutation(mutation.id);
            console.warn('Message sync abandoned after 5 retries');
          }
        } else {
          // Succès : supprimer la mutation en attente
          await offlineStore.removePendingMutation(mutation.id);
          console.log('✅ Pending message synced');
        }
      } catch (error) {
        console.error('Error syncing pending message:', error);
      }
    }
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
