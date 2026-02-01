import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
// Tries to find a service key, otherwise falls back to anon key (which might fail RLS if not open)
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const run = async () => {
    // --- CONFIGURATION ---
    const email = 'akabhay.official@gmail.com'; // User to update
    const newPassword = 'NEW_PASSWORD_HERE';    // <--- CHANGE THIS BEFORE RUNNING
    // ---------------------

    if (newPassword === 'NEW_PASSWORD_HERE') {
        console.error('❌ Error: Please edit this script and set a real value for "newPassword".');
        return;
    }

    console.log(`Generating hash for new password...`);
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    console.log('Password hashed.');

    // Attempt to update directly via Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
        .from('system_users')
        .update({ password_hash: hashedPassword })
        .eq('email', email)
        .select();

    if (error) {
        console.error('\n❌ Failed to update via API (likely permission/RLS issues).');
        console.error('Error:', error.message);
        console.log('\n⚠️  MANUAL ACTION REQUIRED: Run this SQL in Supabase Dashboard:');
        console.log(`
UPDATE system_users 
SET password_hash = '${hashedPassword}'
WHERE email = '${email}';
        `);
    } else {
        // Check if any row was actually updated (Supabase update returns count if header specified, or data)
        // If RLS hides rows, data might be empty.
        if (data && data.length > 0) {
            console.log('\n✅ Password updated successfully!');
        } else {
            console.log('\n⚠️  API call succeeded but no rows returned. Verification needed.');
            console.log('If login fails, run this SQL manually:');
            console.log(`UPDATE system_users SET password_hash = '${hashedPassword}' WHERE email = '${email}';`);
        }
    }
};

run();
