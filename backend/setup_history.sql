-- Create generated_modules table if it doesn't exist
create table if not exists generated_modules (
  id uuid default uuid_generate_v4() primary key,
  "studentId" text not null,
  type text not null,
  topic text not null,
  content jsonb not null,
  "createdAt" timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add index for faster queries
create index if not exists idx_generated_modules_studentId on generated_modules("studentId");

-- Enable RLS (Optional but recommended)
alter table generated_modules enable row level security;

-- Policy: Allow read access to everyone (or restrict to owner if auth enabled)
create policy "Allow all access" on generated_modules for all using (true);
