-- Supabase Storage RLS Policies Fix
-- Run this in Supabase SQL Editor to fix image upload errors

-- First, check if the bucket exists and enable RLS
-- The chat-images bucket should already exist

-- Drop existing policies if any (to avoid conflicts)
DROP POLICY IF EXISTS "Users can upload profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload message images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own images" ON storage.objects;

-- Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy: Users can upload to chat-images bucket
CREATE POLICY "Users can upload profile pictures"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'chat-images'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

-- Policy: Anyone can view uploaded images (read access)
CREATE POLICY "Anyone can view images"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'chat-images');

-- Policy: Users can delete their own images
CREATE POLICY "Users can delete their own images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'chat-images'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

-- Note: Make sure the chat-images bucket exists and is public
-- Go to Storage > Buckets > chat-images > Edit policies if needed
