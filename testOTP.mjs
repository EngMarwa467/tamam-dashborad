import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nhcwsuvwxbvtmtybolwg.supabase.co';
const supabaseAnonKey = 'sb_publishable_zslo9WiApznz0igRRKLqtQ_EBCCEaHK';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testOTP() {
    console.log("Sending OTP to +9647713333333...");
    const { data, error } = await supabase.auth.signInWithOtp({
        phone: '+9647713333333',
    });

    if (error) {
        console.error("❌ ERROR:", error);
        console.error("Code:", error.code);
        console.error("Status:", error.status);
        console.error("Name:", error.name);
    } else {
        console.log("✅ SUCCESS:", data);
    }
}

testOTP();
