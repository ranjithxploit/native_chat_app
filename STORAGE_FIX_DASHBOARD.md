# Fix Storage RLS via Supabase Dashboard

## Problem
Cannot modify `storage.objects` RLS via SQL because Supabase owns and manages this table. You must use the Dashboard UI.

## ✅ Solution: Use Supabase Dashboard

### Step 1: Open Storage Settings
1. Go to: https://app.supabase.com
2. Select your **project**
3. Left menu → **Storage**
4. Find bucket: **chat-images**
5. Click the 3-dots menu (⋮) → **Edit policies**

### Step 2: Check/Add Policies

You need these policies:

#### Policy 1: Allow Uploads (INSERT)
- **Target roles:** authenticated
- **Policy name:** `Allow authenticated users to upload`
- **Allowed operations:** INSERT
- **Policy definition:**
  ```
  bucket_id = 'chat-images'
  ```
- Click **Create policy**

#### Policy 2: Allow View (SELECT)  
- **Target roles:** public
- **Policy name:** `Allow public to view`
- **Allowed operations:** SELECT
- **Policy definition:**
  ```
  bucket_id = 'chat-images'
  ```
- Click **Create policy**

#### Policy 3: Allow Delete
- **Target roles:** authenticated
- **Policy name:** `Allow authenticated to delete own files`
- **Allowed operations:** DELETE
- **Policy definition:**
  ```
  bucket_id = 'chat-images'
  ```
- Click **Create policy**

### Step 3: Verify & Test

After adding policies:
1. **Restart your app** (hard refresh or restart Expo)
2. Go to **Profile** tab
3. Tap **avatar** (📷)
4. Select an **image**
5. Should upload **without errors** ✅

---

## If Policies Already Exist

If the policies are already there but still getting errors:

1. Try **removing all policies** and recreating them fresh
2. Or try uploading with **less restrictive policy** first:
   ```
   true
   ```
   This allows anyone. If this works, RLS was the issue.

3. Then use more restrictive policies once confirmed working.

---

## Alternative: Create Custom Storage Table

If Dashboard policies don't work, create your own table:

```sql
-- Create custom storage table in your schema
CREATE TABLE user_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Disable RLS on your own table
ALTER TABLE user_files DISABLE ROW LEVEL SECURITY;

-- Create RLS policy if you want
CREATE POLICY "Users can view their own files"
  ON user_files
  FOR SELECT
  USING (auth.uid() = user_id);
```

Then store file paths in this table and use Supabase Storage API for actual file operations.

---

## Supabase Support

If still having issues:
- Contact Supabase support with error details
- Check your account permissions
- Verify bucket "chat-images" is public
- Try creating a new test bucket

---

## Checklist

- [ ] Logged in to Supabase Dashboard
- [ ] Found "chat-images" bucket
- [ ] Opened Edit policies
- [ ] Added INSERT policy for authenticated
- [ ] Added SELECT policy for public  
- [ ] Added DELETE policy for authenticated
- [ ] Restarted app
- [ ] Tried uploading image
- [ ] Upload successful ✅
