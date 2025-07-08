import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { storage } from './storage';

const LOCATION_TASK_NAME = 'background-location-task';
const BACKGROUND_NOTIFICATION_ID = 'background-tracking';

interface BackgroundLocationData {
  locations: Location.LocationObject[];
}

interface LocationUpdate {
  latitude: number;
  longitude: number;
  timestamp: number;
  speed: number | null;
  altitude: number | null;
  accuracy: number | null;
}

class BackgroundLocationService {
  private isTracking = false;
  private locationUpdates: LocationUpdate[] = [];
  private startTime: number | null = null;

  // Define background task
  setupBackgroundTask() {
    TaskManager.defineTask(LOCATION_TASK_NAME, ({ data, error }: any) => {
      if (error) {
        console.error('Background location task error:', error);
        return;
      }

      if (data) {
        const { locations } = data as BackgroundLocationData;
        
        locations.forEach((location) => {
          const update: LocationUpdate = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            timestamp: location.timestamp,
            speed: location.coords.speed,
            altitude: location.coords.altitude,
            accuracy: location.coords.accuracy,
          };
          
          this.addLocationUpdate(update);
        });

        // Update persistent notification
        this.updateTrackingNotification();
      }
    });
  }

  async startBackgroundTracking(): Promise<boolean> {
    if (Platform.OS === 'web') {
      console.warn('Background tracking not supported on web');
      return false;
    }

    try {
      // Request permissions
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      if (foregroundStatus !== 'granted') {
        throw new Error('Foreground location permission denied');
      }

      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      if (backgroundStatus !== 'granted') {
        throw new Error('Background location permission denied');
      }

      // Setup notification permissions
      const { status: notificationStatus } = await Notifications.requestPermissionsAsync();
      if (notificationStatus !== 'granted') {
        console.warn('Notification permission denied');
      }

      // Start background location tracking
      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: Location.Accuracy.High,
        timeInterval: 1000, // Update every second
        distanceInterval: 1, // Update every meter
        foregroundService: {
          notificationTitle: 'RunTracker Active',
          notificationBody: 'Tracking your run in the background',
          notificationColor: '#8B5CF6',
        },
      });

      this.isTracking = true;
      this.startTime = Date.now();
      
      // Show persistent notification
      await this.showTrackingNotification();
      
      // Store tracking state
      await storage.setItem('background_tracking', 'true');
      await storage.setItem('tracking_start_time', this.startTime.toString());

      return true;
    } catch (error) {
      console.error('Failed to start background tracking:', error);
      return false;
    }
  }

  async stopBackgroundTracking(): Promise<void> {
    if (Platform.OS === 'web') return;

    try {
      const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
      if (isRegistered) {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      }

      this.isTracking = false;
      this.startTime = null;

      // Hide notification
      await Notifications.dismissNotificationAsync(BACKGROUND_NOTIFICATION_ID);
      
      // Clear tracking state
      await storage.removeItem('background_tracking');
      await storage.removeItem('tracking_start_time');

    } catch (error) {
      console.error('Failed to stop background tracking:', error);
    }
  }

  async pauseBackgroundTracking(): Promise<void> {
    if (Platform.OS === 'web') return;

    try {
      const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
      if (isRegistered) {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      }

      // Update notification to show paused state
      await this.showPausedNotification();
      
    } catch (error) {
      console.error('Failed to pause background tracking:', error);
    }
  }

  async resumeBackgroundTracking(): Promise<boolean> {
    if (Platform.OS === 'web') return false;

    try {
      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: Location.Accuracy.High,
        timeInterval: 1000,
        distanceInterval: 1,
        foregroundService: {
          notificationTitle: 'RunTracker Active',
          notificationBody: 'Tracking your run in the background',
          notificationColor: '#8B5CF6',
        },
      });

      await this.showTrackingNotification();
      return true;
    } catch (error) {
      console.error('Failed to resume background tracking:', error);
      return false;
    }
  }

  private addLocationUpdate(update: LocationUpdate): void {
    this.locationUpdates.push(update);
    
    // Keep only last 1000 updates to prevent memory issues
    if (this.locationUpdates.length > 1000) {
      this.locationUpdates = this.locationUpdates.slice(-1000);
    }
  }

  private async showTrackingNotification(): Promise<void> {
    if (Platform.OS === 'web') return;

    const duration = this.startTime ? Math.floor((Date.now() - this.startTime) / 1000) : 0;
    const distance = this.calculateTotalDistance();

    await Notifications.scheduleNotificationAsync({
      identifier: BACKGROUND_NOTIFICATION_ID,
      content: {
        title: 'RunTracker Active',
        body: `Distance: ${distance.toFixed(2)}km • Time: ${this.formatDuration(duration)}`,
        categoryIdentifier: 'run-tracking',
        data: { tracking: true },
      },
      trigger: null,
    });
  }

  private async showPausedNotification(): Promise<void> {
    if (Platform.OS === 'web') return;

    await Notifications.scheduleNotificationAsync({
      identifier: BACKGROUND_NOTIFICATION_ID,
      content: {
        title: 'RunTracker Paused',
        body: 'Tap to resume tracking',
        categoryIdentifier: 'run-paused',
        data: { tracking: false },
      },
      trigger: null,
    });
  }

  private async updateTrackingNotification(): Promise<void> {
    if (this.isTracking) {
      await this.showTrackingNotification();
    }
  }

  private calculateTotalDistance(): number {
    if (this.locationUpdates.length < 2) return 0;

    let totalDistance = 0;
    for (let i = 1; i < this.locationUpdates.length; i++) {
      const prev = this.locationUpdates[i - 1];
      const curr = this.locationUpdates[i];
      
      // Simple distance calculation (Haversine would be more accurate)
      const distance = this.getDistanceBetweenPoints(
        prev.latitude, prev.longitude,
        curr.latitude, curr.longitude
      );
      
      totalDistance += distance;
    }

    return totalDistance;
  }

  private getDistanceBetweenPoints(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  // Public getters
  getIsTracking(): boolean {
    return this.isTracking;
  }

  getLocationUpdates(): LocationUpdate[] {
    return [...this.locationUpdates];
  }

  getTotalDistance(): number {
    return this.calculateTotalDistance();
  }

  getDuration(): number {
    return this.startTime ? Math.floor((Date.now() - this.startTime) / 1000) : 0;
  }

  // Check if background tracking was active when app was closed
  async checkBackgroundState(): Promise<boolean> {
    try {
      const wasTracking = await storage.getItem('background_tracking');
      const startTimeStr = await storage.getItem('tracking_start_time');
      
      if (wasTracking === 'true' && startTimeStr) {
        this.startTime = parseInt(startTimeStr, 10);
        this.isTracking = true;
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error checking background state:', error);
      return false;
    }
  }

  // Clear all stored data
  clearData(): void {
    this.locationUpdates = [];
    this.startTime = null;
    this.isTracking = false;
  }
}

export const backgroundLocationService = new BackgroundLocationService();

// Initialize background task when module loads
backgroundLocationService.setupBackgroundTask();