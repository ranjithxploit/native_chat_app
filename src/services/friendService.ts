/**
 * Friend Service
 * Handles friend requests, adding/removing friends, and friend management
 */

import { supabase } from './supabase';
import { FriendRequest, Friendship, User } from '../types/database';

export const friendService = {
  /**
   * Send a friend request
   */
  async sendFriendRequest(senderId: string, receiverId: string) {
    try {
      // Check if already friends
      const { data: existingFriendship } = await supabase
        .from('friendships')
        .select('id')
        .or(
          `and(user_id.eq.${senderId},friend_id.eq.${receiverId}),and(user_id.eq.${receiverId},friend_id.eq.${senderId})`
        )
        .single();

      if (existingFriendship) {
        throw new Error('Already friends with this user');
      }

      // Check if request already exists
      const { data: existingRequest } = await supabase
        .from('friend_requests')
        .select('id')
        .eq('sender_id', senderId)
        .eq('receiver_id', receiverId)
        .eq('status', 'pending')
        .single();

      if (existingRequest) {
        throw new Error('Friend request already sent');
      }

      const { data, error } = await supabase
        .from('friend_requests')
        .insert([
          {
            sender_id: senderId,
            receiver_id: receiverId,
            status: 'pending',
            created_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Send friend request error:', error);
      throw error;
    }
  },

  /**
   * Accept a friend request
   */
  async acceptFriendRequest(requestId: string, senderId: string, receiverId: string) {
    try {
      // Update request status
      const { error: updateError } = await supabase
        .from('friend_requests')
        .update({ status: 'accepted' })
        .eq('id', requestId);

      if (updateError) throw updateError;

      // Create friendship (bidirectional)
      const { error: friendshipError } = await supabase
        .from('friendships')
        .insert([
          {
            user_id: senderId,
            friend_id: receiverId,
            created_at: new Date().toISOString(),
          },
          {
            user_id: receiverId,
            friend_id: senderId,
            created_at: new Date().toISOString(),
          },
        ]);

      if (friendshipError) throw friendshipError;

      return true;
    } catch (error) {
      console.error('Accept friend request error:', error);
      throw error;
    }
  },

  /**
   * Reject a friend request
   */
  async rejectFriendRequest(requestId: string) {
    try {
      const { error } = await supabase
        .from('friend_requests')
        .update({ status: 'rejected' })
        .eq('id', requestId);

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Reject friend request error:', error);
      throw error;
    }
  },

  /**
   * Get pending friend requests for user
   */
  async getPendingRequests(userId: string): Promise<FriendRequest[]> {
    try {
      const { data, error } = await supabase
        .from('friend_requests')
        .select(`
          *,
          sender:sender_id(id, username, email, avatar_url)
        `)
        .eq('receiver_id', userId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Get pending requests error:', error);
      return [];
    }
  },

  /**
   * Get friends list for user
   */
  async getFriends(userId: string): Promise<User[]> {
    try {
      const { data, error } = await supabase
        .from('friendships')
        .select(`
          friend:friend_id(id, username, email, avatar_url, bio, created_at, updated_at)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data?.map((f: any) => f.friend) || [];
    } catch (error) {
      console.error('Get friends error:', error);
      return [];
    }
  },

  /**
   * Remove a friend
   */
  async removeFriend(userId: string, friendId: string) {
    try {
      // Remove both directions
      const { error } = await supabase
        .from('friendships')
        .delete()
        .or(
          `and(user_id.eq.${userId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${userId})`
        );

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Remove friend error:', error);
      throw error;
    }
  },

  /**
   * Check if users are friends
   */
  async areFriends(userId: string, friendId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('friendships')
        .select('id')
        .eq('user_id', userId)
        .eq('friend_id', friendId)
        .single();

      if (error) return false;

      return !!data;
    } catch (error) {
      console.error('Check friends error:', error);
      return false;
    }
  },

  /**
   * Check friend request status
   */
  async checkFriendRequestStatus(
    senderId: string,
    receiverId: string
  ): Promise<'pending' | 'accepted' | 'rejected' | 'none'> {
    try {
      const { data, error } = await supabase
        .from('friend_requests')
        .select('status')
        .or(
          `and(sender_id.eq.${senderId},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${senderId})`
        )
        .single();

      if (error || !data) return 'none';

      return data.status;
    } catch (error) {
      console.error('Check request status error:', error);
      return 'none';
    }
  },
};
