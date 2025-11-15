import { supabase } from './supabase';
import { FriendRequest, Friendship, User } from '../types/database';
export const friendService = {

  async sendFriendRequest(senderId: string, receiverId: string) {
    try {
      if (senderId === receiverId) {
        throw new Error('You cannot send a friend request to yourself');
      }
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

      console.log('Friend request sent successfully');
      return data;
    } catch (error) {
      console.error('Send friend request error:', error);
      throw error;
    }
  },

  async acceptFriendRequest(requestId: string, senderId: string, receiverId: string) {
    try {
      const { error: updateError } = await supabase
        .from('friend_requests')
        .update({ status: 'accepted' })
        .eq('id', requestId);

      if (updateError) throw updateError;
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
  async getPendingRequests(userId: string): Promise<FriendRequest[]> {
    try {
      if (!userId) {
        console.warn('getPendingRequests: userId is required');
        return [];
      }

      const { data, error } = await supabase
        .from('friend_requests')
        .select(`
          *,
          sender:sender_id(id, username, email, avatar_url)
        `)
        .eq('receiver_id', userId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Get pending requests error:', error);
        return [];
      }

      // Filter out requests where sender was deleted
      return data?.filter((req: any) => req.sender !== null) || [];
    } catch (error) {
      console.error('Get pending requests error:', error);
      return [];
    }
  },

  async getFriends(userId: string): Promise<User[]> {
    try {
      if (!userId) {
        console.warn('getFriends: userId is required');
        return [];
      }

      const { data, error } = await supabase
        .from('friendships')
        .select(`
          friend:friend_id(id, username, email, avatar_url, bio, created_at, updated_at)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Get friends error:', error);
        return [];
      }

      // Filter out null friends (in case user was deleted)
      return data?.map((f: any) => f.friend).filter((friend: any) => friend !== null) || [];
    } catch (error) {
      console.error('Get friends error:', error);
      return [];
    }
  },

  async removeFriend(userId: string, friendId: string) {
    try {
      console.log('🗑️ Removing friend and all associated data...');
      console.log('   User ID:', userId);
      console.log('   Friend ID:', friendId);

      // FIRST: Check what friendships actually exist
      const { data: existingFriendships, error: checkError } = await supabase
        .from('friendships')
        .select('*')
        .or(`user_id.eq.${userId},user_id.eq.${friendId}`);

      if (checkError) {
        console.error('❌ Error checking friendships:', checkError);
      } else {
        console.log('🔍 Found friendships in database:', existingFriendships?.length || 0);
        existingFriendships?.forEach((f: any) => {
          console.log(`   - user_id: ${f.user_id}, friend_id: ${f.friend_id}`);
        });
      }

      // Step 1: Delete all messages between these users
      const { count: messagesCount, error: messagesError } = await supabase
        .from('messages')
        .delete({ count: 'exact' })
        .or(
          `and(sender_id.eq.${userId},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${userId})`
        );

      if (messagesError) {
        console.error('Failed to delete messages:', messagesError);
      } else {
        console.log(`✅ Deleted ${messagesCount || 0} messages`);
      }

      // Step 2: Delete all friend requests between these users
      const { count: requestsCount, error: requestsError } = await supabase
        .from('friend_requests')
        .delete({ count: 'exact' })
        .or(
          `and(sender_id.eq.${userId},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${userId})`
        );

      if (requestsError) {
        console.error('Failed to delete friend requests:', requestsError);
      } else {
        console.log(`✅ Deleted ${requestsCount || 0} friend requests`);
      }

      // Step 3: Delete friendship from user to friend
      console.log('🔍 Attempting to delete: user_id =', userId, ', friend_id =', friendId);
      const { count: count1, error: error1 } = await supabase
        .from('friendships')
        .delete({ count: 'exact' })
        .eq('user_id', userId)
        .eq('friend_id', friendId);

      if (error1) {
        console.error('Failed to delete friendship (user->friend):', error1);
      } else {
        console.log(`✅ Deleted ${count1 || 0} friendship (user->friend)`);
      }

      // Step 4: Delete friendship from friend to user
      console.log('🔍 Attempting to delete: user_id =', friendId, ', friend_id =', userId);
      const { count: count2, error: error2 } = await supabase
        .from('friendships')
        .delete({ count: 'exact' })
        .eq('user_id', friendId)
        .eq('friend_id', userId);

      if (error2) {
        console.error('Failed to delete friendship (friend->user):', error2);
      } else {
        console.log(`✅ Deleted ${count2 || 0} friendship (friend->user)`);
      }

      // Verify deletion
      const { data: remainingFriendships } = await supabase
        .from('friendships')
        .select('*')
        .or(`user_id.eq.${userId},user_id.eq.${friendId}`);
      
      console.log('🔍 Remaining friendships after deletion:', remainingFriendships?.length || 0);

      // Step 5: Delete call records between these users (if table exists)
      try {
        const { count: callsCount, error: callsError } = await supabase
          .from('calls')
          .delete({ count: 'exact' })
          .or(
            `and(caller_id.eq.${userId},receiver_id.eq.${friendId}),and(caller_id.eq.${friendId},receiver_id.eq.${userId})`
          );

        if (callsError && callsError.code !== '42P01') {
          console.error('Failed to delete call records:', callsError);
        } else if (!callsError) {
          console.log(`✅ Deleted ${callsCount || 0} call records`);
        }
      } catch (err) {
        // Silently ignore if calls table doesn't exist
      }

      console.log('🎉 Friend removed successfully with all associated data!');
      return true;
    } catch (error) {
      console.error('❌ Remove friend error:', error);
      throw error;
    }
  },

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
