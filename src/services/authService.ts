import { supabase } from './supabase';
import { User } from '../types/database';
const fixAvatarUrl = (user: User | null): User | null => {
  if (!user || !user.avatar_url) return user;
  return {
    ...user,
    avatar_url: user.avatar_url.replace('supaabase', 'supabase'),
  };
};

export const authService = {
  async register(email: string, password: string, username: string) {
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;

      if (!authData.user) throw new Error('User creation failed');
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

  async logout() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  },

  async getCurrentUser(): Promise<User | null> {
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();

      if (authError || !authData.user) return null;

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (userError) {
        console.warn('User profile not found in database, creating one...');
        
        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert([
            {
              id: authData.user.id,
              email: authData.user.email || '',
              username: authData.user.user_metadata?.username || `user_${authData.user.id.slice(0, 8)}`,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ])
          .select()
          .single();

        if (createError) {
          console.error('Failed to create user profile:', createError);
          return null;
        }

        console.log('User profile created:', newUser.email);
        return fixAvatarUrl(newUser);
      }

      return fixAvatarUrl(userData);
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  },

  async updateProfile(userId: string, updates: Partial<User>) {
    try {
      console.log('Updating profile for user:', userId);
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('id', userId)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (!existingUser) {
        console.warn('⚠️  User profile does not exist, creating it...');
        // Create the profile if it doesn't exist
        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert([
            {
              id: userId,
              email: updates.email || 'unknown@example.com',
              username: updates.username || `user_${userId.slice(0, 8)}`,
              avatar_url: updates.avatar_url,
              bio: updates.bio,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ])
          .select()
          .single();

        if (createError) {
          console.error('❌ Failed to create user profile:', createError);
          throw createError;
        }

        console.log('✅ User profile created:', newUser.email);
        return newUser;
      }

      // User exists, update the profile
      const { data, error } = await supabase
        .from('users')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        console.error('❌ Failed to update profile:', error);
        throw error;
      }

      console.log('✅ Profile updated successfully');
      return fixAvatarUrl(data);
    } catch (error) {
      console.error('❌ Update profile error:', error);
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

      return fixAvatarUrl(data);
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

      return (data || []).map(user => fixAvatarUrl(user)).filter(Boolean) as User[];
    } catch (error) {
      console.error('Search users error:', error);
      return [];
    }
  },
};
