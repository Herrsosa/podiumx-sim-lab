import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://jlvhuzrljzsqukgugvhr.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impsdmh1enJsanpzcXVrZ3VndmhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU5MDExMzksImV4cCI6MjA1MTQ3NzEzOX0.dq8vZqT-7Tp75SHxY5TgUPmZ2rT0K1OZW8eGJLLJ8UI";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
