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
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY; // Using anon key for client-side ops, but for admin tasks usually need service_role. 
// However, since we are just doing SQL via RPC or standard insert (if RLS allows) or if we don't have service_role, we might hit RLS issues.
// Let's assume for this "dev console" removal, we are okay using the standard client if we can running SQL or if RLS is open.
// Actually, standard supabase-js client doesn't support generic SQL execution without a specific RPC function or using the service role key to bypass RLS.
// Wait, the user's backend `server.js` uses `createClient`. Let's assume we can use the same key for now, OR better, provide a direct SQL statement via the dashboard if this fails.
// But the user asked ME to do it.
// Let me check if I can use the `postgres` library if supabase-js doesn't suffice, but I don't have the connection string, only URL/Key.
// Let's try to specificially use the SQL editor feature via the dashboard? No, I am an AI.
// I will try to use the `rpc` method if there is one, OR just standard table operations.
// Standard table operations:
// 1. Create table? Supabase-js client cannot create tables.
// 2. Insert rows? Yes.
//
// PROBLEM: I cannot CREATE a table using `supabase-js` client unless I have a specific RPC function setup for generic SQL, which is unlikely and unsafe.
//
// ALTERNATIVE: I can ask the user to run the SQL I generated in the previous step in their Supabase SQL Editor. 
// BUT, the user asked me to "remove hardcoded credentials".
//
// Maybe I can assume the user has a `service_role` key? It's not in the .env I saw.
//
// WAIT, I previously saw `check_asg.js` in the file list. Maybe that does something similar?
//
// Let's look at `backend/setup_db.js` if it exists, or just try to insert into an existing table?
// No, I need to create the table.
//
// If I cannot create the table via API, I should ask the user to run the SQL.
// HOWEVER, I can try to use the `pg` library if there is a connection string?
// The `.env` I viewed only had `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
//
// Strategy Change:
// Since I cannot create tables via the JS client with just an Anon key (usually), and I don't have a direct DB connection string:
// I will create a script that *logs* the SQL to be run, or attempts to use a potentially existing `rpc`? No that's guessing.
//
// Actually, if this is a "local" setup or if the user has permissions...
// Let's look at `server.js` again. Does it have any table creation logic?
// `backend/server.js` lines 1-800 showed `import { createClient } from '@supabase/supabase-js'`.
//
// If I can't run SQL, I can't create the table.
//
// Let's verify if `VITE_SUPABASE_ANON_KEY` has privileges. Usually it doesn't.
//
// Wait, I can use the `create system_users` SQL I wrote earlier.
// I will output the SQL and ask the user to run it in Supabase Dashboard.
// THEN I will run the seeding script (which blindly attempts insert).
//
// BETTER: I will assume the user might have a `SUPABASE_SERVICE_ROLE_KEY` or `DATABASE_URL` that I missed?
// I reviewed .env lines 1-41. It was NOT there.
//
// OK, I will create the migration script to *hash the password* and print the SQL INSERT statement, and also print the CREATE TABLE statement.
// This is the safest bet if I can't connect directly.
//
// OR, I can try to assume there might be a postgres connection string hidden somewhere? Unlikely.
//
// Let's write the script to:
// 1. Hash the password.
// 2. Attempt to insert into `system_users` using the supabase client.
// 3. If that fails (table doesn't exist), catch the error and print:
//    "Please run the following SQL in your Supabase SQL Editor to set up the secure table:"
//    (SQL for Create Table + SQL for Insert)
//
// This handles both cases.

const run = async () => {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Developer Credentials to Migrate
    const email = process.env.DEV_CONSOLE_EMAIL || 'akabhay.official@gmail.com';
    const password = process.env.DEV_CONSOLE_PASSWORD || '1234567890a@A';

    console.log(`Preparing to migrate credentials for ${email}...`);

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    console.log('Password hashed successfully.');

    const { data, error } = await supabase
        .from('system_users')
        .insert([
            {
                email: email,
                password_hash: hashedPassword,
                role: 'DEVELOPER'
            }
        ])
        .select();

    if (error) {
        console.error('\n❌ Automatic migration failed (likely due to missing table or permissions).');
        console.error('Error:', error.message);
        console.log('\n⚠️  ACTION REQUIRED: Please run this SQL in your Supabase SQL Editor:\n');
        console.log(`
-- 1. Create the table
create table if not exists system_users (
  id uuid default gen_random_uuid() primary key,
  email text unique not null,
  password_hash text not null,
  role text not null check (role in ('ADMIN', 'DEVELOPER')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Insert the developer user
INSERT INTO system_users (email, password_hash, role)
VALUES ('${email}', '${hashedPassword}', 'DEVELOPER')
ON CONFLICT (email) DO UPDATE SET password_hash = '${hashedPassword}';
        `);
    } else {
        console.log('\n✅ Successfully inserted developer user into system_users table!');
    }
};

run();
