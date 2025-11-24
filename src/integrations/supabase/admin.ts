import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Admin client with service role key - BYPASSES RLS
// ⚠️ ONLY use this for admin operations like simulation
// NEVER expose this client to the browser or use it for user data
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase admin credentials');
}

export const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});
