import { useEffect, useState, useCallback } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider } from '@/contexts/AuthContext';
import NetworkStatus from '@/components/NetworkStatus';
import { offlineQueue } from '@/lib/offline-queue';

// Prevent the splash screen from auto-hiding
SplashScreen.preventAutoHideAsync().catch(() => {
  // Handle any errors silently
});

export default function RootLayout() {
  useFrameworkReady();

  // Initialize offline queue
  useEffect(() => {
    offlineQueue.initialize();
  }, []);

  const [fontsLoaded, fontError] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
  });

  // Hide splash screen as soon as fonts are loaded (or failed to load)
  useEffect(() => {
    if (fontsLoaded || fontError) {
      console.log('🚀 Fonts ready, hiding splash screen');
      SplashScreen.hideAsync().catch(() => {
        // Handle any errors silently
      });
    }
  }, [fontsLoaded, fontError]);

  // Don't render anything until fonts are ready
  if (!fontsLoaded && !fontError) {
    console.log('⏳ Waiting for fonts to load...');
    return null;
  }

  console.log('🎯 Rendering app with fonts loaded:', fontsLoaded);

  return (
    <ThemeProvider>
      <AuthProvider>
        <NetworkStatus />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="auth" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="activeRun" options={{ headerShown: false }} />
          <Stack.Screen name="runDetails" options={{ headerShown: false }} />
          <Stack.Screen name="settings" options={{ headerShown: false }} />
          <Stack.Screen name="achievements" options={{ headerShown: false }} />
          <Stack.Screen name="goals" options={{ headerShown: false }} />
          <Stack.Screen name="+not-found" />
        </Stack>
        <StatusBar style="light" />
      </AuthProvider>
    </ThemeProvider>
  );
}