-- Create contact_submissions table
create table if not exists contact_submissions (
    id text primary key,
    name text,
    email text,
    message text,
    "submittedAt" text,
    status text default 'UNREAD' -- 'UNREAD', 'READ', 'ARCHIVED'
);

-- Note: We are using the existing 'site_content' table for storing Contact Info
-- The 'content' JSONB column in 'site_content' (row id='GLOBAL_CONFIG') will now include a "contactInfo" field.
-- Example:
-- {
--   "teamMembers": [...],
--   "contactInfo": {
--     "email": "support@gyan.ai",
--     "phone": "+91 98765 43210",
--     "address": "123 Innovation Drive, Tech Park, Bangalore"
--   }
-- }
