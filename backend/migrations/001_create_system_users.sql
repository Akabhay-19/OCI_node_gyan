-- Create a table for system-level users (admins, developers)
create table if not exists system_users (
  id uuid default gen_random_uuid() primary key,
  email text unique not null,
  password_hash text not null,
  role text not null check (role in ('ADMIN', 'DEVELOPER')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Note: The password hash will be generated and inserted by the backend script
-- because we need bcryptjs to generate the compatible hash.
