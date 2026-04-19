import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  throw new Error("Missing Supabase environment variables: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set.");
}

try {
  new URL(SUPABASE_URL);
} catch {
  throw new Error(
    `Invalid VITE_SUPABASE_URL value: "${SUPABASE_URL}". Expected a full URL such as https://your-project-id.supabase.co`,
  );
}

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
