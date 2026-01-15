
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

// Load .env file
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log("Supabase URL:", supabaseUrl ? "Found" : "MISSING");
console.log("Supabase Key:", supabaseKey ? "Found" : "MISSING");

if (!supabaseUrl || !supabaseKey) {
    console.error("Critical: Missing Credentials in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const testHistory = async () => {
    console.log("1. Testing Connection to 'generated_modules'...");

    // Check if table exists by selecting 1 record
    const { data, error } = await supabase
        .from('generated_modules')
        .select('*')
        .limit(1);

    if (error) {
        console.error("❌ Error querying table:", error);
        if (error.code === '42P01') {
            console.error("   Reason: Table 'generated_modules' does NOT exist.");
        }
    } else {
        console.log("✅ Success! Table exists.");
        console.log(`   Record count (preview): ${data.length}`);
        if (data.length > 0) {
            console.log("   Sample Record:", JSON.stringify(data[0], null, 2));
        } else {
            console.log("   The table is currently EMPTY.");
        }
    }

    console.log("\n2. Testing Insert (Check Permissions)...");
    const dummy = {
        studentId: 'TEST-USER',
        type: 'QUIZ',
        topic: 'Debug Test',
        content: { test: true },
        createdAt: new Date().toISOString()
    };

    const { error: insertError } = await supabase.from('generated_modules').insert([dummy]);
    if (insertError) {
        console.error("❌ Insert Failed:", insertError);
    } else {
        console.log("✅ Insert Successful! (Permissions OK)");
    }
};

testHistory();
