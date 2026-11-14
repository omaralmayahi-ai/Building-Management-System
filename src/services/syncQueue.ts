/**
 * Offline Sync Queue & Retry Engine
 * 
 * Provides guaranteed eventual consistency and resilience for mobile & field operations.
 * When field inspectors or engineers submit maintenance requests or periodic inspections:
 * 1. The operation is immediately recorded in local memory state (Zero-latency optimistic UI).
 * 2. It is saved to the persistent local Offline Sync Queue.
 * 3. The engine automatically attempts to push to the system server (the single source of truth).
 * 4. In case of poor cell connectivity, timeouts, or rapid consecutive submissions:
 *    - The queue retains the item with retry metadata.
 *    - Automatically resumes when connectivity recovers (online event, visibility change, or background 15s pulse).
 *    - Compresses all image payloads before transmission to prevent 1MB Firestore doc limit / payload drops.
 */

import { apiRequest, reportApiError, requestResync } from './http';
import { sanitizeAndCompressAttachments } from '../utils/imageCompressor';
import { safeParse, safeSetItem } from '../utils/storageUtils';
import { MaintenanceRequest, PeriodicInspectionSchedule, UnitAsset } from '../types';

export type QueueActionType =
  | 'create_maintenance'
  | 'update_maintenance'
  | 'delete_maintenance'
  | 'create_inspection'
  | 'update_inspection'
  | 'delete_inspection'
  | 'create_unit'
  | 'update_unit'
  | 'delete_unit';

export interface QueueItem {
  id: string;
  entityId: string;
  actionType: QueueActionType;
  payload: any;
  createdAt: number;
  retryCount: number;
  lastAttemptAt?: number;
  lastError?: string;
  status: 'pending' | 'syncing' | 'failed' | 'synced';
}

export interface SyncQueueStatus {
  pendingCount: number;
  isSyncing: boolean;
  lastSyncedAt: number | null;
  failedCount: number;
  items: Array<{ id: string; entityId: string; actionType: QueueActionType; status: string; retryCount: number }>;
}

const QUEUE_STORAGE_KEY = 'app_offline_sync_queue';

class OfflineSyncEngine {
  private queue: QueueItem[] = [];
  private isProcessing = false;
  private listeners: Set<(status: SyncQueueStatus) => void> = new Set();
  private lastSyncedAt: number | null = null;
  private backgroundIntervalId: any = null;

  constructor() {
    this.loadQueueFromStorage();
    this.setupEventListeners();
  }

  private loadQueueFromStorage() {
    try {
      const saved = safeParse<QueueItem[]>(QUEUE_STORAGE_KEY, []);
      if (Array.isArray(saved)) {
        // Reset any items that were stuck in 'syncing' when the app previously closed
        this.queue = saved.map((item) =>
          item.status === 'syncing' ? { ...item, status: 'pending' } : item
        );
      } else {
        this.queue = [];
      }
    } catch (e) {
      console.warn('Failed to load offline sync queue:', e);
      this.queue = [];
    }
  }

  private saveQueueToStorage() {
    try {
      safeSetItem(QUEUE_STORAGE_KEY, this.queue);
      this.notifyListeners();
    } catch (e) {
      console.warn('Failed to save offline sync queue:', e);
    }
  }

  private setupEventListeners() {
    if (typeof window === 'undefined') return;

    // React immediately when network comes back online
    window.addEventListener('online', () => {
      console.info('📡 Network back online. Triggering offline sync queue flush...');
      this.flushQueue();
    });

    // React when mobile user switches back to the application tab
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && this.getPendingCount() > 0) {
        this.flushQueue();
      }
    });

    // Background interval check every 15 seconds
    if (!this.backgroundIntervalId) {
      this.backgroundIntervalId = setInterval(() => {
        if (this.getPendingCount() > 0 && !this.isProcessing && navigator.onLine !== false) {
          this.flushQueue();
        }
      }, 15000);
    }

    // Initial flush attempt on boot
    setTimeout(() => {
      if (this.getPendingCount() > 0) {
        this.flushQueue();
      }
    }, 2000);
  }

  public subscribe(callback: (status: SyncQueueStatus) => void): () => void {
    this.listeners.add(callback);
    callback(this.getStatus());
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notifyListeners() {
    const status = this.getStatus();
    this.listeners.forEach((cb) => {
      try {
        cb(status);
      } catch (err) {
        console.warn('SyncQueue listener error:', err);
      }
    });
  }

  public getStatus(): SyncQueueStatus {
    const pending = this.queue.filter((i) => i.status === 'pending' || i.status === 'syncing');
    const failed = this.queue.filter((i) => i.status === 'failed');
    return {
      pendingCount: pending.length,
      isSyncing: this.isProcessing,
      lastSyncedAt: this.lastSyncedAt,
      failedCount: failed.length,
      items: this.queue.map((i) => ({
        id: i.id,
        entityId: i.entityId,
        actionType: i.actionType,
        status: i.status,
        retryCount: i.retryCount,
      })),
    };
  }

  public getPendingCount(): number {
    return this.queue.filter((i) => i.status === 'pending' || i.status === 'syncing').length;
  }

  /**
   * Enqueue a new mutation to be synced
   */
  public async enqueue(
    actionType: QueueActionType,
    entityId: string,
    payload: any
  ): Promise<QueueItem> {
    // 1. Automatically sanitize & compress any heavy images before queueing
    let processedPayload = payload;
    if (payload && typeof payload === 'object') {
      try {
        processedPayload = await sanitizeAndCompressAttachments(payload);
      } catch (err) {
        console.warn('Error compressing payload during queue enqueue:', err);
      }
    }

    // 2. Check if a pending item for the same entity and same action type exists; replace or add
    const existingIndex = this.queue.findIndex(
      (item) => item.entityId === entityId && item.actionType === actionType && item.status === 'pending'
    );

    const queueItem: QueueItem = {
      id: `q-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      entityId,
      actionType,
      payload: processedPayload,
      createdAt: Date.now(),
      retryCount: 0,
      status: 'pending',
    };

    if (existingIndex >= 0) {
      this.queue[existingIndex] = queueItem;
    } else {
      this.queue.push(queueItem);
    }

    this.saveQueueToStorage();

    // Trigger immediate background sync
    this.flushQueue();

    return queueItem;
  }

  /**
   * Manually or automatically trigger processing of all pending queue items
   */
  public async flushQueue(): Promise<{ synced: number; remaining: number }> {
    if (this.isProcessing) {
      return { synced: 0, remaining: this.getPendingCount() };
    }

    if (this.queue.length === 0) {
      return { synced: 0, remaining: 0 };
    }

    this.isProcessing = true;
    this.notifyListeners();

    let syncedCount = 0;

    try {
      const itemsToProcess = [...this.queue];

      for (const item of itemsToProcess) {
        if (item.status === 'synced') continue;

        item.status = 'syncing';
        item.lastAttemptAt = Date.now();
        this.notifyListeners();

        const success = await this.executeItem(item);

        if (success) {
          item.status = 'synced';
          syncedCount++;
          this.lastSyncedAt = Date.now();
        } else {
          item.retryCount += 1;
          // If tried multiple times, mark as failed but keep in queue for next network change
          item.status = item.retryCount > 10 ? 'failed' : 'pending';
        }

        // Clean up synced items
        this.queue = this.queue.filter((i) => i.status !== 'synced');
        this.saveQueueToStorage();
      }
    } catch (err) {
      console.warn('Queue flush encountered an unexpected error:', err);
    } finally {
      this.isProcessing = false;
      this.notifyListeners();
    }

    return { synced: syncedCount, remaining: this.getPendingCount() };
  }

  /**
   * ينفّذ عملية واحدة من القائمة على خادم النظام (المصدر المعتمد).
   * - نجاح: تُزال من القائمة.
   * - تعذّر الوصول إلى الخادم أو توقف قاعدته: تبقى للمحاولة لاحقاً.
   * - رفض نهائي من الخادم (صلاحية، تعارض نسخة، بيانات غير صالحة): تُزال ويُبلَّغ المستخدم بالسبب.
   */
  private async executeItem(item: QueueItem): Promise<boolean> {
    const routes: Record<string, { path: string; method: 'POST' | 'DELETE' }> = {
      create_maintenance: { path: '/maintenance', method: 'POST' },
      update_maintenance: { path: '/maintenance', method: 'POST' },
      delete_maintenance: { path: '/maintenance', method: 'DELETE' },
      create_inspection: { path: '/inspections', method: 'POST' },
      update_inspection: { path: '/inspections', method: 'POST' },
      delete_inspection: { path: '/inspections', method: 'DELETE' },
      create_unit: { path: '/units', method: 'POST' },
      update_unit: { path: '/units', method: 'POST' },
      delete_unit: { path: '/units', method: 'DELETE' },
    };
    const route = routes[item.actionType];
    if (!route) return true;

    const result =
      route.method === 'DELETE'
        ? await apiRequest('DELETE', `${route.path}/${encodeURIComponent(item.entityId)}`)
        : await apiRequest('POST', route.path, item.payload, 60000);

    if (result.ok) return true;

    const retryLater = result.status === 0 || result.status === 401 || result.status === 429 || result.status >= 500;
    if (retryLater) {
      item.lastError = result.error || '';
      return false;
    }

    // رفض نهائي: لا فائدة من إعادة المحاولة
    reportApiError(result.error || 'رفض الخادم حفظ العملية');
    requestResync();
    return true;
  }

  /**
   * Clear any persistently failed items if the user desires
   */
  public clearQueue() {
    this.queue = [];
    this.saveQueueToStorage();
  }
}

export const syncQueue = new OfflineSyncEngine();
