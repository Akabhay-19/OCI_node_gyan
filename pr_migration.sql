-- Add Google OAuth support to all auth tables
-- Migration: Add google_id, auth_provider, oauth_linked_at columns

-- Students table
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS google_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS auth_provider TEXT DEFAULT 'email',
ADD COLUMN IF NOT EXISTS oauth_linked_at TIMESTAMP;

-- Teachers table
ALTER TABLE teachers 
ADD COLUMN IF NOT EXISTS google_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS auth_provider TEXT DEFAULT 'email',
ADD COLUMN IF NOT EXISTS oauth_linked_at TIMESTAMP;

-- Schools table
ALTER TABLE schools 
ADD COLUMN IF NOT EXISTS google_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS auth_provider TEXT DEFAULT 'email',
ADD COLUMN IF NOT EXISTS oauth_linked_at TIMESTAMP;

-- System users table (for developer auth)
ALTER TABLE system_users 
ADD COLUMN IF NOT EXISTS google_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS auth_provider TEXT DEFAULT 'email',
ADD COLUMN IF NOT EXISTS oauth_linked_at TIMESTAMP;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_students_google_id ON students(google_id);
CREATE INDEX IF NOT EXISTS idx_teachers_google_id ON teachers(google_id);
CREATE INDEX IF NOT EXISTS idx_schools_google_id ON schools(google_id);
CREATE INDEX IF NOT EXISTS idx_system_users_google_id ON system_users(google_id);
