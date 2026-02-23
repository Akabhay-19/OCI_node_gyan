-- ============================================================
-- GYAN AI — Draft Users Table Migration
-- Run this in Supabase SQL Editor
-- ============================================================
-- Purpose: Store incomplete registration drafts temporarily.
-- Drafts auto-expire after 24 hours.
-- Password is NEVER stored (filtered on backend).
-- ============================================================

CREATE TABLE IF NOT EXISTS draft_users (
  draft_id     TEXT        PRIMARY KEY,
  role         TEXT        NOT NULL CHECK (role IN ('STUDENT', 'TEACHER', 'ADMIN', 'PARENT')),
  form_data    JSONB       DEFAULT '{}',
  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_completed BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_draft_users_updated 
  ON draft_users(last_updated_at);

-- Index on is_completed for cleanup queries
CREATE INDEX IF NOT EXISTS idx_draft_users_completed 
  ON draft_users(is_completed);

-- ============================================================
-- Optional: Enable Row Level Security (RLS)
-- If your Supabase project uses RLS, enable below.
-- For draft_users, we use the anon key (public write).
-- ============================================================

-- ALTER TABLE draft_users ENABLE ROW LEVEL SECURITY;

-- Allow anon to insert/update/delete their own draft
-- CREATE POLICY "Allow anon draft access" ON draft_users
--   FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- Cleanup: Delete expired drafts older than 24 hours
-- You can run this periodically via a Supabase cron job
-- or pg_cron extension:
-- ============================================================

-- SELECT cron.schedule(
--   'cleanup-expired-drafts',
--   '0 * * * *',  -- every hour
--   $$ DELETE FROM draft_users WHERE last_updated_at < NOW() - INTERVAL '24 hours'; $$
-- );

-- Manual cleanup (run anytime to remove expired drafts):
DELETE FROM draft_users 
WHERE last_updated_at < NOW() - INTERVAL '24 hours';
