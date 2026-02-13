import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function run() {
    console.log("URL:", process.env.SUPABASE_URL);
    console.log("Checking system_users...");
    const { data, error } = await supabase.from('system_users').select('*');
    if (error) {
        console.error("Error:", error);
    } else {
        console.log("Users:", data);
    }
}

run();
