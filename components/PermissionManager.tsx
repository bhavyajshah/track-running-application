import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { MapPin, Bell } from 'lucide-react-native';
import * as Location from 'expo-location';
import { useTheme } from '@/contexts/ThemeContext';
import AnimatedButton from '@/components/AnimatedButton';

interface Permission {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  status: 'granted' | 'denied' | 'undetermined';
  required: boolean;
}

interface PermissionManagerProps {
  onPermissionsComplete?: (permissions: Record<string, boolean>) => void;
}

export default function PermissionManager({ onPermissionsComplete }: PermissionManagerProps) {
  const { theme } = useTheme();
  const [permissions, setPermissions] = useState<Permission[]>([
    {
      id: 'location',
      name: 'Location',
      description: 'Required for GPS tracking during runs',
      icon: MapPin,
      status: 'undetermined',
      required: true,
    },
  ]);

  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    const updatedPermissions = await Promise.all(
      permissions.map(async (permission) => {
        let status: 'granted' | 'denied' | 'undetermined' = 'undetermined';
        
        try {
          switch (permission.id) {
            case 'location':
              if (Platform.OS === 'web') {
                // For web, check if geolocation is available
                status = navigator.geolocation ? 'undetermined' : 'denied';
              } else {
                const locationStatus = await Location.getForegroundPermissionsAsync();
                status = locationStatus.granted ? 'granted' : 
                        locationStatus.canAskAgain ? 'undetermined' : 'denied';
              }
              break;
          }
        } catch (error) {
          console.warn(`Error checking ${permission.id} permission:`, error);
        }

        return { ...permission, status };
      })
    );

    setPermissions(updatedPermissions);
    
    // Check if all required permissions are granted
    const requiredPermissions = updatedPermissions.filter(p => p.required);
    const allRequiredGranted = requiredPermissions.every(p => p.status === 'granted');
    
    if (allRequiredGranted && onPermissionsComplete) {
      const permissionMap = updatedPermissions.reduce((acc, p) => {
        acc[p.id] = p.status === 'granted';
        return acc;
      }, {} as Record<string, boolean>);
      onPermissionsComplete(permissionMap);
    }
  };

  const requestPermission = async (permissionId: string) => {
    try {
      let result: any = null;

      switch (permissionId) {
        case 'location':
          if (Platform.OS === 'web') {
            // For web, try to get current position to trigger permission request
            try {
              await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                  timeout: 5000,
                });
              });
              result = { granted: true };
            } catch (error) {
              result = { granted: false };
            }
          } else {
            result = await Location.requestForegroundPermissionsAsync();
          }
          break;
      }

      if (result) {
        setPermissions(prev => prev.map(p => 
          p.id === permissionId 
            ? { ...p, status: result.granted ? 'granted' : 'denied' }
            : p
        ));

        if (!result.granted) {
          const permission = permissions.find(p => p.id === permissionId);
          Alert.alert(
            'Permission Required',
            `${permission?.name} permission is needed for the app to function properly. You can enable it in Settings.`,
            Platform.OS === 'web' 
              ? [{ text: 'OK', style: 'default' }]
              : [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Settings', onPress: () => {} }
                ]
          );
        } else {
          checkPermissions(); // Recheck all permissions
        }
      }
    } catch (error) {
      console.warn(`Error requesting ${permissionId} permission:`, error);
      Alert.alert('Error', 'Failed to request permission. Please try again.');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'granted': return '#10B981';
      case 'denied': return '#EF4444';
      default: return '#F59E0B';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'granted': return 'Granted';
      case 'denied': return 'Denied';
      default: return 'Not Set';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
      <Text style={[styles.title, { color: theme.colors.text }]}>Location Permission</Text>
      <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
        Location access is required for GPS tracking during your runs
      </Text>

      {permissions.map((permission) => {
        const IconComponent = permission.icon;
        return (
          <View key={permission.id} style={[styles.permissionItem, { borderColor: theme.colors.border }]}>
            <View style={styles.permissionIcon}>
              <IconComponent size={24} color={theme.colors.primary} />
            </View>
            
            <View style={styles.permissionContent}>
              <View style={styles.permissionHeader}>
                <Text style={[styles.permissionName, { color: theme.colors.text }]}>
                  {permission.name}
                  {permission.required && <Text style={[styles.required, { color: '#EF4444' }]}> *</Text>}
                </Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(permission.status) + '20' }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(permission.status) }]}>
                    {getStatusText(permission.status)}
                  </Text>
                </View>
              </View>
              
              <Text style={[styles.permissionDescription, { color: theme.colors.textSecondary }]}>
                {permission.description}
              </Text>
              
              {permission.status !== 'granted' && (
                <AnimatedButton
                  style={[styles.requestButton, { backgroundColor: theme.colors.primary }]}
                  onPress={() => requestPermission(permission.id)}
                  hapticType="medium"
                >
                  <Text style={styles.requestButtonText}>
                    {permission.status === 'denied' ? 'Enable in Settings' : 'Grant Permission'}
                  </Text>
                </AnimatedButton>
              )}
            </View>
          </View>
        );
      })}

      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: theme.colors.textSecondary }]}>
          Location permission is required for GPS tracking and distance calculation during your runs
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    borderRadius: 16,
    margin: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    marginBottom: 24,
  },
  permissionItem: {
    flexDirection: 'row',
    padding: 16,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 12,
  },
  permissionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  permissionContent: {
    flex: 1,
  },
  permissionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  permissionName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    flex: 1,
  },
  required: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  permissionDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginBottom: 12,
    lineHeight: 20,
  },
  requestButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  requestButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  footer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(139, 92, 246, 0.1)',
  },
  footerText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});