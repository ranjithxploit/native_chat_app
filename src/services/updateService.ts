/**
 * Update Service
 * Handles OTA (Over-The-Air) updates using Expo Updates
 */

import * as Updates from 'expo-updates';

export const updateService = {
  /**
   * Check if updates are available
   */
  async checkForUpdates(): Promise<{
    isAvailable: boolean;
    manifest?: any;
  }> {
    try {
      if (__DEV__) {
        console.log('⚠️ Updates are disabled in development mode');
        return { isAvailable: false };
      }

      console.log('🔍 Checking for updates...');
      const update = await Updates.checkForUpdateAsync();

      if (update.isAvailable) {
        console.log('✅ Update available!');
        return {
          isAvailable: true,
          manifest: update.manifest,
        };
      } else {
        console.log('✓ App is up to date');
        return { isAvailable: false };
      }
    } catch (error) {
      console.error('❌ Error checking for updates:', error);
      return { isAvailable: false };
    }
  },

  /**
   * Download and apply the update
   */
  async downloadAndApplyUpdate(): Promise<boolean> {
    try {
      if (__DEV__) {
        console.log('⚠️ Updates are disabled in development mode');
        return false;
      }

      console.log('📥 Downloading update...');
      const result = await Updates.fetchUpdateAsync();

      if (result.isNew) {
        console.log('✅ Update downloaded successfully!');
        console.log('🔄 Reloading app...');
        await Updates.reloadAsync();
        return true;
      } else {
        console.log('ℹ️ No new update to apply');
        return false;
      }
    } catch (error) {
      console.error('❌ Error downloading update:', error);
      return false;
    }
  },

  /**
   * Get current update info
   */
  getCurrentUpdateInfo() {
    try {
      return {
        updateId: Updates.updateId,
        runtimeVersion: Updates.runtimeVersion,
        channel: Updates.channel,
        createdAt: Updates.createdAt,
        isEmbeddedLaunch: Updates.isEmbeddedLaunch,
        isEmergencyLaunch: Updates.isEmergencyLaunch,
      };
    } catch (error) {
      console.error('Error getting update info:', error);
      return null;
    }
  },

  /**
   * Check for updates on app startup (silently)
   */
  async checkOnStartup() {
    try {
      if (__DEV__) return;

      const { isAvailable } = await this.checkForUpdates();
      
      if (isAvailable) {
        console.log('🔔 New update available! Users can update from Profile screen.');
      }

      return isAvailable;
    } catch (error) {
      console.error('Error in startup update check:', error);
      return false;
    }
  },
};
