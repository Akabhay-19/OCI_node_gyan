
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials:", { supabaseUrl, hasKey: !!supabaseKey });
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkInviteCodes() {
    console.log("Checking schools table...");
    const { data: schools, error } = await supabase
        .from('schools')
        .select('id, name, inviteCode, adminEmail');

    if (error) {
        console.error("Error fetching schools:", error);
        return;
    }

    console.log(`Found ${schools.length} schools:`);
    schools.forEach(school => {
        console.log(`- School: "${school.name}" | ID: ${school.id} | Code: "${school.inviteCode}" | Admin: ${school.adminEmail}`);
    });
}

checkInviteCodes();
