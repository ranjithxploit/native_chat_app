import { createClient } from '@supabase/supabase-js';
const SUPABASE_URL = 'https://ulqurzxqxoklbgyucffd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVscXVyenhxeG9rbGJneXVjZmZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwMTc0NzMsImV4cCI6MjA3NzU5MzQ3M30.EXbZXVlZTpGEHRF1UQXuZM272xVOq91l5Qq2XWGLu3M';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing Supabase credentials!');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
