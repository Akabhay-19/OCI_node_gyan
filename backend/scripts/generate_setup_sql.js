import bcrypt from 'bcryptjs';

// --- CONFIGURATION ---
const EMAIL = 'akabhay.official@gmail.com';
const PASSWORD = 'Gyan_ai_1'; // <--- REPLACE THIS WITH YOUR DESIRED PASSWORD
// ---------------------

const run = async () => {
    // Safety check removed


    console.log(`\nGenerating secure database setup SQL for user: ${EMAIL}...\n`);

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(PASSWORD, salt);

    console.log('------------------------------------------------------------------');
    console.log('-- COPY AND RUN THE FOLLOWING CODE IN YOUR SUPABASE SQL EDITOR --');
    console.log('------------------------------------------------------------------\n');

    console.log(`-- 1. Create the secure users table
create table if not exists system_users (
  id uuid default gen_random_uuid() primary key,
  email text unique not null,
  password_hash text not null,
  role text not null check (role in ('ADMIN', 'DEVELOPER')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Insert or Update your admin account
INSERT INTO system_users (email, password_hash, role)
VALUES ('${EMAIL}', '${hashedPassword}', 'DEVELOPER')
ON CONFLICT (email) DO UPDATE SET password_hash = '${hashedPassword}';`);

    console.log('\n------------------------------------------------------------------');
};

run();
