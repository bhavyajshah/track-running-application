import { supabase } from './supabase';
import { locationService } from './location';
import { backgroundLocationService } from './background-location';

export interface LiveTrackingData {
  userId: string;
  runId: string;
  latitude: number;
  longitude: number;
  speed: number;
  distance: number;
  duration: number;
  pace: string;
  heartRate?: number;
  timestamp: number;
}

export interface LiveShare {
  id: string;
  runId: string;
  shareCode: string;
  isActive: boolean;
  expiresAt: string;
  viewerCount: number;
}

class RealTimeTrackingService {
  private channel: any = null;
  private isSharing = false;
  private shareId: string | null = null;
  private updateInterval: NodeJS.Timeout | null = null;

  // Start live sharing for a run
  async startLiveShare(runId: string): Promise<string | null> {
    try {
      const shareCode = this.generateShareCode();
      const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000); // 4 hours from now

      const { data: liveShare, error } = await supabase
        .from('live_shares')
        .insert({
          run_id: runId,
          share_code: shareCode,
          is_active: true,
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      this.shareId = liveShare.id;
      this.isSharing = true;

      // Subscribe to the sharing channel
      this.channel = supabase.channel(`live-run-${shareCode}`)
        .on('presence', { event: 'sync' }, () => {
          const viewers = this.channel.presenceState();
          this.updateViewerCount(Object.keys(viewers).length);
        })
        .subscribe();

      // Start sending live updates
      this.startLiveUpdates();

      return shareCode;
    } catch (error) {
      console.error('Error starting live share:', error);
      return null;
    }
  }

  // Stop live sharing
  async stopLiveShare(): Promise<void> {
    try {
      if (this.shareId) {
        await supabase
          .from('live_shares')
          .update({ is_active: false })
          .eq('id', this.shareId);
      }

      this.stopLiveUpdates();
      
      if (this.channel) {
        await supabase.removeChannel(this.channel);
        this.channel = null;
      }

      this.isSharing = false;
      this.shareId = null;
    } catch (error) {
      console.error('Error stopping live share:', error);
    }
  }

  // Join a live run as viewer
  async joinLiveRun(shareCode: string): Promise<boolean> {
    try {
      const { data: liveShare, error } = await supabase
        .from('live_shares')
        .select('*')
        .eq('share_code', shareCode)
        .eq('is_active', true)
        .single();

      if (error || !liveShare) {
        throw new Error('Live run not found or expired');
      }

      // Check if not expired
      if (new Date(liveShare.expires_at) < new Date()) {
        throw new Error('Live run has expired');
      }

      // Subscribe to live updates
      this.channel = supabase.channel(`live-run-${shareCode}`)
        .on('broadcast', { event: 'location-update' }, (payload) => {
          this.handleLiveUpdate(payload);
        })
        .on('presence', { event: 'sync' }, () => {
          const viewers = this.channel.presenceState();
          console.log('Viewer count:', Object.keys(viewers).length);
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await this.channel.track({ viewer: true });
          }
        });

      return true;
    } catch (error) {
      console.error('Error joining live run:', error);
      return false;
    }
  }

  // Leave live run
  async leaveLiveRun(): Promise<void> {
    if (this.channel) {
      await supabase.removeChannel(this.channel);
      this.channel = null;
    }
  }

  // Send live tracking update
  private async sendLiveUpdate(data: LiveTrackingData): Promise<void> {
    if (!this.channel || !this.isSharing) return;

    try {
      await this.channel.send({
        type: 'broadcast',
        event: 'location-update',
        payload: data,
      });
    } catch (error) {
      console.error('Error sending live update:', error);
    }
  }

  // Start sending periodic updates
  private startLiveUpdates(): void {
    if (this.updateInterval) return;

    this.updateInterval = setInterval(async () => {
      const currentStats = locationService.getCurrentStats();
      const currentLocation = await locationService.getCurrentLocation();

      if (currentLocation && this.isSharing) {
        const liveData: LiveTrackingData = {
          userId: '', // Will be set by auth context
          runId: '', // Will be set by the calling component
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          speed: currentStats.speed,
          distance: currentStats.distance,
          duration: currentStats.duration,
          pace: currentStats.pace,
          heartRate: undefined,
          timestamp: Date.now(),
        };

        await this.sendLiveUpdate(liveData);
      }
    }, 2000); // Update every 2 seconds
  }

  // Stop sending updates
  private stopLiveUpdates(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  // Handle incoming live updates
  private handleLiveUpdate(payload: { payload: LiveTrackingData }): void {
    const data = payload.payload;
    
    // Emit event for components to listen to
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('liveTrackingUpdate', { detail: data }));
    }
  }

  // Update viewer count
  private async updateViewerCount(count: number): Promise<void> {
    if (!this.shareId) return;

    try {
      await supabase
        .from('live_shares')
        .update({ viewer_count: count })
        .eq('id', this.shareId);
    } catch (error) {
      console.error('Error updating viewer count:', error);
    }
  }

  // Generate random share code
  private generateShareCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }


  // Public getters
  getIsSharing(): boolean {
    return this.isSharing;
  }

  getShareId(): string | null {
    return this.shareId;
  }
}

export const realTimeTrackingService = new RealTimeTrackingService();