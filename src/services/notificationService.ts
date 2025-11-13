import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

console.log("Notification service initialized on ", Platform.OS);
export const notificationService = {
  async requestPermissions() {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      console.log('Notification permission status:', status);
      return status === 'granted';
    } catch (error) {
      console.error('Request notification permission error:', error);
      return false;
    }
  },

  async sendLocalNotification(title: string, body: string) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: true,
          badge: 1,
        },
        trigger: null, // Send immediately
      });
      console.log('📢 Local notification sent');
    } catch (error) {
      console.error('❌ Send local notification error:', error);
    }
  },

  async sendMessageNotification(senderName: string, messagePreview: string) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `New message from ${senderName}`,
          body: messagePreview.substring(0, 100),
          sound: true,
          badge: 1,
          data: {
            type: 'message',
            senderId: senderName,
          },
        },
        trigger: null,
      });
      console.log(`Message notification sent from ${senderName}`);
    } catch (error: any) {
      console.log(`Notification not shown (might be in Expo Go): ${error.message}`);
    }
  },

  setupNotificationListener(callback: (notification: Notifications.Notification) => void) {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('📢 Notification received:', response.notification);
      callback(response.notification);
    });

    return subscription;
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
