import React, { useEffect } from 'react';
import { LogBox } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';
import { RootNavigator } from './src/navigation/RootNavigator';

LogBox.ignoreLogs([
  'expo-notifications: Android Push notifications (remote notifications) functionality provided by expo-notifications was removed from Expo Go',
]);

export default function App() {
  useEffect(() => {
    let isMounted = true;
    let delayHandle: ReturnType<typeof setTimeout> | undefined;

    const showSplashLonger = async () => {
      try {
        await SplashScreen.preventAutoHideAsync();
      } catch (error) {
        console.warn('Splash screen lock failed:', error);
      }

      delayHandle = setTimeout(async () => {
        if (isMounted) {
          try {
            await SplashScreen.hideAsync();
          } catch (error) {
            console.warn('Splash screen hide failed:', error);
          }
        }
      }, 2500);
    };

    showSplashLonger();

    return () => {
      isMounted = false;
      if (delayHandle) {
        clearTimeout(delayHandle);
      }
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <RootNavigator />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
