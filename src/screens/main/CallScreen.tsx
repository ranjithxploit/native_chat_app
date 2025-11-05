/**
 * Call Screen
 * Incoming and active call interface
 */

import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { colors, spacing, typography, borderRadius } from '../../theme/theme';
import { callService } from '../../services/callService';
import { useAuthStore } from '../../store/useStore';

interface CallScreenProps {
  navigation: any;
  route: any;
}

export const CallScreen: React.FC<CallScreenProps> = ({
  navigation,
  route,
}) => {
  const [callDuration, setCallDuration] = useState(0);
  const [isOnMute, setIsOnMute] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [callStatus, setCallStatus] = useState<'ringing' | 'active' | 'ended'>('ringing');

  const user = useAuthStore((state) => state.user);
  const call = route?.params?.call;
  
  // Determine if this is an outgoing or incoming call
  const isOutgoingCall = call && call.caller_id === user?.id;

  // Subscribe to call status changes
  useEffect(() => {
    if (!call) return;

    const subscription = callService.subscribeToCallStatus(call.id, (updatedCall) => {
      setCallStatus(updatedCall.status);
      if (updatedCall.status === 'active') {
        setCallDuration(0);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [call?.id]);

  const isActive = callStatus === 'active';
  const isIncoming = callStatus === 'ringing';
  const callUser = call?.caller_name || 'Unknown';

  // Timer for active calls
  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive]);

  const handleAcceptCall = async () => {
    if (!call) return;

    try {
      await callService.acceptCall(call.id);
    } catch (error) {
      Alert.alert('Error', 'Failed to accept call');
    }
  };

  const handleRejectCall = async () => {
    if (!call) return;

    try {
      await callService.rejectCall(call.id);
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to reject call');
    }
  };

  const handleEndCall = async () => {
    if (!call) return;

    try {
      await callService.endCall(call.id);
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to end call');
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Incoming call UI
  if (isIncoming) {
    return (
      <View style={styles.container}>
        <View style={styles.callContent}>
          {/* Caller Avatar */}
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>{callUser?.charAt(0).toUpperCase()}</Text>
          </View>

          {/* Caller Name */}
          <Text style={styles.callerName}>{callUser}</Text>
          <Text style={styles.callStatus}>Incoming call...</Text>

          {/* Action Buttons */}
          <View style={styles.buttonsContainer}>
            {/* Reject Button */}
            <TouchableOpacity
              style={[styles.button, styles.rejectButton]}
              onPress={handleRejectCall}
            >
              <Text style={styles.buttonText}>📞</Text>
            </TouchableOpacity>

            {/* Accept Button */}
            <TouchableOpacity
              style={[styles.button, styles.acceptButton]}
              onPress={handleAcceptCall}
            >
              <Text style={styles.buttonText}>✓</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // Active call UI
  if (isActive) {
    return (
      <View style={styles.container}>
        <View style={styles.callContent}>
          {/* Caller Avatar */}
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>{callUser?.charAt(0).toUpperCase()}</Text>
          </View>

          {/* Caller Name */}
          <Text style={styles.callerName}>{callUser}</Text>
          <Text style={styles.callDuration}>{formatDuration(callDuration)}</Text>

          {/* Call Controls */}
          <View style={styles.controlsContainer}>
            {/* Mute Button */}
            <TouchableOpacity
              style={[styles.controlButton, isOnMute && styles.controlButtonActive]}
              onPress={() => setIsOnMute(!isOnMute)}
            >
              <Text style={styles.controlText}>{isOnMute ? '🔇' : '🔊'}</Text>
            </TouchableOpacity>

            {/* Speaker Button */}
            <TouchableOpacity
              style={[styles.controlButton, isSpeakerOn && styles.controlButtonActive]}
              onPress={() => setIsSpeakerOn(!isSpeakerOn)}
            >
              <Text style={styles.controlText}>{isSpeakerOn ? '🔊' : '📞'}</Text>
            </TouchableOpacity>
          </View>

          {/* End Call Button */}
          <TouchableOpacity
            style={[styles.button, styles.endButton]}
            onPress={handleEndCall}
          >
            <Text style={styles.buttonText}>End Call</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Waiting/Calling state (for outgoing calls waiting for acceptance)
  if (isOutgoingCall && callStatus === 'ringing') {
    return (
      <View style={styles.container}>
        <View style={styles.callContent}>
          {/* Caller Avatar */}
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>{callUser?.charAt(0).toUpperCase()}</Text>
          </View>

          {/* Caller Name */}
          <Text style={styles.callerName}>{callUser}</Text>
          <Text style={styles.callStatus}>Calling...</Text>

          {/* End Call Button */}
          <TouchableOpacity
            style={[styles.button, styles.endButton]}
            onPress={handleEndCall}
          >
            <Text style={styles.buttonText}>Cancel Call</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  callContent: {
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: spacing.lg,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  avatarText: {
    fontSize: 48,
    fontWeight: '700',
    color: colors.background,
  },
  callerName: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.md,
  },
  callStatus: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
  callDuration: {
    ...typography.h3,
    color: colors.primary,
    marginBottom: spacing.xl,
  },
  buttonsContainer: {
    flexDirection: 'row',
    gap: spacing.lg,
    justifyContent: 'center',
    width: '100%',
  },
  button: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: colors.success,
  },
  rejectButton: {
    backgroundColor: colors.error,
  },
  endButton: {
    backgroundColor: colors.error,
    width: '80%',
    height: 56,
    marginTop: spacing.xl,
  },
  buttonText: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
  },
  controlsContainer: {
    flexDirection: 'row',
    gap: spacing.lg,
    justifyContent: 'center',
    marginVertical: spacing.xl,
  },
  controlButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
  },
  controlButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.surface2,
  },
  controlText: {
    fontSize: 24,
  },
});
