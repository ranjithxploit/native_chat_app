import { Audio } from 'expo-av';
import { supabase } from './supabase';

export interface Call {
  id: string;
  callerId: string;
  callerName: string;
  receiverId: string;
  status: 'ringing' | 'active' | 'ended';
  startTime?: string;
  endTime?: string;
}

let audioRecorder: Audio.Recording | null = null;
let soundPlayer: Audio.Sound | null = null;

export const callService = {
  async initAudio() {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: true,
        staysActiveInBackground: true,
      });
      console.log('📞 Audio initialized');
      return true;
    } catch (error) {
      console.error('❌ Audio initialization error:', error);
      return false;
    }
  },

  /**
   * Initiate a call
   */
  async initiateCall(callerId: string, callerName: string, receiverId: string) {
    try {
      const { data, error } = await supabase
        .from('calls')
        .insert([
          {
            caller_id: callerId,
            caller_name: callerName,
            receiver_id: receiverId,
            status: 'ringing',
            created_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) throw error;

      console.log('📞 Call initiated');
      return data;
    } catch (error) {
      console.error('❌ Initiate call error:', error);
      throw error;
    }
  },

  /**
   * Accept a call
   */
  async acceptCall(callId: string) {
    try {
      const { error } = await supabase
        .from('calls')
        .update({ status: 'active', started_at: new Date().toISOString() })
        .eq('id', callId);

      if (error) throw error;

      console.log('📞 Call accepted');
      return true;
    } catch (error) {
      console.error('❌ Accept call error:', error);
      throw error;
    }
  },

  /**
   * Reject a call
   */
  async rejectCall(callId: string) {
    try {
      const { error } = await supabase
        .from('calls')
        .update({ status: 'ended', ended_at: new Date().toISOString() })
        .eq('id', callId);

      if (error) throw error;

      console.log('📞 Call rejected');
      return true;
    } catch (error) {
      console.error('❌ Reject call error:', error);
      throw error;
    }
  },

  /**
   * End a call
   */
  async endCall(callId: string) {
    try {
      // Stop audio
      if (audioRecorder) {
        await audioRecorder.stopAndUnloadAsync();
        audioRecorder = null;
      }

      if (soundPlayer) {
        await soundPlayer.unloadAsync();
        soundPlayer = null;
      }

      const { error } = await supabase
        .from('calls')
        .update({ status: 'ended', ended_at: new Date().toISOString() })
        .eq('id', callId);

      if (error) throw error;

      console.log('📞 Call ended');
      return true;
    } catch (error) {
      console.error('❌ End call error:', error);
      throw error;
    }
  },

  /**
   * Subscribe to incoming calls
   */
  subscribeToIncomingCalls(
    receiverId: string,
    callback: (call: Call) => void
  ) {
    const subscription = supabase
      .channel(`incoming-calls:${receiverId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'calls',
          filter: `receiver_id=eq.${receiverId}`,
        },
        (payload: any) => {
          callback(payload.new as Call);
        }
      )
      .subscribe();

    return subscription;
  },

  /**
   * Subscribe to call status changes
   */
  subscribeToCallStatus(callId: string, callback: (call: Call) => void) {
    const subscription = supabase
      .channel(`call-status:${callId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'calls',
          filter: `id=eq.${callId}`,
        },
        (payload: any) => {
          callback(payload.new as Call);
        }
      )
      .subscribe();

    return subscription;
  },

  /**
   * Get active calls for user
   */
  async getActiveCalls(userId: string) {
    try {
      const { data, error } = await supabase
        .from('calls')
        .select('*')
        .or(`caller_id.eq.${userId},receiver_id.eq.${userId}`)
        .in('status', ['ringing', 'active']);

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('❌ Get active calls error:', error);
      return [];
    }
  },

  /**
   * Get call duration
   */
  getCallDuration(startTime: string, endTime?: string): string {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const diffSeconds = Math.floor((end.getTime() - start.getTime()) / 1000);

    const hours = Math.floor(diffSeconds / 3600);
    const minutes = Math.floor((diffSeconds % 3600) / 60);
    const seconds = diffSeconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  },
};
