import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { MapPin, Bell } from 'lucide-react-native';
import * as Location from 'expo-location';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
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
      description: 'Required for GPS tracking during runs. This allows us to calculate distance, pace, and map your route accurately.',
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
        let status: 'granted' | 'denied' | 'undetermined' = permission.status;

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
                console.log('📍 Location permission status:', status);
                console.log('📍 Location permission status:', status);
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
    const allRequiredGranted = requiredPermissions.length > 0 &&
      requiredPermissions.every(p => p.status === 'granted');
    requiredPermissions.every(p => p.status === 'granted');

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
              await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                  timeout: 15000,
                  enableHighAccuracy: true,
                  enableHighAccuracy: true,
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
                { text: 'Settings', onPress: () => { } }
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
    <View style={styles.modalOverlay}>
      <LinearGradient
        colors={['#8B5CF6', '#A855F7', '#C084FC']}
        style={styles.gradientHeader}
      >
        <SafeAreaView>
          <Text style={styles.headerTitle}>Location Access</Text>
          <Text style={styles.headerSubtitle}>
            Enable location services to track your runs
          </Text>
        </SafeAreaView>
      </LinearGradient>

      <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>

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

                  {permission.status === 'denied' && (
                    <View style={[styles.warningBox, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
                      <Text style={[styles.warningText, { color: '#EF4444' }]}>
                        Location permission was denied. Please enable it in your device settings to use run tracking.
                      </Text>
                    </View>
                  )}

                  {permission.status === 'denied' && (
                    <View style={[styles.warningBox, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
                      <Text style={[styles.warningText, { color: '#EF4444' }]}>
                        Location permission was denied. Please enable it in your device settings to use run tracking.
                      </Text>
                    </View>
                  )}
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
    </View>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  gradientHeader: {
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  container: {
    padding: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -20,
    flex: 1,
  },
  permissionItem: {
    flexDirection: 'row',
    padding: 20,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 12,
  },
  permissionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  permissionContent: {
    flex: 1,
  },
  permissionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  permissionName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    flex: 1,
    marginRight: 12,
  },
  required: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  permissionDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginTop: 12,
    marginBottom: 16,
    lineHeight: 20,
  },
  requestButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  requestButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  warningBox: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
    marginBottom: 8,
  },
  warningText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    lineHeight: 16,
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