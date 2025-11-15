import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  ScrollView,
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
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, typography, borderRadius } from '../../theme/theme';
import { Button } from '../../components/Button';
import { messageService } from '../../services/messageService';
import { imageService } from '../../services/imageService';
import { aiService } from '../../services/aiService';
import { useAuthStore, useFriendStore, useMessageStore, useOnlineStore } from '../../store/useStore';

type Props = NativeStackScreenProps<any, 'Chat'>;

type MessageRecord = {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  type: 'text' | 'image';
  created_at: string;
  image_url?: string;
  is_deleted?: boolean;
};

type EnhancedMessage = MessageRecord & {
  showDateDivider: boolean;
  displayDateLabel: string;
  isFromUser: boolean;
};

export const ChatScreen: React.FC<Props> = ({ navigation }) => {
  const [messageText, setMessageText] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [lastActive, setLastActive] = useState<string | null>(null);
  const [smartReplies, setSmartReplies] = useState<string[]>([]);
  const [smartRepliesLoading, setSmartRepliesLoading] = useState(false);
  const [smartRepliesError, setSmartRepliesError] = useState<string | null>(null);
  const [smartRepliesRequestId, setSmartRepliesRequestId] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const user = useAuthStore((state) => state.user);
  const selectedFriend = useFriendStore((state) => state.selectedFriend);
  const friends = useFriendStore((state) => state.friends);
  const messages = useMessageStore((state) => state.messages);
  const isOnline = useOnlineStore((state) => state.isOnline);

  const setMessages = useMessageStore((state) => state.setMessages);
  const addMessage = useMessageStore((state) => state.addMessage);
  const updateMessage = useMessageStore((state) => state.updateMessage);

  const conversationSnippet = useMemo(() => {
    if (!messages || !user || !selectedFriend) return [];

    return messages
      .filter((msg: MessageRecord) => msg.type === 'text' && !msg.is_deleted)
      .slice(-8)
      .map((msg: MessageRecord) => {
        const senderLabel = msg.sender_id === user.id ? 'You' : selectedFriend.username || 'Friend';
        return `${senderLabel}: ${msg.content}`;
      });
  }, [messages, selectedFriend?.id, selectedFriend?.username, user?.id]);

  const lastIncomingMessage = useMemo(() => {
    if (!messages || !selectedFriend) return null;
    const reversed = [...messages].reverse();
    return (
      reversed.find(
        (msg: MessageRecord) =>
          msg.sender_id === selectedFriend.id &&
          msg.type === 'text' &&
          !msg.is_deleted
      ) || null
    );
  }, [messages, selectedFriend?.id]);

  const latestMessage = messages && messages.length > 0 ? messages[messages.length - 1] : null;
  const shouldDisplaySmartReplies = Boolean(
    lastIncomingMessage &&
    latestMessage &&
    selectedFriend &&
    latestMessage.id === lastIncomingMessage.id &&
    latestMessage.sender_id === selectedFriend.id
  );

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
    const unsubscribe = subscribeToMessages();
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [selectedFriend]);

  useEffect(() => {
    if (!shouldDisplaySmartReplies || !user || !selectedFriend || !lastIncomingMessage) {
      setSmartReplies([]);
      setSmartRepliesError(null);
      setSmartRepliesLoading(false);
      return;
    }

    let isActive = true;
    const fetchSmartReplies = async () => {
      setSmartRepliesLoading(true);
      setSmartRepliesError(null);

      try {
        const replies = await aiService.generateSmartReplies(
          lastIncomingMessage.content,
          conversationSnippet
        );
        if (isActive) {
          setSmartReplies(replies);
        }
      } catch (error) {
        console.error('Smart replies error:', error);
        if (isActive) {
          setSmartReplies([]);
          setSmartRepliesError('AI assistant is resting. Tap refresh to retry.');
        }
      } finally {
        if (isActive) {
          setSmartRepliesLoading(false);
        }
      }
    };

    fetchSmartReplies();

    return () => {
      isActive = false;
    };
  }, [
    conversationSnippet,
    lastIncomingMessage?.content,
    lastIncomingMessage?.id,
    selectedFriend?.id,
    shouldDisplaySmartReplies,
    smartRepliesRequestId,
    user?.id,
  ]);

  const ensureStillFriends = () => {
    if (!selectedFriend) return false;
    const friendsList = useFriendStore.getState().friends;
    const isFriend = friendsList.some((f) => f.id === selectedFriend.id);

    if (!isFriend) {
      Alert.alert(
        'Not Friends',
        'You are no longer friends with this user',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
      return false;
    }

    return true;
  };

  const enhancedMessages: EnhancedMessage[] = useMemo(() => {
    if (!messages || !Array.isArray(messages)) {
      return [];
    }

    return messages.map((message: MessageRecord, index: number) => {
      const previousMessage = messages[index - 1];
      const currentDate = new Date(message.created_at);
      const previousDate = previousMessage ? new Date(previousMessage.created_at) : null;
      const showDateDivider = !previousDate || !isSameDay(currentDate, previousDate);

      return {
        ...message,
        isFromUser: message.sender_id === user?.id,
        showDateDivider,
        displayDateLabel: formatDateLabel(currentDate),
      };
    });
  }, [messages, user?.id]);

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
      if (subscription && typeof subscription.unsubscribe === 'function') {
        subscription.unsubscribe();
      }
    };
  };

  const sendMessageWithContent = async (content: string) => {
    if (!user || !selectedFriend) return false;
    const trimmed = content.trim();
    if (!trimmed) return false;
    if (!ensureStillFriends()) return false;

    try {
      const message = await messageService.sendMessage(
        user.id,
        selectedFriend.id,
        trimmed,
        'text'
      );

      addMessage(message);
      flatListRef.current?.scrollToEnd({ animated: true });
      return true;
    } catch (error) {
      Alert.alert('Error', 'Failed to send message');
      console.error('Send message error:', error);
      return false;
    }
  };

  const handleSmartReplyPress = async (reply: string) => {
    const success = await sendMessageWithContent(reply);
    if (success) {
      setSmartReplies([]);
    }
  };

  const handleSmartReplyLongPress = (reply: string) => {
    setMessageText((prev) => {
      if (!prev) return reply;
      return `${prev.trim()} ${reply}`.trim();
    });
  };

  const handleRefreshSmartReplies = () => {
    setSmartRepliesRequestId(Date.now());
  };

  const handleSendMessage = async () => {
    if (!messageText.trim()) return;
    const success = await sendMessageWithContent(messageText);
    if (success) {
      setMessageText('');
    }
  };

  const handlePickImage = async () => {
    if (!user || !selectedFriend) return;

    if (!ensureStillFriends()) {
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

  const renderMessageItem = ({ item }: { item: EnhancedMessage }) => {
    const renderDivider = item.showDateDivider ? (
      <View style={styles.dateDividerWrapper}>
        <Text style={styles.dateDividerText}>{item.displayDateLabel}</Text>
      </View>
    ) : null;

    const bubbleStyles = [
      styles.messageBubble,
      item.isFromUser ? styles.messageBubbleRight : styles.messageBubbleLeft,
      item.is_deleted && styles.messageBubbleDeleted,
    ];

    const messageContent = item.type === 'text' ? (
      <Text
        style={[
          styles.messageText,
          item.isFromUser ? styles.messageTextRight : styles.messageTextLeft,
        ]}
      >
        {item.is_deleted ? '🛡️ This message was unsent' : item.content}
      </Text>
    ) : (
      <Image source={{ uri: item.image_url }} style={styles.messageImage} />
    );

    return (
      <View>
        {renderDivider}
        <View
          style={[
            styles.messageContainer,
            item.isFromUser ? styles.messageContainerRight : styles.messageContainerLeft,
          ]}
        >
          {!item.isFromUser && (
            <View style={styles.avatarSmall}>
              <Text style={styles.avatarText}>
                {selectedFriend?.username?.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={bubbleStyles}
            activeOpacity={0.8}
            onLongPress={() => item.isFromUser && handleUnsendMessage(item.id)}
          >
            {messageContent}
            <View style={styles.messageMetaRow}>
              <Text
                style={[
                  styles.messageTime,
                  item.isFromUser ? styles.messageTimeRight : styles.messageTimeLeft,
                ]}
              >
                {formatTime(item.created_at)}
              </Text>
              {item.isFromUser && (
                <Text style={styles.messageStatusLabel}>Sent</Text>
              )}
            </View>
          </TouchableOpacity>
        </View>
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

  const getPresenceText = () => {
    if (!selectedFriend) return '';
    if (isOnline(selectedFriend.id)) {
      return '🟢 Online now';
    }
    if (lastActive) {
      return `Last active ${lastActive}`;
    }
    return '⚫ Offline';
  };

  return (
    <View style={styles.screenWrapper}>
      <LinearGradient
        colors={[colors.surface, colors.background]}
        style={styles.backgroundGradient}
        pointerEvents="none"
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButtonWrapper}>
            <Text style={styles.backButton}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <View style={styles.headerTopRow}>
              <View style={styles.avatarLarge}>
                <Text style={styles.avatarLargeText}>
                  {selectedFriend.username?.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View>
                <Text style={styles.friendName}>{selectedFriend.username}</Text>
                <Text style={styles.onlineStatus}>{getPresenceText()}</Text>
              </View>
            </View>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerActionButton}>
              <Text style={styles.headerActionIcon}>📞</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerActionButton}>
              <Text style={styles.headerActionIcon}>🎥</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.pillReminder}>
          <Text style={styles.pillReminderText}>Encrypted conversation • Swipe to react (coming soon)</Text>
        </View>

        {loadingMessages ? (
          <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
        ) : (
          <FlatList
            ref={flatListRef}
            data={enhancedMessages}
            renderItem={renderMessageItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
            ListEmptyComponent={
              <View style={styles.emptyStateCard}>
                <Text style={styles.emptyCardTitle}>Say hello 👋</Text>
                <Text style={styles.emptyCardSubtitle}>Your conversation history is clean. Start a new vibe!</Text>
                <Button label="Send first message" onPress={() => flatListRef.current?.scrollToEnd()} />
              </View>
            }
          />
        )}

        {shouldDisplaySmartReplies && (
          <View style={styles.smartRepliesContainer}>
            <View style={styles.smartRepliesHeader}>
              <Text style={styles.smartRepliesTitle}>GhostLine AI replies</Text>
              <TouchableOpacity
                style={styles.smartRepliesRefreshButton}
                onPress={handleRefreshSmartReplies}
                accessibilityRole="button"
                accessibilityLabel="Refresh smart replies"
              >
                <Text style={styles.smartRepliesRefreshText}>↻</Text>
              </TouchableOpacity>
            </View>

            {smartRepliesLoading ? (
              <ActivityIndicator color={colors.primary} size="small" />
            ) : smartReplies.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.smartRepliesList}
              >
                {smartReplies.map((reply, index) => (
                  <TouchableOpacity
                    key={`${reply}-${index}`}
                    style={styles.smartReplyChip}
                    onPress={() => handleSmartReplyPress(reply)}
                    onLongPress={() => handleSmartReplyLongPress(reply)}
                    disabled={uploadingImage}
                  >
                    <Text style={styles.smartReplyText}>{reply}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : smartRepliesError ? (
              <Text style={styles.smartRepliesErrorText}>{smartRepliesError}</Text>
            ) : (
              <Text style={styles.smartRepliesHint}>Smart suggestions appear when your friend messages you.</Text>
            )}
          </View>
        )}

        <View style={styles.inputAccessory}>
          <TouchableOpacity
            style={[styles.inputAccessoryButton, uploadingImage && styles.inputAccessoryDisabled]}
            onPress={handlePickImage}
            disabled={uploadingImage}
          >
            <Text style={styles.inputAccessoryIcon}>📎</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.inputAccessoryButton}>
            <Text style={styles.inputAccessoryIcon}>📷</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.inputArea}>
          <TextInput
            style={styles.input}
            placeholder="Type a thoughtful message..."
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
    </View>
  );
};

const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
    backgroundColor: colors.background,
  },
  backgroundGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  container: {
    flex: 1,
    paddingBottom: spacing.lg,
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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButtonWrapper: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  backButton: {
    fontSize: 18,
    color: colors.text,
  },
  headerInfo: {
    flex: 1,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatarLarge: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface2,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarLargeText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  friendName: {
    ...typography.h3,
    color: colors.text,
  },
  onlineStatus: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  headerActionButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerActionIcon: {
    fontSize: 16,
  },
  pillReminder: {
    marginHorizontal: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  pillReminderText: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  smartRepliesContainer: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  smartRepliesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  smartRepliesTitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  smartRepliesRefreshButton: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smartRepliesRefreshText: {
    color: colors.textSecondary,
    fontSize: 16,
  },
  smartRepliesList: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingRight: spacing.sm,
  },
  smartReplyChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  smartReplyText: {
    ...typography.bodySmall,
    color: colors.text,
  },
  smartRepliesErrorText: {
    ...typography.caption,
    color: colors.warning,
  },
  smartRepliesHint: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  messagesList: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
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
    maxWidth: '80%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 2,
  },
  messageBubbleLeft: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderTopLeftRadius: borderRadius.md,
  },
  messageBubbleRight: {
    backgroundColor: colors.primary,
    borderColor: 'transparent',
    borderTopRightRadius: borderRadius.md,
  },
  messageBubbleDeleted: {
    backgroundColor: colors.surface2,
    borderStyle: 'dashed',
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
    width: 220,
    height: 220,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.xs,
  },
  messageMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  messageTime: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  messageTimeRight: {
    color: colors.background,
    opacity: 0.7,
  },
  messageTimeLeft: {
    color: colors.textTertiary,
  },
  messageStatusLabel: {
    ...typography.caption,
    color: colors.background,
    opacity: 0.7,
  },
  dateDividerWrapper: {
    alignSelf: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  dateDividerText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  inputAccessory: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  inputAccessoryButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputAccessoryDisabled: {
    opacity: 0.5,
  },
  inputAccessoryIcon: {
    fontSize: 16,
  },
  inputArea: {
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    color: colors.text,
    ...typography.body,
    paddingVertical: spacing.sm,
    maxHeight: 120,
  },
  sendButton: {
    width: 46,
    height: 46,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
  sendButtonText: {
    fontSize: 20,
    color: colors.background,
  },
  emptyStateCard: {
    marginTop: spacing.xl,
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  emptyCardTitle: {
    ...typography.h3,
    color: colors.text,
  },
  emptyCardSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
});

const formatDateLabel = (date: Date) => {
  const today = new Date();
  if (isSameDay(date, today)) return 'Today';

  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (isSameDay(date, yesterday)) return 'Yesterday';

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', weekday: 'short' });
};

const isSameDay = (dateA: Date, dateB: Date) => {
  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  );
};

const formatTime = (dateString: string) => {
  return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};
