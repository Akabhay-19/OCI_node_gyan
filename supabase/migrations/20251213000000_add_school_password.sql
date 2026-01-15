-- Add password column to schools table
ALTER TABLE schools ADD COLUMN IF NOT EXISTS "password" text;
