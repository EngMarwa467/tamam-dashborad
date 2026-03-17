import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nhcwsuvwxbvtmtybolwg.supabase.co';
const supabaseAnonKey = 'sb_publishable_zslo9WiApznz0igRRKLqtQ_EBCCEaHK';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkColumns() {
  const { data, error } = await supabase.from('profiles').select('*').limit(1);
  if (error) {
    console.error("Error fetching profile:", error);
  } else if (data && data.length > 0) {
    console.log("Columns in profiles:", Object.keys(data[0]));
  } else {
    console.log("Profiles table is empty!");
  }
}

checkColumns();
