import { supabase } from './supabase';
import { Message } from '../types/database';

export const messageService = {
  async sendMessage(
    senderId: string,
    receiverId: string,
    content: string,
    type: 'text' | 'image' = 'text'
  ) {
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert([
          {
            sender_id: senderId,
            receiver_id: receiverId,
            content,
            type,
            is_deleted: false,
            created_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Send message error:', error);
      throw error;
    }
  },

  async sendImageMessage(
    senderId: string,
    receiverId: string,
    imageUrl: string,
    imageKey: string
  ) {
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert([
          {
            sender_id: senderId,
            receiver_id: receiverId,
            content: 'Image',
            type: 'image',
            image_url: imageUrl,
            image_key: imageKey,
            is_deleted: false,
            created_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Send image message error:', error);
      throw error;
    }
  },

  async deleteMessage(messageId: string) {
    try {
      const { data, error } = await supabase
        .from('messages')
        .update({
          is_deleted: true,
          content: 'This message was unsent',
          type: 'text',
          image_url: null,
        })
        .eq('id', messageId)
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Delete message error:', error);
      throw error;
    }
  },

  async editMessage(messageId: string, newContent: string) {
    try {
      const { data, error } = await supabase
        .from('messages')
        .update({
          content: newContent,
          edited_at: new Date().toISOString(),
        })
        .eq('id', messageId)
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Edit message error:', error);
      throw error;
    }
  },

  async getConversation(userId: string, friendId: string, limit = 50) {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:sender_id(id, username, email, avatar_url)
        `)
        .or(
          `and(sender_id.eq.${userId},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${userId})`
        )
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []).reverse();
    } catch (error) {
      console.error('Get conversation error:', error);
      return [];
    }
  },

  async getRecentConversations(userId: string) {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:sender_id(id, username, email, avatar_url),
          receiver:receiver_id(id, username, email, avatar_url)
        `)
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      const conversations = new Map();

      data?.forEach((msg: any) => {
        const partnerId = msg.sender_id === userId ? msg.receiver_id : msg.sender_id;
        const partner = msg.sender_id === userId ? msg.receiver : msg.sender;

        if (!conversations.has(partnerId)) {
          conversations.set(partnerId, {
            partner,
            lastMessage: msg,
          });
        }
      });

      return Array.from(conversations.values());
    } catch (error) {
      console.error('Get recent conversations error:', error);
      return [];
    }
  },

  subscribeToMessages(
    userId: string,
    friendId: string,
    callback: (message: Message) => void
  ) {
    const subscription = supabase
      .from(`messages:or(and(sender_id.eq.${userId},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${userId}))`)
      .on('*', (payload: any) => {
        if (payload.eventType === 'INSERT') {
          callback(payload.new as Message);
        }
      })
      .subscribe();

    return subscription;
  },


  subscribeToUserMessages(userId: string, callback: (message: Message) => void) {
    const subscription = supabase
      .from(`messages:or(sender_id.eq.${userId},receiver_id.eq.${userId})`)
      .on('*', (payload: any) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          callback(payload.new as Message);
        }
      })
      .subscribe();

    return subscription;
  },
};
