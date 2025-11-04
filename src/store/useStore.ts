/**
 * State Management (Zustand Store)
 * Global state for auth, user, friends, and messages
 */

import { create } from 'zustand';
import { User, FriendRequest, Friendship, Message, Conversation } from '../types/database';

interface AuthStore {
  user: User | null;
  loading: boolean;
  error: string | null;
  session: any;

  setUser: (user: User | null) => void;
  setSession: (session: any) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthStore>((set: any) => ({
  user: null,
  loading: false,
  error: null,
  session: null,

  setUser: (user: any) => set({ user }),
  setSession: (session: any) => set({ session }),
  setLoading: (loading: any) => set({ loading }),
  setError: (error: any) => set({ error }),
  clearError: () => set({ error: null }),
}));

interface FriendStore {
  friends: User[];
  friendRequests: FriendRequest[];
  selectedFriend: User | null;
  loading: boolean;

  setFriends: (friends: User[]) => void;
  addFriend: (friend: User) => void;
  removeFriend: (friendId: string) => void;
  setFriendRequests: (requests: FriendRequest[]) => void;
  addFriendRequest: (request: FriendRequest) => void;
  removeFriendRequest: (requestId: string) => void;
  setSelectedFriend: (friend: User | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useFriendStore = create<FriendStore>((set: any) => ({
  friends: [],
  friendRequests: [],
  selectedFriend: null,
  loading: false,

  setFriends: (friends: any) => set({ friends }),
  addFriend: (friend: any) =>
    set((state: any) => ({
      friends: [friend, ...state.friends],
    })),
  removeFriend: (friendId: any) =>
    set((state: any) => ({
      friends: state.friends.filter((f: any) => f.id !== friendId),
    })),
  setFriendRequests: (requests: any) => set({ friendRequests: requests }),
  addFriendRequest: (request: any) =>
    set((state: any) => ({
      friendRequests: [request, ...state.friendRequests],
    })),
  removeFriendRequest: (requestId: any) =>
    set((state: any) => ({
      friendRequests: state.friendRequests.filter((r: any) => r.id !== requestId),
    })),
  setSelectedFriend: (friend: any) => set({ selectedFriend: friend }),
  setLoading: (loading: any) => set({ loading }),
}));

interface MessageStore {
  messages: Message[];
  conversations: Conversation[];
  loading: boolean;

  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  updateMessage: (messageId: string, updates: Partial<Message>) => void;
  deleteMessage: (messageId: string) => void;
  setConversations: (conversations: Conversation[]) => void;
  setLoading: (loading: boolean) => void;
}

export const useMessageStore = create<MessageStore>((set: any) => ({
  messages: [],
  conversations: [],
  loading: false,

  setMessages: (messages: any) => set({ messages }),
  addMessage: (message: any) =>
    set((state: any) => ({
      messages: [...state.messages, message],
    })),
  updateMessage: (messageId: any, updates: any) =>
    set((state: any) => ({
      messages: state.messages.map((m: any) =>
        m.id === messageId ? { ...m, ...updates } : m
      ),
    })),
  deleteMessage: (messageId: any) =>
    set((state: any) => ({
      messages: state.messages.filter((m: any) => m.id !== messageId),
    })),
  setConversations: (conversations: any) => set({ conversations }),
  setLoading: (loading: any) => set({ loading }),
}));

interface OnlineStore {
  onlineUsers: Set<string>;
  typingUsers: Set<string>;

  addOnlineUser: (userId: string) => void;
  removeOnlineUser: (userId: string) => void;
  setTyping: (userId: string) => void;
  removeTyping: (userId: string) => void;
  isOnline: (userId: string) => boolean;
  isTyping: (userId: string) => boolean;
}

export const useOnlineStore = create<OnlineStore>((set: any, get: any) => ({
  onlineUsers: new Set(),
  typingUsers: new Set(),

  addOnlineUser: (userId: any) =>
    set((state: any) => ({
      onlineUsers: new Set([...state.onlineUsers, userId]),
    })),
  removeOnlineUser: (userId: any) =>
    set((state: any) => {
      const newSet = new Set(state.onlineUsers);
      newSet.delete(userId);
      return { onlineUsers: newSet };
    }),
  setTyping: (userId: any) =>
    set((state: any) => ({
      typingUsers: new Set([...state.typingUsers, userId]),
    })),
  removeTyping: (userId: any) =>
    set((state: any) => {
      const newSet = new Set(state.typingUsers);
      newSet.delete(userId);
      return { typingUsers: newSet };
    }),
  isOnline: (userId: any) => get().onlineUsers.has(userId),
  isTyping: (userId: any) => get().typingUsers.has(userId),
}));
