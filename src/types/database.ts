/**
 * Supabase Database Types
 */

export interface User {
  id: string;
  email: string;
  username: string;
  avatar_url?: string;
  bio?: string;
  created_at: string;
  updated_at: string;
}

export interface FriendRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  sender?: User;
  receiver?: User;
}

export interface Friendship {
  id: string;
  user_id: string;
  friend_id: string;
  created_at: string;
  friend?: User;
}

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  type: 'text' | 'image';
  image_url?: string;
  image_key?: string;
  is_deleted: boolean;
  created_at: string;
  edited_at?: string;
  sender?: User;
}

export interface Conversation {
  id: string;
  user_id: string;
  friend_id: string;
  last_message?: Message;
  last_message_at: string;
  unread_count: number;
  friend?: User;
}

export interface OnlineStatus {
  user_id: string;
  is_online: boolean;
  last_seen: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: 'friend_request' | 'message' | 'friend_accepted';
  related_user_id: string;
  content: string;
  read: boolean;
  created_at: string;
}
