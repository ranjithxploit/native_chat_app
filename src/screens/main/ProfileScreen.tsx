/**
 * Profile Screen
 * User profile management with username, password change, and profile picture upload
 */

import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  Switch,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing, typography, borderRadius } from '../../theme/theme';
import { Button } from '../../components/Button';
import { CustomTextInput } from '../../components/TextInput';
import { authService } from '../../services/authService';
import { imageService } from '../../services/imageService';
import { useAuthStore } from '../../store/useStore';

interface ProfileScreenProps {
  navigation: any;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageKey, setImageKey] = useState(0); // Force re-render of Image component
  const [errors, setErrors] = useState({
    username: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);

  React.useEffect(() => {
    if (user) {
      setUsername(user.username || '');
    }
  }, [user]);

  const validatePasswordChange = (): boolean => {
    const newErrors = {
      username: '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    };
    let isValid = true;

    if (currentPassword.length < 6) {
      newErrors.currentPassword = 'Password must be at least 6 characters';
      isValid = false;
    }

    if (newPassword.length < 6) {
      newErrors.newPassword = 'New password must be at least 6 characters';
      isValid = false;
    }

    if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const validateUsernameChange = (): boolean => {
    const newErrors = {
      username: '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    };
    let isValid = true;

    if (username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleUpdateUsername = async () => {
    if (!validateUsernameChange() || !user) return;

    setLoading(true);
    try {
      const updatedUser = await authService.updateProfile(user.id, {
        username,
      });

      setUser(updatedUser);
      setIsEditing(false);
      Alert.alert('Success', 'Username updated successfully!');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update username');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!validatePasswordChange()) return;

    setLoading(true);
    try {
      await authService.changePassword(newPassword);

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('Success', 'Password changed successfully!');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handlePickImage = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera roll permission is required to upload images');
        return;
      }

      // Pick image
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled) return;

      const imageUri = result.assets[0].uri;

      // Upload to Supabase
      setUploadingImage(true);
      const avatarUrl = await imageService.uploadProfilePicture(user!.id, imageUri);

      // Update user profile
      await authService.updateProfile(user!.id, {
        avatar_url: avatarUrl,
      });

      // Fetch the fresh user data to ensure avatar displays
      console.log('🔄 Refreshing user data after avatar upload...');
      const freshUser = await authService.getCurrentUser();
      if (freshUser) {
        setUser(freshUser);
        // Force Image component to re-render by changing key
        setImageKey(prev => prev + 1);
        console.log('✅ Avatar URL set:', freshUser.avatar_url);
      }

      Alert.alert('Success', 'Profile picture updated!');
    } catch (error: any) {
      console.error('❌ Image pick error:', error);
      Alert.alert('Error', error.message || 'Failed to upload profile picture');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try {
            await authService.logout();
            setUser(null);
            console.log('✅ Logged out successfully');
          } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to logout');
          }
        },
      },
    ]);
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Profile Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handlePickImage}
          disabled={uploadingImage}
          style={styles.avatarContainer}
        >
          {user.avatar_url && user.avatar_url.trim().length > 0 ? (
            <Image
              key={imageKey}
              source={{ uri: user.avatar_url }}
              style={styles.avatar}
              onError={(e) => {
                console.warn('⚠️  Image load error:', e.nativeEvent.error);
              }}
              onLoad={() => {
                console.log('✅ Avatar image loaded successfully');
              }}
            />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{user.username?.charAt(0).toUpperCase() || '?'}</Text>
            </View>
          )}
          {uploadingImage ? (
            <View style={styles.uploadOverlay}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : (
            <View style={styles.uploadBadge}>
              <Text style={styles.uploadBadgeText}>📷</Text>
            </View>
          )}
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerUsername}>{user.username || 'User'}</Text>
          <Text style={styles.headerEmail}>{user.email}</Text>
          <Text style={styles.memberSince}>
            Member since {new Date(user.created_at).toLocaleDateString()}
          </Text>
        </View>
      </View>

      {/* Edit Username Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Account</Text>
          <TouchableOpacity onPress={() => setIsEditing(!isEditing)}>
            <Text style={styles.editButton}>{isEditing ? 'Cancel' : 'Edit'}</Text>
          </TouchableOpacity>
        </View>

        {isEditing ? (
          <View>
            <CustomTextInput
              label="Username"
              placeholder="Enter new username"
              value={username}
              onChangeText={setUsername}
              error={errors.username}
            />
            <Button
              label={loading ? 'Updating...' : 'Update Username'}
              onPress={handleUpdateUsername}
              loading={loading}
              fullWidth
            />
          </View>
        ) : (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Username</Text>
            <Text style={styles.infoValue}>{user.username || 'Not set'}</Text>
          </View>
        )}
      </View>

      {/* Change Password Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Security</Text>

        <CustomTextInput
          label="Current Password"
          placeholder="Enter current password"
          value={currentPassword}
          onChangeText={setCurrentPassword}
          secureTextEntry
          error={errors.currentPassword}
        />

        <CustomTextInput
          label="New Password"
          placeholder="Enter new password"
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
          error={errors.newPassword}
        />

        <CustomTextInput
          label="Confirm New Password"
          placeholder="Confirm new password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          error={errors.confirmPassword}
        />

        <Button
          label={loading ? 'Changing...' : 'Change Password'}
          onPress={handleChangePassword}
          loading={loading}
          fullWidth
          style={styles.changePasswordButton}
        />
      </View>

      {/* Settings Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Settings</Text>

        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>App Version</Text>
          <Text style={styles.settingValue}>1.0.0</Text>
        </View>
      </View>

      {/* Logout Button */}
      <View style={styles.section}>
        <Button
          label="Logout"
          onPress={handleLogout}
          variant="outline"
          fullWidth
          style={styles.logoutButton}
        />
      </View>

      {/* Version Info */}
      <View style={styles.footer}>
        <Text style={styles.versionText}>AI Chat App v1.0.0</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: spacing.lg,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: spacing.md,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: colors.background,
    fontSize: 40,
    fontWeight: '700',
  },
  uploadOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  uploadBadgeText: {
    fontSize: 18,
  },
  headerInfo: {
    alignItems: 'center',
  },
  headerUsername: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  headerEmail: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  memberSince: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    marginHorizontal: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '600',
  },
  editButton: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  infoRow: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  infoValue: {
    ...typography.body,
    color: colors.text,
    fontWeight: '500',
  },
  changePasswordButton: {
    marginTop: spacing.md,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingLabel: {
    ...typography.body,
    color: colors.text,
    fontWeight: '500',
  },
  settingValue: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: '400',
  },
  logoutButton: {
    marginTop: spacing.sm,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  versionText: {
    ...typography.caption,
    color: colors.textTertiary,
  },
});
