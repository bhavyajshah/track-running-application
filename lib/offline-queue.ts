import { storage } from './storage';
import * as Network from 'expo-network';
import { Platform } from 'react-native';

interface QueuedAction {
  id: string;
  action: 'create_goal' | 'update_goal' | 'delete_goal' | 'save_run' | 'create_achievement';
  data: any;
  timestamp: number;
  retryCount: number;
}

class OfflineQueue {
  private queue: QueuedAction[] = [];
  private isProcessing = false;
  private checkInterval: NodeJS.Timeout | null = null;

  async initialize() {
    console.log('📦 Initializing offline queue...');
    
    // Load queued actions from storage
    try {
      const savedQueue = await storage.getItem('offline_queue');
      if (savedQueue) {
        this.queue = JSON.parse(savedQueue);
        console.log('📦 Loaded offline queue:', this.queue.length, 'items');
      }
    } catch (error) {
      console.warn('Error loading offline queue:', error);
      this.queue = [];
    }

    // Start monitoring network status
    this.startNetworkMonitoring();
  }

  private startNetworkMonitoring() {
    if (Platform.OS === 'web') {
      // Web: Listen to online event
      const handleOnline = () => {
        console.log('🌐 Back online, processing queue...');
        this.processQueue();
      };

      window.addEventListener('online', handleOnline);
    } else {
      // Native: Check network status periodically
      this.checkInterval = setInterval(async () => {
        try {
          const networkState = await Network.getNetworkStateAsync();
          if (networkState.isConnected && this.queue.length > 0) {
            this.processQueue();
          }
        } catch (error) {
          console.warn('Error checking network status:', error);
        }
      }, 5000); // Check every 5 seconds
    }
  }

  async addToQueue(action: QueuedAction['action'], data: any) {
    const queuedAction: QueuedAction = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      action,
      data,
      timestamp: Date.now(),
      retryCount: 0,
    };

    this.queue.push(queuedAction);
    await this.saveQueue();
    console.log('📦 Added to offline queue:', action, 'Queue size:', this.queue.length);

    // Try to process immediately if online
    this.processQueue();
  }

  private async saveQueue() {
    try {
      await storage.setItem('offline_queue', JSON.stringify(this.queue));
    } catch (error) {
      console.warn('Error saving offline queue:', error);
    }
  }

  private async isOnline(): Promise<boolean> {
    try {
      if (Platform.OS === 'web') {
        return navigator.onLine;
      } else {
        const networkState = await Network.getNetworkStateAsync();
        return networkState.isConnected ?? false;
      }
    } catch (error) {
      console.warn('Error checking online status:', error);
      return false;
    }
  }

  private async processQueue() {
    if (this.isProcessing || this.queue.length === 0) return;

    const online = await this.isOnline();
    if (!online) {
      console.log('📦 Offline, skipping queue processing');
      return;
    }

    this.isProcessing = true;
    console.log('📦 Processing offline queue:', this.queue.length, 'items');

    const processedItems: string[] = [];
    const failedItems: string[] = [];

    for (const item of this.queue) {
      try {
        await this.executeAction(item);
        processedItems.push(item.id);
        console.log('✅ Processed offline action:', item.action);
      } catch (error) {
        console.error('❌ Failed to process offline action:', item.action, error);
        
        // Increment retry count
        item.retryCount++;
        
        // Remove item if it has failed too many times (max 3 retries)
        if (item.retryCount >= 3) {
          console.warn('🗑️ Removing failed item after 3 retries:', item.action);
          failedItems.push(item.id);
        }
        
        // Don't continue processing if one fails
        break;
      }
    }

    // Remove processed and permanently failed items
    const itemsToRemove = [...processedItems, ...failedItems];
    this.queue = this.queue.filter(item => !itemsToRemove.includes(item.id));
    await this.saveQueue();

    console.log('📦 Queue processing complete. Remaining items:', this.queue.length);
    this.isProcessing = false;
  }

  private async executeAction(item: QueuedAction) {
    const { supabase } = await import('./supabase');

    switch (item.action) {
      case 'create_goal':
        const { error: createError } = await supabase
          .from('goals')
          .insert([item.data]);
        if (createError) throw createError;
        break;

      case 'update_goal':
        const { error: updateError } = await supabase
          .from('goals')
          .update(item.data.updates)
          .eq('id', item.data.id);
        if (updateError) throw updateError;
        break;

      case 'delete_goal':
        const { error: deleteError } = await supabase
          .from('goals')
          .delete()
          .eq('id', item.data.id);
        if (deleteError) throw deleteError;
        break;

      case 'save_run':
        const { error: runError } = await supabase
          .from('runs')
          .insert([item.data]);
        if (runError) throw runError;
        break;

      case 'create_achievement':
        const { error: achievementError } = await supabase
          .from('user_achievements')
          .insert([item.data]);
        if (achievementError) throw achievementError;
        break;

      default:
        throw new Error(`Unknown action: ${item.action}`);
    }
  }

  getQueueLength() {
    return this.queue.length;
  }

  async clearQueue() {
    this.queue = [];
    await this.saveQueue();
    console.log('📦 Queue cleared');
  }

  // Get queue status for debugging
  getQueueStatus() {
    return {
      length: this.queue.length,
      isProcessing: this.isProcessing,
      items: this.queue.map(item => ({
        action: item.action,
        timestamp: new Date(item.timestamp).toLocaleString(),
        retryCount: item.retryCount,
      })),
    };
  }

  // Cleanup resources
  destroy() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }
}

export const offlineQueue = new OfflineQueue();