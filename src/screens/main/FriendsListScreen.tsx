/**
 * Friends List Screen
 * Display friends and pending friend requests
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Modal,
} from 'react-native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme/theme';
import { Button } from '../../components/Button';
import { friendService } from '../../services/friendService';
import { authService } from '../../services/authService';
import { useFriendStore, useAuthStore, useMessageStore } from '../../store/useStore';

interface FriendsListScreenProps {
  navigation: any;
}

export const FriendsListScreen: React.FC<FriendsListScreenProps> = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState<'friends' | 'requests'>('friends');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [selectedProfileUser, setSelectedProfileUser] = useState<any>(null);
  const [profileLastActive, setProfileLastActive] = useState<string | null>(null);

  const user = useAuthStore((state) => state.user);
  const friends = useFriendStore((state) => state.friends);
  const friendRequests = useFriendStore((state) => state.friendRequests);
  const selectedFriend = useFriendStore((state) => state.selectedFriend);
  const loading = useFriendStore((state) => state.loading);

  const setFriends = useFriendStore((state) => state.setFriends);
  const setFriendRequests = useFriendStore((state) => state.setFriendRequests);
  const setSelectedFriend = useFriendStore((state) => state.setSelectedFriend);
  const setLoading = useFriendStore((state) => state.setLoading);
  const removeFriendFromStore = useFriendStore((state) => state.removeFriend);
  const removeFriendRequest = useFriendStore((state) => state.removeFriendRequest);
  const setMessages = useMessageStore((state) => state.setMessages);

  useEffect(() => {
    loadFriendsAndRequests();
  }, []);

  const loadFriendsAndRequests = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const [friendsList, requestsList] = await Promise.all([
        friendService.getFriends(user.id),
        friendService.getPendingRequests(user.id),
      ]);

      setFriends(friendsList);
      setFriendRequests(requestsList);
    } catch (error) {
      console.error('Load friends error:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadFriendsAndRequests().finally(() => setRefreshing(false));
  }, []);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);

    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const results = await authService.searchUsers(query);
      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
    }
  };

  const handleSendFriendRequest = async (receiverId: string) => {
    if (!user) return;

    try {
      await friendService.sendFriendRequest(user.id, receiverId);
      Alert.alert('Success', 'Friend request sent!');
      setSearchQuery('');
      setSearchResults([]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send friend request');
    }
  };

  const handleAcceptRequest = async (request: any) => {
    try {
      await friendService.acceptFriendRequest(request.id, request.sender_id, request.receiver_id);

      Alert.alert('Success', 'Friend request accepted!');
      removeFriendRequest(request.id);
      loadFriendsAndRequests();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to accept request');
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      await friendService.rejectFriendRequest(requestId);
      removeFriendRequest(requestId);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to reject request');
    }
  };

  const handleSelectFriend = (friend: any) => {
    setSelectedFriend(friend);
    navigation.navigate('Chat');
  };

  const handleViewProfile = async (friend: any) => {
    setSelectedProfileUser(friend);
    
    // Load last active status
    try {
      const { data, error } = await require('../../services/supabase').supabase
        .from('online_status')
        .select('last_seen')
        .eq('user_id', friend.id)
        .single();

      if (!error && data) {
        const lastSeenDate = new Date(data.last_seen);
        const now = new Date();
        const diffMinutes = Math.floor((now.getTime() - lastSeenDate.getTime()) / 60000);
        
        if (diffMinutes < 1) {
          setProfileLastActive('just now');
        } else if (diffMinutes < 60) {
          setProfileLastActive(`${diffMinutes}m ago`);
        } else if (diffMinutes < 1440) {
          const hours = Math.floor(diffMinutes / 60);
          setProfileLastActive(`${hours}h ago`);
        } else {
          setProfileLastActive(lastSeenDate.toLocaleDateString());
        }
      }
    } catch (err) {
      console.error('Load profile last active error:', err);
      setProfileLastActive(null);
    }

    setProfileModalVisible(true);
  };

  const handleRemoveFriend = async (friendId: string) => {
    if (!user) return;

    Alert.alert('Remove Friend', 'Are you sure you want to remove this friend?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            console.log('👤 Removing friend:', friendId);
            console.log('📋 Current friends count:', friends.length);
            
            // Remove from database
            await friendService.removeFriend(user.id, friendId);
            console.log('✅ Database removal complete');
            
            // Clear selected friend if it's the one being removed
            if (selectedFriend?.id === friendId) {
              setSelectedFriend(null);
              console.log('✅ Selected friend cleared');
            }
            
            // Clear messages
            setMessages([]);
            console.log('✅ Messages cleared');
            
            // Close modal
            setProfileModalVisible(false);
            
            // Reload friends list from database
            const updatedFriendsList = await friendService.getFriends(user.id);
            console.log('📋 Updated friends count from DB:', updatedFriendsList.length);
            setFriends(updatedFriendsList);
            
            // Also reload requests
            const updatedRequestsList = await friendService.getPendingRequests(user.id);
            setFriendRequests(updatedRequestsList);
            
            console.log('✅ UI updated with fresh data');
            Alert.alert('Success', 'Friend removed successfully');
          } catch (error: any) {
            console.error('❌ Remove friend error:', error);
            Alert.alert('Error', error.message || 'Failed to remove friend');
          }
        },
      },
    ]);
  };

  const renderFriendItem = ({ item }: any) => (
    <TouchableOpacity
      style={styles.friendItem}
      onPress={() => handleSelectFriend(item)}
    >
      {item.avatar_url && item.avatar_url.trim().length > 0 ? (
        <Image
          key={item.id}
          source={{ uri: item.avatar_url }}
          style={styles.friendAvatarImage}
          onError={(e) => {
            console.warn('⚠️  Friend avatar load error:', e.nativeEvent.error);
          }}
        />
      ) : (
        <View style={styles.friendAvatar}>
          <Text style={styles.avatarText}>{item.username?.charAt(0).toUpperCase()}</Text>
        </View>
      )}
      <View style={styles.friendInfo}>
        <Text style={styles.friendName}>{item.username}</Text>
      </View>
      <TouchableOpacity
        onPress={() => handleViewProfile(item)}
        style={styles.viewProfileButton}
      >
        <Image 
          source={require('../../icons/profile.png')} 
          style={styles.viewProfileIcon}
        />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderRequestItem = ({ item }: any) => (
    <View style={styles.requestItem}>
      <View style={styles.requestInfo}>
        {item.sender?.avatar_url && item.sender.avatar_url.trim().length > 0 ? (
          <Image
            key={item.sender?.id}
            source={{ uri: item.sender.avatar_url }}
            style={styles.friendAvatarImage}
            onError={(e) => {
              console.warn('⚠️  Sender avatar load error:', e.nativeEvent.error);
            }}
          />
        ) : (
          <View style={styles.friendAvatar}>
            <Text style={styles.avatarText}>
              {item.sender?.username?.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <View>
          <Text style={styles.friendName}>{item.sender?.username}</Text>
          <Text style={styles.requestTime}>Sent a friend request</Text>
        </View>
      </View>
      <View style={styles.requestActions}>
        <Button
          label="Accept"
          onPress={() => handleAcceptRequest(item)}
          variant="primary"
          size="sm"
        />
        <Button
          label="Reject"
          onPress={() => handleRejectRequest(item.id)}
          variant="outline"
          size="sm"
        />
      </View>
    </View>
  );

  const renderSearchResult = ({ item }: any) => (
    <TouchableOpacity style={styles.searchResultItem}>
      {item.avatar_url && item.avatar_url.trim().length > 0 ? (
        <Image
          key={item.id}
          source={{ uri: item.avatar_url }}
          style={styles.friendAvatarImage}
          onError={(e) => {
            console.warn('⚠️  Search result avatar load error:', e.nativeEvent.error);
          }}
        />
      ) : (
        <View style={styles.friendAvatar}>
          <Text style={styles.avatarText}>{item.username?.charAt(0).toUpperCase()}</Text>
        </View>
      )}
      <View style={styles.friendInfo}>
        <Text style={styles.friendName}>{item.username}</Text>
      </View>
      <TouchableOpacity
        onPress={() => handleSendFriendRequest(item.id)}
        style={styles.addButton}
      >
        <Image
          source={require('../../icons/add_user.png')}
          style={styles.addIcon}
        />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search users..."
          placeholderTextColor={colors.textTertiary}
          value={searchQuery}
          onChangeText={handleSearch}
        />
      </View>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <FlatList
          data={searchResults}
          renderItem={renderSearchResult}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          style={styles.searchResults}
        />
      )}

      {/* Tabs */}
      {searchQuery.length === 0 && (
        <>
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'friends' && styles.tabActive]}
              onPress={() => setActiveTab('friends')}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === 'friends' && styles.tabTextActive,
                ]}
              >
                Friends ({friends.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'requests' && styles.tabActive]}
              onPress={() => setActiveTab('requests')}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === 'requests' && styles.tabTextActive,
                ]}
              >
                Requests ({friendRequests.length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Content */}
          {loading ? (
            <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
          ) : (
            <FlatList
              data={activeTab === 'friends' ? friends : (friendRequests as any)}
              renderItem={
                activeTab === 'friends' ? renderFriendItem : renderRequestItem
              }
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>
                    {activeTab === 'friends'
                      ? 'No friends yet. Search and add some!'
                      : 'No pending friend requests'}
                  </Text>
                </View>
              }
            />
          )}
        </>
      )}

      {/* Friend Profile Modal */}
      <Modal
        visible={profileModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setProfileModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {/* Close Button */}
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setProfileModalVisible(false)}
            >
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>

            {/* Profile Avatar */}
            {selectedProfileUser?.avatar_url && selectedProfileUser.avatar_url.trim().length > 0 ? (
              <Image
                source={{ uri: selectedProfileUser.avatar_url }}
                style={styles.profileModalAvatar}
              />
            ) : (
              <View style={styles.profileModalAvatarPlaceholder}>
                <Text style={styles.profileModalAvatarText}>
                  {selectedProfileUser?.username?.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}

            {/* Profile Info */}
            <Text style={styles.profileModalUsername}>{selectedProfileUser?.username}</Text>
            
            <View style={styles.profileModalInfoContainer}>
              <View style={styles.profileModalInfoItem}>
                <Text style={styles.profileModalInfoLabel}>Joined</Text>
                <Text style={styles.profileModalInfoValue}>
                  {selectedProfileUser?.created_at
                    ? new Date(selectedProfileUser.created_at).toLocaleDateString()
                    : 'N/A'}
                </Text>
              </View>
              
              <View style={styles.profileModalInfoItem}>
                <Text style={styles.profileModalInfoLabel}>Last Active</Text>
                <Text style={styles.profileModalInfoValue}>
                  {profileLastActive || 'N/A'}
                </Text>
              </View>
            </View>

            <View style={styles.profileModalEmailContainer}>
              <Text style={styles.profileModalInfoLabel}>Email</Text>
              <Text style={styles.profileModalEmailValue}>
                {selectedProfileUser?.email || 'N/A'}
              </Text>
            </View>

            {/* Remove Friend Button */}
            <Button
              label="Remove Friend"
              onPress={() => handleRemoveFriend(selectedProfileUser?.id)}
              variant="outline"
              size="md"
              style={styles.profileModalRemoveButton}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchContainer: {
    padding: spacing.lg,
    paddingTop: spacing.xl,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchInput: {
    backgroundColor: colors.surface2,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
    ...typography.body,
  },
  searchResults: {
    maxHeight: 300,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  listContent: {
    paddingVertical: spacing.sm,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  friendAvatar: {
    width: 50,
    height: 50,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  friendAvatarImage: {
    width: 50,
    height: 50,
    borderRadius: borderRadius.full,
  },
  avatarText: {
    color: colors.background,
    fontWeight: '700',
    fontSize: 20,
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  friendEmail: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },
  viewProfileButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewProfileIcon: {
    width: 28,
    height: 28,
  },
  removeButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: colors.error,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  requestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    justifyContent: 'space-between',
  },
  requestInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
  },
  requestTime: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },
  requestActions: {
    gap: spacing.sm,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  emptyStateText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    paddingBottom: spacing.xl,
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-end',
    marginBottom: spacing.md,
  },
  modalCloseText: {
    fontSize: 24,
    color: colors.text,
  },
  profileModalAvatar: {
    width: 120,
    height: 120,
    borderRadius: borderRadius.full,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  profileModalAvatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  profileModalAvatarText: {
    fontSize: 48,
    fontWeight: '700',
    color: colors.background,
  },
  profileModalUsername: {
    ...typography.h2,
    textAlign: 'center',
    color: colors.text,
    marginBottom: spacing.lg,
  },
  profileModalInfoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.surface2,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
    marginBottom: spacing.lg,
  },
  profileModalInfoItem: {
    alignItems: 'center',
  },
  profileModalInfoLabel: {
    ...typography.caption,
    color: colors.textTertiary,
    marginBottom: spacing.xs,
  },
  profileModalInfoValue: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  profileModalRemoveButton: {
    marginTop: spacing.md,
  },
  profileModalEmailContainer: {
    backgroundColor: colors.surface2,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  profileModalEmailValue: {
    ...typography.body,
    color: colors.text,
    fontWeight: '500',
    marginTop: spacing.xs,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  addIcon: {
    width: 24,
    height: 24,
    tintColor: colors.background,
  },
});
