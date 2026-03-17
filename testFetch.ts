import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nhcwsuvwxbvtmtybolwg.supabase.co';
const supabaseAnonKey = 'sb_publishable_zslo9WiApznz0igRRKLqtQ_EBCCEaHK';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testFetch() {
  console.log("Fetching Maintenance Requests...");
  
  const { data, error } = await supabase
    .from('maintenance_requests')
    .select(`*`);

  if (error) {
    console.error("❌ Error fetching requests:", error.message);
  } else {
    console.log(`✅ Fetched ${data?.length || 0} requests!`);
    console.log("Sample active statuses:");
    const statuses = [...new Set((data || []).map((req: any) => req.status))];
    console.log(statuses);
  }
}

testFetch();
