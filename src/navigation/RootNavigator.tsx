/**
 * Root Navigation Component
 * Manages authentication and app navigation
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View, Text, Image } from 'react-native';

// Screens
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { ChatScreen } from '../screens/main/ChatScreen';
import { FriendsListScreen } from '../screens/main/FriendsListScreen';
import { ProfileScreen } from '../screens/main/ProfileScreen';

// Services & Store
import { authService } from '../services/authService';
import { supabase } from '../services/supabase';
import { scheduleImageCleanup } from '../services/imageService';
import { notificationService } from '../services/notificationService';
import { messageService } from '../services/messageService';
import { useAuthStore, useFriendStore } from '../store/useStore';
import { colors } from '../theme/theme';

type RootStackParamList = {
  Auth: undefined;
  Home: undefined;
};

type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

type HomeStackParamList = {
  Main: undefined;
  Chat: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const Tab = createBottomTabNavigator();

/**
 * Auth Stack Navigator
 */
const AuthNavigator: React.FC = () => {
  return (
    <AuthStack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
};

/**
 * Home Tab Navigator
 */
const HomeTabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingBottom: 5,
          height: 60,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarLabelStyle: {
          fontSize: 12,
          marginTop: -5,
        },
      }}
    >
      <Tab.Screen
        name="Chats"
        component={FriendsListScreen}
        options={{
          tabBarLabel: 'Friends',
          tabBarIcon: ({ color }) => (
            <Image 
              source={require('../icons/friends.png')} 
              style={{ width: 24, height: 24, tintColor: color }}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color }) => (
            <Image 
              source={require('../icons/profile.png')} 
              style={{ width: 24, height: 24, tintColor: color }}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

/**
 * Home Stack Navigator
 */
const HomeNavigator: React.FC = () => {
  return (
    <HomeStack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <HomeStack.Screen name="Main" component={HomeTabNavigator} />
      <HomeStack.Screen
        name="Chat"
        component={ChatScreen}
      />
    </HomeStack.Navigator>
  );
};

/**
 * Root Navigation Component
 */
export const RootNavigator: React.FC = () => {
  const [loading, setLoading] = useState(true);
  
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const selectedFriend = useFriendStore((state) => state.selectedFriend);
  const friends = useFriendStore((state) => state.friends);

  const selectedFriendRef = useRef<typeof selectedFriend>(null);
  const friendsRef = useRef(friends);

  useEffect(() => {
    selectedFriendRef.current = selectedFriend;
  }, [selectedFriend]);

  useEffect(() => {
    friendsRef.current = friends;
  }, [friends]);

  useEffect(() => {
    initializeApp();
  }, []);

  // Listen for session changes and refresh user data
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event: string, session: any) => {
        console.log('🔐 Auth state changed:', event);
        
        if (session && event !== 'SIGNED_OUT') {
          // Session exists, fetch fresh user data
          const currentUser = await authService.getCurrentUser();
          if (currentUser) {
            setUser(currentUser);
            console.log('✅ User data refreshed:', currentUser.email);
          }
        } else {
          // Session ended, clear user
          setUser(null);
          console.log('👤 User logged out');
        }
      }
    );

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, [setUser]);

  useEffect(() => {
    // Watch for user state changes
    if (user) {
      console.log('👤 User logged in:', user.email);
    } else {
      console.log('👤 User logged out or not set');
    }
  }, [user]);

  useEffect(() => {
    if (!user?.id) return;

    let isMounted = true;
    const init = async () => {
      try {
        // First, explicitly request notification permissions
        const hasPermission = await notificationService.requestPermissions();
        if (hasPermission) {
          console.log('✅ Notification permissions granted');
          
          // Then register for push notifications
          const token = await notificationService.registerForPushNotifications(user.id);
          if (token) {
            console.log('📱 Registered push token:', token);
          }
        } else {
          console.warn('⚠️ Notification permissions denied - notifications will not work');
        }
      } catch (error) {
        console.error('❌ Push registration error:', error);
      }
    };

    init();

    const foregroundSub = notificationService.addForegroundListener((notification) => {
      console.log('🔔 Notification (foreground):', notification.request?.content?.title);
    });

    const responseSub = notificationService.setupNotificationListener((notification) => {
      console.log('🔔 Notification tapped:', notification.request?.content?.data);
    });

    const messageSubscription = messageService.subscribeToUserMessages(user.id, (message) => {
      if (!isMounted) return;
      if (message.sender_id === user.id) return;

      const activeFriend = selectedFriendRef.current;
      if (activeFriend && activeFriend.id === message.sender_id) {
        console.log('📱 Message from active chat - skipping notification');
        return;
      }

      const senderName = friendsRef.current.find((friend) => friend.id === message.sender_id)?.username || 'New message';
      const preview = message.type === 'image' ? '📷 Photo' : message.content;

      console.log('📢 Sending notification for message from:', senderName);
      notificationService.sendLocalNotification(senderName, preview, {
        type: 'message',
        senderId: message.sender_id,
      }).catch(err => console.error('❌ Notification send failed:', err));
    });

    return () => {
      isMounted = false;
      foregroundSub?.remove();
      responseSub?.remove();
      if (messageSubscription && typeof messageSubscription.unsubscribe === 'function') {
        messageSubscription.unsubscribe();
      }
    };
  }, [user?.id]);

  const initializeApp = async () => {
    try {
      // Schedule image cleanup
      scheduleImageCleanup();

      // Check if user is already logged in
      const currentUser = await authService.getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
      }
    } catch (error) {
      console.error('Initialize app error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const navigationTheme = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      primary: colors.primary,
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      border: colors.border,
    },
  };

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <Stack.Screen name="Home" component={HomeNavigator} />
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
