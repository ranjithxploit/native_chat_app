-- GhostLine - Supabase Database Schema
-- This version uses CREATE TABLE IF NOT EXISTS to preserve existing data

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL UNIQUE,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create friend_requests table
CREATE TABLE IF NOT EXISTS friend_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT no_self_request CHECK (sender_id != receiver_id)
);

-- Create friendships table
CREATE TABLE IF NOT EXISTS friendships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, friend_id),
  CONSTRAINT no_self_friend CHECK (user_id != friend_id)
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  type TEXT DEFAULT 'text' CHECK (type IN ('text', 'image')),
  image_url TEXT,
  image_key TEXT,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  edited_at TIMESTAMP WITH TIME ZONE
);

-- Create online_status table
CREATE TABLE IF NOT EXISTS online_status (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  is_online BOOLEAN DEFAULT FALSE,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('friend_request', 'message', 'friend_accepted')),
  related_user_id UUID REFERENCES users(id),
  content TEXT,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create calls table
CREATE TABLE IF NOT EXISTS calls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  caller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  caller_name TEXT NOT NULL,
  receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'ringing' CHECK (status IN ('ringing', 'active', 'ended')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver ON friend_requests(receiver_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_sender ON friend_requests(sender_id);
CREATE INDEX IF NOT EXISTS idx_friendships_user ON friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend ON friendships(friend_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(sender_id, receiver_id, created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_online_status_user ON online_status(user_id);
CREATE INDEX IF NOT EXISTS idx_calls_receiver ON calls(receiver_id);
CREATE INDEX IF NOT EXISTS idx_calls_caller ON calls(caller_id);
CREATE INDEX IF NOT EXISTS idx_calls_status ON calls(status);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE online_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users
DROP POLICY IF EXISTS "Users can view all profiles" ON users;
CREATE POLICY "Users can view all profiles"
  ON users
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can create their own profile" ON users;
CREATE POLICY "Users can create their own profile"
  ON users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON users;
CREATE POLICY "Users can update their own profile"
  ON users
  FOR UPDATE
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can view their own friend requests" ON friend_requests;
CREATE POLICY "Users can view their own friend requests"
  ON friend_requests
  FOR SELECT
  USING (auth.uid() = receiver_id OR auth.uid() = sender_id);

DROP POLICY IF EXISTS "Users can send friend requests" ON friend_requests;
CREATE POLICY "Users can send friend requests"
  ON friend_requests
  FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "Users can update their received requests" ON friend_requests;
CREATE POLICY "Users can update their received requests"
  ON friend_requests
  FOR UPDATE
  USING (auth.uid() = receiver_id);

-- RLS Policies for friendships
DROP POLICY IF EXISTS "Users can view their friends" ON friendships;
CREATE POLICY "Users can view their friends"
  ON friendships
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can add friendships" ON friendships;
CREATE POLICY "Users can add friendships"
  ON friendships
  FOR INSERT
  WITH CHECK (auth.uid() = user_id OR auth.uid() = friend_id);

DROP POLICY IF EXISTS "Users can delete their own friendships" ON friendships;
CREATE POLICY "Users can delete their own friendships"
  ON friendships
  FOR DELETE
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- RLS Policies for messages
DROP POLICY IF EXISTS "Users can view their messages" ON messages;
CREATE POLICY "Users can view their messages"
  ON messages
  FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "Users can send messages" ON messages;
CREATE POLICY "Users can send messages"
  ON messages
  FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "Users can delete their own messages" ON messages;
CREATE POLICY "Users can delete their own messages"
  ON messages
  FOR UPDATE
  USING (auth.uid() = sender_id);

-- RLS Policies for online_status
DROP POLICY IF EXISTS "Users can view online status" ON online_status;
CREATE POLICY "Users can view online status"
  ON online_status
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can update their own status" ON online_status;
CREATE POLICY "Users can update their own status"
  ON online_status
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for notifications
DROP POLICY IF EXISTS "Users can view their notifications" ON notifications;
CREATE POLICY "Users can view their notifications"
  ON notifications
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policies for calls
DROP POLICY IF EXISTS "Users can view their calls" ON calls;
CREATE POLICY "Users can view their calls"
  ON calls
  FOR SELECT
  USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "Users can initiate calls" ON calls;
CREATE POLICY "Users can initiate calls"
  ON calls
  FOR INSERT
  WITH CHECK (auth.uid() = caller_id);

DROP POLICY IF EXISTS "Users can update their calls" ON calls;
CREATE POLICY "Users can update their calls"
  ON calls
  FOR UPDATE
  USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

-- Enable real-time for messages
-- Note: Tables are already in the publication, so we skip these if they error
-- Uncomment below if you need to add a new table to realtime:
-- ALTER PUBLICATION supabase_realtime ADD TABLE messages;
-- ALTER PUBLICATION supabase_realtime ADD TABLE friend_requests;
-- ALTER PUBLICATION supabase_realtime ADD TABLE online_status;
-- ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
-- ALTER PUBLICATION supabase_realtime ADD TABLE calls;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
