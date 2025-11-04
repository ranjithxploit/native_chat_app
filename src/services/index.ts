/**
 * Index/Barrel Export File
 * Convenient imports for all app modules
 */

// Services
export { authService } from './authService';
export { friendService } from './friendService';
export { messageService } from './messageService';
export { imageService, scheduleImageCleanup } from './imageService';
export { aiService, AI_CONFIG, aiUsageTracker } from './aiService';
export { supabase } from './supabase';

// Re-exports for convenience
export type {
  User,
  FriendRequest,
  Friendship,
  Message,
  Conversation,
  OnlineStatus,
  Notification,
} from '../types/database';
