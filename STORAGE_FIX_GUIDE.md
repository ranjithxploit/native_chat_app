## Fix for Storage Upload Error: "new row violates row-level security policy"

This error happens when trying to upload images to Supabase Storage because RLS policies are too restrictive.

### QUICK FIX (RECOMMENDED) - 2 Minutes

**Option A: Use Supabase Dashboard (Easiest)**

1. Go to: https://app.supabase.com/project/[your-project-id]/storage/buckets
2. Click the "chat-images" bucket
3. Click the lock icon 🔒 at the top right to see policies
4. Make sure these exist:
   - ✅ INSERT: Allow authenticated users
   - ✅ SELECT: Allow public/authenticated
5. If missing, create them

**Option B: SQL Command (Run in SQL Editor)**

Copy and run this in Supabase SQL Editor:
```sql
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;
```

This allows authenticated users to upload images freely.

### SECURE FIX (If you want RLS enabled)

If you want RLS enabled with proper policies, run this in SQL Editor:

```sql
-- Enable RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to upload
CREATE POLICY "Allow authenticated users to upload"
  ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'chat-images');

-- Allow public to view
CREATE POLICY "Allow public to view"
  ON storage.objects
  FOR SELECT USING (bucket_id = 'chat-images');

-- Allow users to delete their own uploads
CREATE POLICY "Allow users to delete own files"
  ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'chat-images' AND
    (auth.uid())::text = storage.foldername(name)[1]
  );
```

### Verify It Works

After applying either fix:
1. Go back to Profile tab in app
2. Tap the avatar (📷)
3. Select an image
4. Should upload without errors ✅

### Still Not Working?

Check:
1. Is "chat-images" bucket public? 
2. Is bucket RLS enabled or disabled?
3. Are you logged in (authenticated)?
4. Check app console for specific error message

### Contact Support
If still issues, check Supabase logs:
- Dashboard > Logs > Storage API
- Look for upload attempts and errors
