import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import * as Network from 'expo-network';
import { Wifi, WifiOff, Smartphone } from 'lucide-react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

interface NetworkState {
  isConnected: boolean;
  type: string;
}

export default function NetworkStatus() {
  const [networkState, setNetworkState] = useState<NetworkState>({
    isConnected: true,
    type: 'unknown'
  });
  const [previousState, setPreviousState] = useState<NetworkState | null>(null);
  const [showStatus, setShowStatus] = useState(false);

  const opacity = useSharedValue(0);
  const translateY = useSharedValue(-50);

  // Check network status
  const checkNetworkStatus = async () => {
    try {
      if (Platform.OS === 'web') {
        // Web implementation using navigator.onLine
        const isConnected = navigator.onLine;
        const connectionType = (navigator as any).connection?.effectiveType || 'unknown';
        
        return {
          isConnected,
          type: isConnected ? connectionType : 'none'
        };
      } else {
        // Native implementation using expo-network
        const networkState = await Network.getNetworkStateAsync();
        return {
          isConnected: networkState.isConnected ?? false,
          type: networkState.type || 'unknown'
        };
      }
    } catch (error) {
      console.warn('Error checking network status:', error);
      return { isConnected: true, type: 'unknown' };
    }
  };

  // Initialize network monitoring
  useEffect(() => {
    let interval: NodeJS.Timeout;

    const startMonitoring = async () => {
      // Initial check
      const initialState = await checkNetworkStatus();
      setNetworkState(initialState);
      setPreviousState(initialState);

      if (Platform.OS === 'web') {
        // Web: Listen to online/offline events
        const handleOnline = async () => {
          const state = await checkNetworkStatus();
          updateNetworkState(state);
        };

        const handleOffline = async () => {
          const state = await checkNetworkStatus();
          updateNetworkState(state);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
          window.removeEventListener('online', handleOnline);
          window.removeEventListener('offline', handleOffline);
        };
      } else {
        // Native: Poll network status
        interval = setInterval(async () => {
          const state = await checkNetworkStatus();
          updateNetworkState(state);
        }, 3000);

        return () => clearInterval(interval);
      }
    };

    const updateNetworkState = (newState: NetworkState) => {
      if (previousState && 
          (previousState.isConnected !== newState.isConnected || 
           previousState.type !== newState.type)) {
        
        console.log('🌐 Network status changed:', newState);
        setNetworkState(newState);
        showNetworkToast();
      }
      
      setNetworkState(newState);
      setPreviousState(newState);
    };

    const cleanup = startMonitoring();
    
    return () => {
      if (interval) clearInterval(interval);
      cleanup?.then(fn => fn?.());
    };
  }, []);

  const showNetworkToast = () => {
    setShowStatus(true);
    opacity.value = withTiming(1, { duration: 300 });
    translateY.value = withSpring(0);

    // Hide after 5 seconds (increased for better visibility in Expo Go)
    setTimeout(() => {
      opacity.value = withTiming(0, { duration: 300 });
      translateY.value = withTiming(-50, { duration: 300 });
      setTimeout(() => setShowStatus(false), 300);
    }, 5000);
  };

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [{ translateY: translateY.value }],
    };
  });

  const getConnectionIcon = () => {
    if (!networkState.isConnected) {
      return <WifiOff size={16} color="#FFFFFF" />;
    }
    
    if (networkState.type === 'cellular') {
      return <Smartphone size={16} color="#FFFFFF" />;
    }
    
    return <Wifi size={16} color="#FFFFFF" />;
  };

  const getConnectionText = () => {
    if (!networkState.isConnected) {
      return 'No internet connection';
    }
    
    const typeDisplayName = {
      'wifi': 'WiFi',
      'cellular': 'Cellular',
      'ethernet': 'Ethernet',
      'unknown': 'Network'
    }[networkState.type] || 'Network';
    
    return `Connected via ${typeDisplayName}`;
  };

  if (!showStatus) return null;

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <View style={[
        styles.statusBar, 
        { backgroundColor: networkState.isConnected ? '#10B981' : '#EF4444' }
      ]}>
        {getConnectionIcon()}
        <Text style={styles.statusText}>
          {getConnectionText()}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 25,
    left: 20,
    right: 20,
    zIndex: 1000,
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    gap: 10,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
  },
});