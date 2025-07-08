import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { storage } from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  date_of_birth?: string;
  weight: number;
  height: number;
  fitness_level: string;
  weekly_goal: number;
  preferred_units: string;
  preferences: {
    notifications?: boolean;
    privacy?: boolean;
    push_notifications?: boolean;
    email_notifications?: boolean;
  };
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: UserProfile | null;
  session: Session | null;
  isLoading: boolean;
  isOnboarded: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const router = useRouter();
  const segments = useSegments();

  // Initialize auth system
  useEffect(() => {
    initializeAuth();
  }, []);

  // Set up auth listener
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔐 Auth state changed:', event);
        setSession(session);
        
        if (session?.user) {
          await loadUserProfile(session.user);
        } else {
          setUser(null);
        }
        
        setIsLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Handle navigation
  useEffect(() => {
    if (!initialized || isLoading) return;
    
    const inAuth = segments[0] === 'auth';
    const inOnboarding = segments[0] === 'onboarding';
    const inTabs = segments[0] === '(tabs)';
    const inValidAppRoute = [
      'activeRun',
      'settings', 
      'achievements',
      'goals',
      'runDetails'
    ].includes(segments[0] || '');

    console.log('🧭 Navigation check:', { 
      currentSegment: segments[0],
      hasSession: !!session,
      isOnboarded, 
      inAuth,
      inOnboarding,
      inTabs,
      inValidAppRoute
    });

    // Navigation logic
    if (!isOnboarded && !inOnboarding) {
      console.log('📍 Redirecting to onboarding');
      router.replace('/onboarding');
    } else if (isOnboarded && !session && !inAuth) {
      console.log('📍 Redirecting to auth');
      router.replace('/auth');
    } else if (isOnboarded && session && inAuth) {
      // Only redirect from auth to tabs when authenticated
      console.log('📍 Redirecting to main app');
      router.replace('/(tabs)');
    }
  }, [initialized, isLoading, isOnboarded, session, segments]);

  const initializeAuth = async () => {
    console.log('🚀 Initializing auth...');
    
    try {
      // Check onboarding status
      const onboardingComplete = await storage.getItem('onboarding_complete');
      setIsOnboarded(!!onboardingComplete);
      console.log('✅ Onboarding status:', !!onboardingComplete);
      
      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      console.log('✅ Session check:', !!session);
      
      setSession(session);
      
      if (session?.user) {
        await loadUserProfile(session.user);
      }
      
    } catch (error) {
      console.error('❌ Auth init error:', error);
    } finally {
      setIsLoading(false);
      setInitialized(true);
      console.log('✅ Auth initialized');
    }
  };

  const loadUserProfile = async (authUser: SupabaseUser) => {
    try {
      console.log('👤 Loading profile for:', authUser.id);
      
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.warn('⚠️ Profile error, using fallback');
        setUser(createBasicProfile(authUser));
        return;
      }

      if (profile) {
        setUser(profile);
        console.log('✅ Profile loaded');
      } else {
        await createUserProfile(authUser);
      }
    } catch (error) {
      console.warn('⚠️ Profile load failed, using fallback');
      setUser(createBasicProfile(authUser));
    }
  };

  const createBasicProfile = (authUser: SupabaseUser): UserProfile => ({
    id: authUser.id,
    email: authUser.email!,
    full_name: authUser.user_metadata?.full_name || authUser.email!.split('@')[0],
    weight: 70,
    height: 170,
    fitness_level: 'beginner',
    weekly_goal: 50,
    preferred_units: 'metric',
    preferences: {
      notifications: true,
      privacy: true,
      push_notifications: false,
      email_notifications: false,
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  const createUserProfile = async (authUser: SupabaseUser) => {
    try {
      const profileData = {
        id: authUser.id,
        email: authUser.email!,
        full_name: authUser.user_metadata?.full_name || authUser.email!.split('@')[0],
        avatar_url: authUser.user_metadata?.avatar_url,
        weight: 70,
        height: 170,
        fitness_level: 'beginner',
        weekly_goal: 50,
        preferred_units: 'metric',
      };

      const { data: profile, error } = await supabase
        .from('profiles')
        .insert([profileData])
        .select()
        .single();

      if (error) {
        console.warn('⚠️ Profile creation error');
        setUser(createBasicProfile(authUser));
      } else {
        // Ensure preferences exist
        const profileWithPreferences = {
          ...profile,
          preferences: profile.preferences || {
            notifications: true,
            privacy: true,
            push_notifications: false,
            email_notifications: false,
          }
        };
        setUser(profileWithPreferences);
        setUser(profile);
        console.log('✅ Profile created');
      }
    } catch (error) {
      console.warn('❌ Profile creation failed');
      setUser(createBasicProfile(authUser));
    }
  };

  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
    } catch (error: any) {
      setIsLoading(false);
      throw new Error(error.message || 'Invalid credentials');
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    setIsLoading(true);
        // Ensure preferences exist
        const profileWithPreferences = {
          ...profile,
          preferences: profile.preferences || {
            notifications: true,
            privacy: true,
            push_notifications: false,
            email_notifications: false,
          }
        };
        setUser(profileWithPreferences);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          }
        }
      });

      if (error) throw error;
    } catch (error: any) {
      setIsLoading(false);
      throw new Error(error.message || 'Registration failed');
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      await storage.removeItem('user_data');
    } catch (error) {
      console.error('❌ Sign out error:', error);
    }
  };

  const completeOnboarding = async () => {
    await storage.setItem('onboarding_complete', 'true');
    setIsOnboarded(true);
    console.log('✅ Onboarding completed');
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return;

    try {
      const { data: updatedProfile, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;
      setUser(updatedProfile);
    } catch (error) {
      console.error('❌ Error updating profile:', error);
      throw error;
    }
  };

  const refreshProfile = async () => {
    if (!session?.user) return;
    await loadUserProfile(session.user);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        isOnboarded,
        signIn,
        signUp,
        signOut,
        completeOnboarding,
        updateProfile,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}