/**
 * Authentication Service
 * Handles user registration, login, and session management
 */

import { supabase } from './supabase';
import { User } from '../types/database';

export const authService = {
  /**
   * Register a new user
   */
  async register(email: string, password: string, username: string) {
    try {
      // Sign up user with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;

      if (!authData.user) throw new Error('User creation failed');

      // Create user profile in database
      const { data, error } = await supabase
        .from('users')
        .insert([
          {
            id: authData.user.id,
            email,
            username,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) throw error;

      return { user: data, session: authData.session };
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  },

  /**
   * Login user
   */
  async login(email: string, password: string) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  /**
   * Logout user
   */
  async logout() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  },

  /**
   * Get current user
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();

      if (authError || !authData.user) return null;

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (userError) return null;

      return userData;
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  },

  /**
   * Update user profile
   */
  async updateProfile(userId: string, updates: Partial<User>) {
    try {
      const { data, error } = await supabase
        .from('users')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  },

  /**
   * Change password
   */
  async changePassword(newPassword: string) {
    try {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Change password error:', error);
      throw error;
    }
  },

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) return null;

      return data;
    } catch (error) {
      console.error('Get user by ID error:', error);
      return null;
    }
  },

  /**
   * Search users by username or email
   */
  async searchUsers(query: string): Promise<User[]> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .or(`username.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(20);

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Search users error:', error);
      return [];
    }
  },
};
