/**
 * Image Storage Service
 * Handles image uploads, storage, and 15-minute auto-deletion
 */

import { supabase } from './supabase';
import * as FileSystem from 'expo-file-system';

// Helper to convert base64 to Uint8Array
const base64ToUint8Array = (base64: string): Uint8Array => {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

export const imageService = {
  /**
   * Upload image to Supabase Storage
   */
  async uploadImage(userId: string, imageUri: string): Promise<{
    url: string;
    key: string;
  }> {
    try {
      // Read image file
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Generate unique key
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(7);
      const imageKey = `${userId}/${timestamp}-${randomStr}`;

      // Upload to storage
      const { data, error } = await supabase.storage
        .from('chat-images')
        .upload(imageKey, base64ToUint8Array(base64), {
          contentType: 'image/jpeg',
          cacheControl: '900', // 15 minutes
        });

      if (error) throw error;

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from('chat-images').getPublicUrl(imageKey);

      // Schedule deletion after 15 minutes
      setTimeout(() => {
        imageService.deleteImage(imageKey);
      }, 15 * 60 * 1000); // 15 minutes

      return {
        url: publicUrl,
        key: imageKey,
      };
    } catch (error) {
      console.error('Upload image error:', error);
      throw error;
    }
  },

  /**
   * Delete image from storage
   */
  async deleteImage(imageKey: string) {
    try {
      const { error } = await supabase.storage
        .from('chat-images')
        .remove([imageKey]);

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Delete image error:', error);
      return false;
    }
  },

  /**
   * Clean up expired images (call periodically)
   */
  async cleanupExpiredImages() {
    try {
      // Get all images older than 15 minutes
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();

      const { data: messages, error: queryError } = await supabase
        .from('messages')
        .select('image_key')
        .eq('type', 'image')
        .lt('created_at', fifteenMinutesAgo)
        .is('image_key', null) // Already deleted
        .not('is_deleted', 'eq', true);

      if (queryError) throw queryError;

      // Delete from storage
      if (messages && messages.length > 0) {
        const keys = messages
          .map((m: any) => m.image_key)
          .filter(Boolean);

        if (keys.length > 0) {
          const { error: deleteError } = await supabase.storage
            .from('chat-images')
            .remove(keys);

          if (deleteError) console.error('Cleanup error:', deleteError);
        }
      }

      return true;
    } catch (error) {
      console.error('Cleanup expired images error:', error);
      return false;
    }
  },
};

/**
 * Schedule automatic image cleanup every minute
 */
export const scheduleImageCleanup = () => {
  setInterval(() => {
    imageService.cleanupExpiredImages();
  }, 60 * 1000); // Every minute
};
