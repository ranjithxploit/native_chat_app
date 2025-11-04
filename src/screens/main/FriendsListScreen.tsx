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
  SearchBar as RNSearchBar,
} from 'react-native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme/theme';
import { Button } from '../../components/Button';
import { friendService } from '../../services/friendService';
import { authService } from '../../services/authService';
import { useFriendStore, useAuthStore } from '../../store/useStore';

interface FriendsListScreenProps {
  navigation: any;
}

export const FriendsListScreen: React.FC<FriendsListScreenProps> = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState<'friends' | 'requests'>('friends');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const user = useAuthStore((state) => state.user);
  const friends = useFriendStore((state) => state.friends);
  const friendRequests = useFriendStore((state) => state.friendRequests);
  const loading = useFriendStore((state) => state.loading);

  const setFriends = useFriendStore((state) => state.setFriends);
  const setFriendRequests = useFriendStore((state) => state.setFriendRequests);
  const setSelectedFriend = useFriendStore((state) => state.setSelectedFriend);
  const setLoading = useFriendStore((state) => state.setLoading);
  const removeFriendRequest = useFriendStore((state) => state.removeFriendRequest);

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

  const handleRemoveFriend = async (friendId: string) => {
    if (!user) return;

    Alert.alert('Remove Friend', 'Are you sure you want to remove this friend?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await friendService.removeFriend(user.id, friendId);
            loadFriendsAndRequests();
          } catch (error: any) {
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
      <View style={styles.friendAvatar}>
        <Text style={styles.avatarText}>{item.username?.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.friendInfo}>
        <Text style={styles.friendName}>{item.username}</Text>
        <Text style={styles.friendEmail}>{item.email}</Text>
      </View>
      <TouchableOpacity
        onPress={() => handleRemoveFriend(item.id)}
        style={styles.removeButton}
      >
        <Text style={styles.removeButtonText}>✕</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderRequestItem = ({ item }: any) => (
    <View style={styles.requestItem}>
      <View style={styles.requestInfo}>
        <View style={styles.friendAvatar}>
          <Text style={styles.avatarText}>
            {item.sender?.username?.charAt(0).toUpperCase()}
          </Text>
        </View>
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
      <View style={styles.friendAvatar}>
        <Text style={styles.avatarText}>{item.username?.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.friendInfo}>
        <Text style={styles.friendName}>{item.username}</Text>
        <Text style={styles.friendEmail}>{item.email}</Text>
      </View>
      <Button
        label="Add"
        onPress={() => handleSendFriendRequest(item.id)}
        variant="primary"
        size="sm"
      />
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
              data={activeTab === 'friends' ? friends : friendRequests}
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchContainer: {
    padding: spacing.md,
    backgroundColor: colors.surface,
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
});
