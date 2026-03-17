import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nhcwsuvwxbvtmtybolwg.supabase.co';
const supabaseAnonKey = 'sb_publishable_zslo9WiApznz0igRRKLqtQ_EBCCEaHK';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkRelations() {
  const { data: requests } = await supabase.from('maintenance_requests').select('id, customer_id, worker_id, status').limit(5);
  const { data: profiles } = await supabase.from('profiles').select('id, full_name');
  
  console.log("Sample Requests:");
  console.log(requests);
  
  console.log("\nSample Profiles List:");
  console.log(profiles);

  console.log("\nMatching test:");
  if (requests && profiles) {
      requests.forEach(r => {
         const customer = profiles.find(p => p.id === r.customer_id);
         const worker = profiles.find(p => p.id === r.worker_id);
         console.log(`Req ${r.id.slice(0, 6)} | Cust: ${customer?.full_name || 'NOT FOUND'} | Worker: ${worker?.full_name || 'NOT FOUND'}`);
      });
  }
}

checkRelations();
