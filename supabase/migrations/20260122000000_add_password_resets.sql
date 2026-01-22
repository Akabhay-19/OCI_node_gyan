CREATE TABLE IF NOT EXISTS password_resets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  identifier TEXT NOT NULL,
  role TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_password_resets_identifier ON password_resets(identifier);
