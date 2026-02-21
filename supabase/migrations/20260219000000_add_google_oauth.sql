-- Add Google OAuth support to all auth tables
-- Migration: Add google_id, auth_provider, oauth_linked_at columns, hardening schema and performance

-- 1. Hardware Schema: Make password nullable to support Google-only users
ALTER TABLE students ALTER COLUMN password DROP NOT NULL;
ALTER TABLE teachers ALTER COLUMN password DROP NOT NULL;
ALTER TABLE schools ALTER COLUMN password DROP NOT NULL;
ALTER TABLE system_users ALTER COLUMN password_hash DROP NOT NULL;

-- 2. Hardware Integrity: Add Google OAuth columns and CHECK constraints
-- Students table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='students' AND column_name='google_id') THEN
        ALTER TABLE students ADD COLUMN google_id TEXT UNIQUE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='students' AND column_name='auth_provider') THEN
        ALTER TABLE students ADD COLUMN auth_provider TEXT DEFAULT 'email';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='students' AND column_name='oauth_linked_at') THEN
        ALTER TABLE students ADD COLUMN oauth_linked_at TIMESTAMP;
    END IF;
END $$;

-- Teachers table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='teachers' AND column_name='google_id') THEN
        ALTER TABLE teachers ADD COLUMN google_id TEXT UNIQUE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='teachers' AND column_name='auth_provider') THEN
        ALTER TABLE teachers ADD COLUMN auth_provider TEXT DEFAULT 'email';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='teachers' AND column_name='oauth_linked_at') THEN
        ALTER TABLE teachers ADD COLUMN oauth_linked_at TIMESTAMP;
    END IF;
END $$;

-- Schools table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='schools' AND column_name='google_id') THEN
        ALTER TABLE schools ADD COLUMN google_id TEXT UNIQUE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='schools' AND column_name='auth_provider') THEN
        ALTER TABLE schools ADD COLUMN auth_provider TEXT DEFAULT 'email';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='schools' AND column_name='oauth_linked_at') THEN
        ALTER TABLE schools ADD COLUMN oauth_linked_at TIMESTAMP;
    END IF;
END $$;

-- System users table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='system_users' AND column_name='google_id') THEN
        ALTER TABLE system_users ADD COLUMN google_id TEXT UNIQUE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='system_users' AND column_name='auth_provider') THEN
        ALTER TABLE system_users ADD COLUMN auth_provider TEXT DEFAULT 'email';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='system_users' AND column_name='oauth_linked_at') THEN
        ALTER TABLE system_users ADD COLUMN oauth_linked_at TIMESTAMP;
    END IF;
END $$;

-- 3. Integrity Constraints: Add auth_provider CHECK constraints
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'students_auth_provider_check') THEN
        ALTER TABLE students ADD CONSTRAINT students_auth_provider_check CHECK (auth_provider IN ('email', 'google', 'both'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'teachers_auth_provider_check') THEN
        ALTER TABLE teachers ADD CONSTRAINT teachers_auth_provider_check CHECK (auth_provider IN ('email', 'google', 'both'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'schools_auth_provider_check') THEN
        ALTER TABLE schools ADD CONSTRAINT schools_auth_provider_check CHECK (auth_provider IN ('email', 'google', 'both'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'system_users_auth_provider_check') THEN
        ALTER TABLE system_users ADD CONSTRAINT system_users_auth_provider_check CHECK (auth_provider IN ('email', 'google', 'both'));
    END IF;
END $$;

-- 4. Performance: Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_students_google_id ON students(google_id);
CREATE INDEX IF NOT EXISTS idx_teachers_google_id ON teachers(google_id);
CREATE INDEX IF NOT EXISTS idx_schools_google_id ON schools(google_id);
CREATE INDEX IF NOT EXISTS idx_system_users_google_id ON system_users(google_id);

CREATE INDEX IF NOT EXISTS idx_students_email ON students(email);
CREATE INDEX IF NOT EXISTS idx_teachers_email ON teachers(email);
CREATE INDEX IF NOT EXISTS idx_schools_admin_email ON schools("adminEmail");
CREATE INDEX IF NOT EXISTS idx_system_users_email ON system_users(email);
