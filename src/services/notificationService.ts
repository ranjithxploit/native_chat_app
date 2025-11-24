import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send';

const ensureAndroidChannelAsync = async () => {
  if (Platform.OS !== 'android') return;
  
  try {
    // Create default channel
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
      sound: 'default',
      enableVibrate: true,
      enableLights: true,
      showBadge: true,
    });

    // Create messages channel
    await Notifications.setNotificationChannelAsync('messages', {
      name: 'Messages',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#0080FF',
      sound: 'default',
      enableVibrate: true,
      enableLights: true,
      showBadge: true,
      description: 'New message notifications',
    });

    console.log('✅ Android notification channels created');
  } catch (error) {
    console.error('❌ Failed to create Android channels:', error);
  }
};

const getProjectId = () =>
  Constants.expoConfig?.extra?.eas?.projectId ||
  Constants.easConfig?.projectId ||
  process.env.EXPO_PROJECT_ID;

const savePushToken = async (userId: string, token: string) => {
  try {
    const { data } = await supabase
      .from('users')
      .select('push_token')
      .eq('id', userId)
      .maybeSingle();

    if (data?.push_token === token) {
      return token;
    }

    await supabase
      .from('users')
      .update({ push_token: token, updated_at: new Date().toISOString() })
      .eq('id', userId);

    return token;
  } catch (error) {
    console.error('Save push token error:', error);
    return token;
  }
};

const getPushTokenForUser = async (userId: string) => {
  try {
    const { data } = await supabase
      .from('users')
      .select('push_token')
      .eq('id', userId)
      .maybeSingle();

    return data?.push_token ?? null;
  } catch (error) {
    console.error('Get push token error:', error);
    return null;
  }
};

const sendPushPayload = async (payload: any) => {
  try {
    const response = await fetch(EXPO_PUSH_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const json = await response.json();
    if (json?.errors?.length) {
      console.error('Expo push send error:', json.errors);
    }
    if (Array.isArray(json?.data)) {
      const errorTicket = json.data.find((ticket: any) => ticket.status === 'error');
      if (errorTicket) {
        console.error('Expo push ticket error:', errorTicket);
      }
    }
  } catch (error) {
    console.error('Send push payload error:', error);
  }
};

export const notificationService = {
  async requestPermissions() {
    try {
      // First, ensure Android channels exist
      await ensureAndroidChannelAsync();

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      console.log('📱 Current notification permission status:', existingStatus);
      
      if (existingStatus === 'granted') {
        console.log('✅ Notification permissions already granted');
        return true;
      }

      // Request permissions
      const { status } = await Notifications.requestPermissionsAsync();
      console.log('📱 Notification permission request result:', status);
      
      if (status === 'granted') {
        console.log('✅ Notification permissions granted');
        return true;
      } else {
        console.warn('⚠️ Notification permissions denied');
        return false;
      }
    } catch (error) {
      console.error('❌ Request notification permission error:', error);
      return false;
    }
  },

  async registerForPushNotifications(userId?: string) {
    await ensureAndroidChannelAsync();
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      console.log('⚠️ Notification permissions not granted');
      return null;
    }

    const isExpoGo = Constants.appOwnership === 'expo';
    if (isExpoGo) {
      console.log('⚠️ Running inside Expo Go – remote push disabled, local notifications only');
      return null;
    }

    if (!Device.isDevice) {
      console.log('⚠️ Push notifications only work on physical devices, using local notifications');
      return null;
    }

    try {
      const projectId = getProjectId();
      const tokenResponse = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined
      );
      const token = tokenResponse.data;

      if (userId) {
        await savePushToken(userId, token);
        console.log('✅ Push token saved for user');
      }

      return token;
    } catch (error: any) {
      if (error.message?.includes('Expo Go')) {
        console.log('⚠️ Remote push not available in Expo Go, using local notifications only');
      } else {
        console.error('Register for push notifications error:', error);
      }
      return null;
    }
  },

  async sendLocalNotification(title: string, body: string, data: Record<string, any> = {}) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: 'default',
          badge: 1,
          data,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          vibrate: [0, 250, 250, 250],
        },
        trigger: null,
      });
      console.log('📢 Local notification sent:', title);
    } catch (error) {
      console.error('❌ Send local notification error:', error);
    }
  },

  async sendMessageNotification(senderName: string, messagePreview: string) {
    return this.sendLocalNotification(`New message from ${senderName}`, messagePreview.substring(0, 100), {
      type: 'message',
      senderName,
    });
  },

  setupNotificationListener(callback: (notification: Notifications.Notification) => void) {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('📢 Notification received:', response.notification);
      callback(response.notification);
    });

    return subscription;
  },

  addForegroundListener(callback: (notification: Notifications.Notification) => void) {
    const subscription = Notifications.addNotificationReceivedListener((notification) => {
      callback(notification);
    });

    return subscription;
  },

  async sendPushNotification(toToken: string, title: string, body: string, data: Record<string, any> = {}) {
    if (!toToken) return;
    await sendPushPayload({
      to: toToken,
      title,
      body,
      data,
      sound: 'default',
    });
  },

  async sendPushNotificationToUser(userId: string, title: string, body: string, data: Record<string, any> = {}) {
    const token = await getPushTokenForUser(userId);
    if (!token) {
      console.log('⚠️ No push token for user, skipping remote push');
      return;
    }

    await this.sendPushNotification(token, title, body, data);
  },

  async sendChatPushNotification(params: {
    receiverId: string;
    senderId: string;
    senderName: string;
    messagePreview: string;
    metadata?: Record<string, any>;
  }) {
    const { receiverId, senderId, senderName, messagePreview, metadata } = params;
    
    try {
      await this.sendPushNotificationToUser(receiverId, senderName || 'New message', messagePreview, {
        type: 'message',
        senderId,
        senderName,
        ...metadata,
      });
    } catch {
      console.log('⚠️ Remote push failed (expected in Expo Go)');
    }
  },

  async clearAllNotifications() {
    try {
      await Notifications.dismissAllNotificationsAsync();
      console.log('All notifications cleared');
    } catch (error) {
      console.error('Clear notifications error:', error);
    }
  },

  async getNotificationBadgeCount() {
    try {
      const count = await Notifications.getBadgeCountAsync();
      return count;
    } catch (error) {
      console.error('Get badge count error:', error);
      return 0;
    }
  },

  async setNotificationBadgeCount(count: number) {
    try {
      await Notifications.setBadgeCountAsync(count);
      console.log('Badge count updated to:', count);
    } catch (error) {
      console.error('Set badge count error:', error);
    }
  },
};
