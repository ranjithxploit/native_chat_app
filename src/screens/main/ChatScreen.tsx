/**
 * Chat Screen
 * Real-time messaging with text and image support
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing, typography, borderRadius } from '../../theme/theme';
import { Button } from '../../components/Button';
import { messageService } from '../../services/messageService';
import { imageService } from '../../services/imageService';
import { useAuthStore, useFriendStore, useMessageStore, useOnlineStore } from '../../store/useStore';

type Props = NativeStackScreenProps<any, 'Chat'>;

export const ChatScreen: React.FC<Props> = ({ navigation, route }) => {
  const [messageText, setMessageText] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [lastActive, setLastActive] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  const user = useAuthStore((state) => state.user);
  const selectedFriend = useFriendStore((state) => state.selectedFriend);
  const friends = useFriendStore((state) => state.friends);
  const messages = useMessageStore((state) => state.messages);
  const isOnline = useOnlineStore((state) => state.isOnline);

  const setMessages = useMessageStore((state) => state.setMessages);
  const addMessage = useMessageStore((state) => state.addMessage);
  const deleteMessage = useMessageStore((state) => state.deleteMessage);
  const updateMessage = useMessageStore((state) => state.updateMessage);

  // Check if still friends
  useEffect(() => {
    if (selectedFriend && friends.length > 0) {
      const isFriend = friends.some(f => f.id === selectedFriend.id);
      if (!isFriend) {
        Alert.alert(
          'Not Friends',
          'You are no longer friends with this user',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    }
  }, [friends, selectedFriend]);

  useEffect(() => {
    loadMessages();
    loadLastActive();
    subscribeToMessages();
  }, [selectedFriend]);

  const loadMessages = async () => {
    if (!user || !selectedFriend) return;

    setLoadingMessages(true);
    try {
      const conversation = await messageService.getConversation(
        user.id,
        selectedFriend.id
      );
      setMessages(conversation);
      flatListRef.current?.scrollToEnd({ animated: false });
    } catch (error) {
      console.error('Load messages error:', error);
    } finally {
      setLoadingMessages(false);
    }
  };

  const loadLastActive = async () => {
    if (!selectedFriend) return;

    try {
      const { data, error } = await require('../../services/supabase').supabase
        .from('online_status')
        .select('last_seen')
        .eq('user_id', selectedFriend.id)
        .single();

      if (!error && data) {
        const lastSeenDate = new Date(data.last_seen);
        const now = new Date();
        const diffMinutes = Math.floor((now.getTime() - lastSeenDate.getTime()) / 60000);
        
        if (diffMinutes < 1) {
          setLastActive('just now');
        } else if (diffMinutes < 60) {
          setLastActive(`${diffMinutes}m ago`);
        } else if (diffMinutes < 1440) {
          const hours = Math.floor(diffMinutes / 60);
          setLastActive(`${hours}h ago`);
        } else {
          setLastActive(lastSeenDate.toLocaleDateString());
        }
      }
    } catch (error) {
      console.error('Load last active error:', error);
    }
  };

  const subscribeToMessages = () => {
    if (!user || !selectedFriend) return;

    const subscription = messageService.subscribeToMessages(
      user.id,
      selectedFriend.id,
      (newMessage) => {
        addMessage(newMessage);
        flatListRef.current?.scrollToEnd({ animated: true });
      }
    );

    return () => {
      if (subscription) {
        // Unsubscribe logic
      }
    };
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !user || !selectedFriend) return;

    // Check if still friends
    const friends = useFriendStore.getState().friends;
    const isFriend = friends.some(f => f.id === selectedFriend.id);
    if (!isFriend) {
      Alert.alert(
        'Not Friends',
        'You are no longer friends with this user',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
      return;
    }

    try {
      const message = await messageService.sendMessage(
        user.id,
        selectedFriend.id,
        messageText.trim(),
        'text'
      );

      addMessage(message);
      setMessageText('');
      flatListRef.current?.scrollToEnd({ animated: true });
    } catch (error) {
      Alert.alert('Error', 'Failed to send message');
      console.error('Send message error:', error);
    }
  };

  const handlePickImage = async () => {
    if (!user || !selectedFriend) return;

    // Check if still friends
    const friends = useFriendStore.getState().friends;
    const isFriend = friends.some(f => f.id === selectedFriend.id);
    if (!isFriend) {
      Alert.alert(
        'Not Friends',
        'You are no longer friends with this user',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setUploadingImage(true);

        const { url, key } = await imageService.uploadImage(user.id, result.assets[0].uri);

        const message = await messageService.sendImageMessage(
          user.id,
          selectedFriend.id,
          url,
          key
        );

        addMessage(message);
        flatListRef.current?.scrollToEnd({ animated: true });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to send image');
      console.error('Pick image error:', error);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleUnsendMessage = (messageId: string) => {
    if (!user) return;

    Alert.alert('Unsend Message', 'Are you sure you want to unsend this message?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Unsend',
        style: 'destructive',
        onPress: async () => {
          try {
            await messageService.deleteMessage(messageId);
            updateMessage(messageId, { is_deleted: true });
          } catch (error) {
            Alert.alert('Error', 'Failed to unsend message');
          }
        },
      },
    ]);
  };

  const renderMessageItem = ({ item }: any) => {
    const isFromUser = item.sender_id === user?.id;

    return (
      <View
        style={[
          styles.messageContainer,
          isFromUser ? styles.messageContainerRight : styles.messageContainerLeft,
        ]}
      >
        {!isFromUser && (
          <View style={styles.avatarSmall}>
            <Text style={styles.avatarText}>
              {selectedFriend?.username?.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.messageBubble,
            isFromUser ? styles.messageBubbleRight : styles.messageBubbleLeft,
          ]}
          onLongPress={() => isFromUser && handleUnsendMessage(item.id)}
        >
          {item.type === 'text' ? (
            <Text
              style={[
                styles.messageText,
                isFromUser ? styles.messageTextRight : styles.messageTextLeft,
              ]}
            >
              {item.is_deleted ? '🛡️ This message was unsent' : item.content}
            </Text>
          ) : (
            <Image
              source={{ uri: item.image_url }}
              style={styles.messageImage}
            />
          )}
        </TouchableOpacity>

        {isFromUser && (
          <Text style={styles.messageTime}>
            {new Date(item.created_at).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        )}
      </View>
    );
  };

  if (!selectedFriend) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Select a friend to start chatting</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.friendName}>{selectedFriend.username}</Text>
          <Text style={styles.onlineStatus}>
            {isOnline(selectedFriend.id) ? '🟢 Online' : lastActive ? `Last active ${lastActive}` : '⚫ Offline'}
          </Text>
        </View>
      </View>

      {/* Messages List */}
      {loadingMessages ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessageItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        />
      )}

      {/* Input Area */}
      <View style={styles.inputArea}>
        <TouchableOpacity
          onPress={handlePickImage}
          disabled={uploadingImage}
          style={styles.attachButton}
        >
          <Text style={styles.attachButtonText}>�️</Text>
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          placeholderTextColor={colors.textTertiary}
          value={messageText}
          onChangeText={setMessageText}
          multiline
          editable={!uploadingImage}
        />

        <TouchableOpacity
          onPress={handleSendMessage}
          disabled={!messageText.trim() || uploadingImage}
          style={[
            styles.sendButton,
            (!messageText.trim() || uploadingImage) && styles.sendButtonDisabled,
          ]}
        >
          {uploadingImage ? (
            <ActivityIndicator color={colors.background} size="small" />
          ) : (
            <Text style={styles.sendButtonText}>➤</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  header: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  backButton: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  headerInfo: {
    flex: 1,
  },
  friendName: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  onlineStatus: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },
  messagesList: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  loader: {
    flex: 1,
  },
  messageContainer: {
    flexDirection: 'row',
    marginVertical: spacing.xs,
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  messageContainerLeft: {
    justifyContent: 'flex-start',
  },
  messageContainerRight: {
    justifyContent: 'flex-end',
  },
  avatarSmall: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 12,
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  messageBubbleLeft: {
    backgroundColor: colors.surface2,
    borderBottomLeftRadius: borderRadius.sm,
  },
  messageBubbleRight: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: borderRadius.sm,
  },
  messageText: {
    ...typography.body,
    lineHeight: 22,
  },
  messageTextLeft: {
    color: colors.text,
  },
  messageTextRight: {
    color: colors.background,
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: borderRadius.md,
  },
  messageTime: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },
  inputArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  attachButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  attachButtonText: {
    fontSize: 20,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surface2,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
    maxHeight: 100,
    ...typography.body,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    fontSize: 20,
  },
});
