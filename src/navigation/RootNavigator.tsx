/**
 * Root Navigation Component
 * Manages authentication and app navigation
 */

import React, { useEffect, useState } from 'react';
import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View, Text } from 'react-native';

// Screens
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { ChatScreen } from '../screens/main/ChatScreen';
import { FriendsListScreen } from '../screens/main/FriendsListScreen';
import { ProfileScreen } from '../screens/main/ProfileScreen';

// Services & Store
import { authService } from '../services/authService';
import { scheduleImageCleanup } from '../services/imageService';
import { useAuthStore } from '../store/useStore';
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
        animationEnabled: true,
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
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>👥</Text>,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>👤</Text>,
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
        options={{
          animationEnabled: true,
        }}
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

  useEffect(() => {
    initializeApp();
  }, []);

  useEffect(() => {
    // Watch for user state changes
    if (user) {
      console.log('👤 User logged in:', user.email);
    } else {
      console.log('👤 User logged out or not set');
    }
  }, [user]);

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
