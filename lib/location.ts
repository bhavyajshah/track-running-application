  import * as Location from 'expo-location';
  import { Platform } from 'react-native';
  import { getDistance, getSpeed } from './geolib';
  
  export interface LocationData {
    latitude: number;
    longitude: number;
    speed: number | null;
    accuracy: number | null;
    altitude: number | null;
    timestamp: number;
  }
  
  export interface RunStats {
    distance: number;
    speed: number;
    maxSpeed: number;
    avgSpeed: number;
    elevationGain: number;
    duration: number;
    pace: string;
    calories: number;
  }
  
  export class LocationService {
    private watchId: Location.LocationSubscription | null = null;
    private webWatchId: number | null = null;
    private isTracking = false;
    private lastLocation: LocationData | null = null;
    private startTime: number | null = null;
    private permissionGranted = false;
    private runStats: RunStats = {
      distance: 0,
      speed: 0,
      maxSpeed: 0,
      avgSpeed: 0,
      elevationGain: 0,
      duration: 0,
      pace: '0:00',
      calories: 0,
    };
    private coordinates: LocationData[] = [];
    private speedHistory: number[] = [];
  
    async requestPermissions(): Promise<boolean> {
      try {
        if (Platform.OS === 'web') {
          // For web, check if geolocation is supported
          if (!navigator.geolocation) {
            console.warn('Geolocation is not supported by this browser');
            return false;
          }
          
          // Try to get permission by requesting current position
          try {
            await new Promise<GeolocationPosition>((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, {
                timeout: 5000,
                enableHighAccuracy: false,
              });
            });
            this.permissionGranted = true;
            console.log('Web geolocation permission granted');
            return true;
          } catch (error: any) {
            console.warn('Web geolocation permission denied:', error.message);
            return false;
          }
        }
  
        const { status } = await Location.requestForegroundPermissionsAsync();
        this.permissionGranted = status === 'granted';
        console.log('Location permission status:', status);
        return this.permissionGranted;
      } catch (error) {
        console.error('Error requesting location permissions:', error);
        return false;
      }
    }
  
    async getCurrentLocation(): Promise<LocationData | null> {
      try {
        if (Platform.OS === 'web') {
          return new Promise((resolve) => {
            if (!navigator.geolocation) {
              console.warn('Geolocation not supported');
              resolve(null);
              return;
            }
            
            navigator.geolocation.getCurrentPosition(
              (position) => {
                this.permissionGranted = true;
                const locationData: LocationData = {
                  latitude: position.coords.latitude,
                  longitude: position.coords.longitude,
                  speed: position.coords.speed,
                  accuracy: position.coords.accuracy,
                  altitude: position.coords.altitude,
                  timestamp: Date.now(),
                };
                console.log('Web location obtained:', locationData);
                resolve(locationData);
              },
              (error) => {
                console.warn('Web geolocation error:', error.message);
                resolve(null);
              },
              {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 30000, // 30 seconds cache
              }
            );
          });
        }
  
        if (!this.permissionGranted) {
          const hasPermission = await this.requestPermissions();
          if (!hasPermission) {
            console.warn('Location permission not granted');
            return null;
          }
        }
  
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
          timeoutMs: 10000,
        });
  
        const locationData: LocationData = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          speed: location.coords.speed,
          accuracy: location.coords.accuracy,
          altitude: location.coords.altitude,
          timestamp: Date.now(),
        };
  
        console.log('Native location obtained:', locationData);
        return locationData;
      } catch (error) {
        console.warn('Error getting current location:', error);
        return null;
      }
    }
  
    async startTracking(
      locationCallback: (location: LocationData) => void,
      statsCallback: (stats: RunStats) => void
    ): Promise<boolean> {
      if (this.isTracking) return true;
  
      console.log('Starting location tracking...');
      
      // Reset tracking data
      this.resetTrackingData();
      this.startTime = Date.now();
  
      try {
        if (Platform.OS === 'web') {
          if (!navigator.geolocation) {
            console.error('Geolocation not supported');
            return false;
          }
          
          this.webWatchId = navigator.geolocation.watchPosition(
            (position) => {
              const locationData: LocationData = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                speed: position.coords.speed,
                accuracy: position.coords.accuracy,
                altitude: position.coords.altitude,
                timestamp: Date.now(),
              };
              
              console.log('Web location update:', locationData);
              this.updateRunStats(locationData);
              locationCallback(locationData);
              statsCallback(this.runStats);
            },
            (error) => {
              console.warn('Web location tracking error:', error.message);
            },
            {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 1000,
            }
          );
          
          this.isTracking = true;
          console.log('Web location tracking started');
          return true;
        }
  
        if (!this.permissionGranted) {
          const hasPermission = await this.requestPermissions();
          if (!hasPermission) {
            console.error('Location permission required for tracking');
            return false;
          }
        }
  
        this.watchId = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 500, // Update every 500ms for better tracking
            distanceInterval: 1,
          },
          (location) => {
            const locationData: LocationData = {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              speed: location.coords.speed,
              accuracy: location.coords.accuracy,
              altitude: location.coords.altitude,
              timestamp: Date.now(),
            };
            
            console.log('Native location update:', locationData);
            this.updateRunStats(locationData);
            locationCallback(locationData);
            statsCallback(this.runStats);
          }
        );
  
        this.isTracking = true;
        console.log('Native location tracking started');
        return true;
      } catch (error) {
        console.error('Error starting location tracking:', error);
        return false;
      }
    }
  
    private updateRunStats(location: LocationData): void {
      this.coordinates.push(location);
      
      if (this.lastLocation) {
        // Calculate distance increment
        const distanceIncrement = getDistance(this.lastLocation, location);
        
        // Only add distance if it's reasonable (not GPS noise)
        if (distanceIncrement > 0 && distanceIncrement < 0.05) { // Max 50m between updates
          this.runStats.distance += distanceIncrement;
          console.log('📏 Distance increment:', distanceIncrement.toFixed(4), 'km, Total:', this.runStats.distance.toFixed(2), 'km');
        }
        
        // Calculate current speed
        const timeDiff = (location.timestamp - this.lastLocation.timestamp) / 1000; // seconds
        const currentSpeed = timeDiff > 0 ? (distanceIncrement / timeDiff) * 3600 : 0; // km/h
        
        if (currentSpeed >= 0 && currentSpeed < 30) { // Filter unrealistic speeds (max 30 km/h)
          this.runStats.speed = currentSpeed;
          
          if (currentSpeed > 0.1) { // Only record significant speeds
            this.speedHistory.push(currentSpeed);
          }
          
          // Update max speed
          if (currentSpeed > this.runStats.maxSpeed) {
            this.runStats.maxSpeed = currentSpeed;
          }
          
          // Calculate average speed
          if (this.speedHistory.length > 0) {
            this.runStats.avgSpeed = this.speedHistory.reduce((a, b) => a + b, 0) / this.speedHistory.length;
          }
        }
        
        // Calculate elevation gain
        if (location.altitude && this.lastLocation.altitude) {
          const elevationDiff = location.altitude - this.lastLocation.altitude;
          if (elevationDiff > 0) {
            this.runStats.elevationGain += elevationDiff;
          }
        }
      }
      
      // Update duration
      if (this.startTime) {
        this.runStats.duration = Math.floor((Date.now() - this.startTime) / 1000);
      }
      
      // Calculate pace
      if (this.runStats.avgSpeed > 0) {
        const paceMinutes = 60 / this.runStats.avgSpeed;
        const minutes = Math.floor(paceMinutes);
        const seconds = Math.round((paceMinutes - minutes) * 60);
        this.runStats.pace = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      }
      
      // Calculate calories (rough estimate)
      this.runStats.calories = Math.round(this.runStats.distance * 65); // ~65 calories per km
      
      this.lastLocation = location;
      
      console.log('📊 Updated stats:', {
        distance: this.runStats.distance.toFixed(2) + 'km',
        speed: this.runStats.speed.toFixed(1) + 'km/h',
        pace: this.runStats.pace,
        calories: this.runStats.calories
      });
    }
  
    private resetTrackingData(): void {
      this.runStats = {
        distance: 0,
        speed: 0,
        maxSpeed: 0,
        avgSpeed: 0,
        elevationGain: 0,
        duration: 0,
        pace: '0:00',
        calories: 0,
      };
      this.coordinates = [];
      this.speedHistory = [];
      this.lastLocation = null;
    }
  
    pauseTracking(): void {
      if (Platform.OS === 'web' && this.webWatchId !== null) {
        navigator.geolocation.clearWatch(this.webWatchId);
        this.webWatchId = null;
      } else if (this.watchId) {
        this.watchId.remove();
        this.watchId = null;
      }
      this.isTracking = false;
      console.log('Location tracking paused');
    }
  
    resumeTracking(
      locationCallback: (location: LocationData) => void,
      statsCallback: (stats: RunStats) => void
    ): Promise<boolean> {
      console.log('Resuming location tracking...');
      return this.startTrackingInternal(locationCallback, statsCallback);
    }
  
    private async startTrackingInternal(
      locationCallback: (location: LocationData) => void,
      statsCallback: (stats: RunStats) => void
    ): Promise<boolean> {
      try {
        if (Platform.OS === 'web') {
          if (!navigator.geolocation) return false;
          
          this.webWatchId = navigator.geolocation.watchPosition(
            (position) => {
              const locationData: LocationData = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                speed: position.coords.speed,
                accuracy: position.coords.accuracy,
                altitude: position.coords.altitude,
                timestamp: Date.now(),
              };
              
              this.updateRunStats(locationData);
              locationCallback(locationData);
              statsCallback(this.runStats);
            },
            (error) => {
              console.warn('Web location resume error:', error.message);
            },
            {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 1000,
            }
          );
          
          this.isTracking = true;
          return true;
        }
  
        this.watchId = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 500,
            distanceInterval: 1,
          },
          (location) => {
            const locationData: LocationData = {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              speed: location.coords.speed,
              accuracy: location.coords.accuracy,
              altitude: location.coords.altitude,
              timestamp: Date.now(),
            };
            
            this.updateRunStats(locationData);
            locationCallback(locationData);
            statsCallback(this.runStats);
          }
        );
  
        this.isTracking = true;
        return true;
      } catch (error) {
        console.error('Error resuming location tracking:', error);
        return false;
      }
    }
  
    stopTracking(): void {
      if (Platform.OS === 'web' && this.webWatchId !== null) {
        navigator.geolocation.clearWatch(this.webWatchId);
        this.webWatchId = null;
      } else if (this.watchId) {
        this.watchId.remove();
        this.watchId = null;
      }
      this.isTracking = false;
      console.log('Location tracking stopped');
    }
  
    getIsTracking(): boolean {
      return this.isTracking;
    }
  
    getCurrentStats(): RunStats {
      return { ...this.runStats };
    }
  
    getCoordinates(): LocationData[] {
      return [...this.coordinates];
    }
  
    getRunData() {
      return {
        distance: this.runStats.distance,
        duration: this.runStats.duration,
        coordinates: this.coordinates,
        avgSpeed: this.runStats.avgSpeed,
        maxSpeed: this.runStats.maxSpeed,
        elevationGain: this.runStats.elevationGain,
        pace: this.runStats.pace,
        calories: this.runStats.calories,
      };
    }
  
    // Check if location services are available and permissions granted
    isLocationAvailable(): boolean {
      if (Platform.OS === 'web') {
        return !!navigator.geolocation;
      }
      return this.permissionGranted;
    }
  
    // Check permission status without requesting
    async checkPermissionStatus(): Promise<boolean> {
      try {
        if (Platform.OS === 'web') {
          if (!navigator.geolocation) {
            console.log('❌ Web geolocation not supported');
            return false;
          }
          
          // For web, try to get current position to check permission
          try {
            await new Promise<GeolocationPosition>((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, {
                timeout: 3000,
              });
            });
            console.log('✅ Web location permission granted');
            this.permissionGranted = true;
            return true;
          } catch (error) {
            console.log('❌ Web location permission denied');
            return false;
          }
        }
        const { status } = await Location.getForegroundPermissionsAsync();
        this.permissionGranted = status === 'granted';
        return this.permissionGranted;
      } catch (error) {
        console.error('Error checking permission status:', error);
        return false;
      }
    }
  }
  
  export const locationService = new LocationService();