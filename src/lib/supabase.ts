import { createClient } from '@supabase/supabase-js';

// ✅ The exact Supabase credentials from the mobile app
const supabaseUrl = 'https://nhcwsuvwxbvtmtybolwg.supabase.co';
const supabaseAnonKey = 'sb_publishable_zslo9WiApznz0igRRKLqtQ_EBCCEaHK';

// Initialize Supabase Client for the Web Dashboard
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
