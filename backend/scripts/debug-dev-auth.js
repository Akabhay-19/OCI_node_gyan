
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase credentials missing');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debug() {
    console.log('--- Debugging Dev Auth ---');
    const email = 'admin@gyan.ai';
    console.log(`Fetching user: ${email}`);

    const { data: user, error } = await supabase
        .from('system_users')
        .select('*')
        .eq('email', email)
        .single();

    if (error) {
        console.error('Error fetching user:', error);
        return;
    }

    if (!user) {
        console.error('User not found');
        return;
    }

    console.log('User found:', user);
    console.log('Columns:', Object.keys(user));

    if (user.passwordHash) {
        console.log('passwordHash found. Verifying against "admin123"...');
        const isValid = await bcrypt.compare('admin123', user.passwordHash);
        console.log(`Match result: ${isValid}`);
    } else {
        console.log('No passwordHash column or value is null/empty.');
    }

    if (user.password) {
        console.log('password column found (might be wrong column usage). value:', user.password);
    }
}

debug();
