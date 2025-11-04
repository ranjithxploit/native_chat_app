-- SIMPLE FIX: Disable RLS on storage.objects
-- This is the quickest way to allow image uploads to work

-- This disables Row Level Security for the storage.objects table
-- allowing authenticated users to upload images without complex policy checks
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- If you want to re-enable it later with proper policies, use:
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
-- Then add specific policies for INSERT, SELECT, UPDATE, DELETE

-- Alternative: Use Supabase Dashboard
-- 1. Go to Storage bucket "chat-images"
-- 2. Click the 3 dots menu > Policies
-- 3. Make sure INSERT and SELECT policies are set for authenticated users
