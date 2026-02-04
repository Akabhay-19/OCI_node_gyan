-- Run this in the Supabase SQL Editor to fix the schema cache error

-- 1. Ensure the email column exists in the students table
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS email text;

-- 2. Force PostgREST to reload the schema cache
NOTIFY pgrst, 'reload config';
