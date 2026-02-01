import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const run = async () => {
    const email = 'akabhay.official@gmail.com';
    const password = 'Gyan_ai_1';

    console.log(`\n🔍 Debugging Login for: ${email}`);
    console.log(`🔑 Password to check: ${password}`);

    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseKey) {
        console.error('❌ Missing Supabase Key in .env');
        return;
    }
    console.log(`📡 Using Key starts with: ${supabaseKey.substring(0, 5)}...`);

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Fetch User
    console.log('... Querying system_users table ...');
    const { data: user, error } = await supabase
        .from('system_users')
        .select('*')
        .eq('email', email)
        .eq('role', 'DEVELOPER')
        .single();

    if (error) {
        console.error('❌ Database Error:', error.message);
        console.error('   (If "Row level security policy violated", your Service Key is invalid or not loaded)');
        return;
    }

    if (!user) {
        console.error('❌ User not found in database.');
        return;
    }

    console.log('✅ User found in DB.');
    console.log(`   Hash in DB: ${user.password_hash.substring(0, 10)}...`);

    // 2. Compare Hash
    console.log('... Comparing password with hash ...');
    const isValid = await bcrypt.compare(password, user.password_hash);

    if (isValid) {
        console.log('\n✅ SUCCESS: Password is correct matches the hash!');
        console.log('   If login fails on the site, PLEASE RESTART YOUR BACKEND SERVER.');
    } else {
        console.error('\n❌ FAILURE: Password does NOT match the hash in the DB.');
        console.error('   The credentials in the DB might be from an older script run or manual entry.');
    }
};

run();
