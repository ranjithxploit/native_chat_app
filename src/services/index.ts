
export { authService } from './authService';
export { friendService } from './friendService';
export { messageService } from './messageService';
export { imageService, scheduleImageCleanup } from './imageService';
export { aiService, AI_CONFIG, aiUsageTracker } from './aiService';
export { notificationService } from './notificationService';
export { updateService } from './updateService';
export { supabase } from './supabase';

export type {
  User,
  FriendRequest,
  Friendship,
  Message,
  Conversation, 
  OnlineStatus,
  Notification,
} from '../types/database';
