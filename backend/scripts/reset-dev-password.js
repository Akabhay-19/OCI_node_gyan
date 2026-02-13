import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function run() {
    const email = 'admin@gyan.ai';
    const newPassword = 'admin123';

    console.log(`Resetting password for ${email}...`);
    const hash = await bcrypt.hash(newPassword, 10);

    const { error } = await supabase
        .from('system_users')
        .update({ passwordHash: hash })
        .eq('email', email);

    if (error) {
        console.error("Update Error:", error);
    } else {
        console.log("Password updated successfully to 'admin123'");
    }
}

run();
