-- GYAN AI - Consolidated Supabase Setup Script
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Schools
create table if not exists schools (
    id text primary key,
    name text,
    "inviteCode" text,
    "adminEmail" text,
    "subscriptionStatus" text,
    "trialEndsAt" text,
    "studentCount" integer default 0,
    "maxStudents" integer,
    plan text,
    "logoUrl" text,
    password text
);

-- 2. Teachers
create table if not exists teachers (
    id text primary key,
    "schoolId" text references schools(id),
    name text,
    email text,
    subject text,
    "joinedAt" text,
    "assignedClasses" jsonb,
    password text,
    "mobileNumber" text
);

-- 3. Classrooms
create table if not exists classrooms (
    id text primary key,
    "schoolId" text references schools(id),
    "teacherId" text references teachers(id),
    name text,
    section text,
    motto text,
    "inviteCode" text,
    "studentIds" jsonb,
    subject text,
    subjects jsonb
);

-- 4. Students
create table if not exists students (
    id text primary key,
    "schoolId" text references schools(id),
    "classId" text,
    "classIds" jsonb,
    name text,
    "mobileNumber" text,
    "rollNumber" text,
    username text,
    email text,
    password text,
    grade text,
    attendance integer default 0,
    "avgScore" integer default 0,
    status text,
    "weakerSubjects" jsonb,
    "weaknessHistory" jsonb
);

-- 5. Announcements
create table if not exists announcements (
    id text primary key,
    "schoolId" text references schools(id),
    "authorName" text,
    content text,
    type text,
    timestamp text
);

-- 6. Assignments
create table if not exists assignments (
    id text primary key,
    "classId" text references classrooms(id),
    title text,
    description text,
    subject text,
    type text,
    "maxMarks" integer,
    deadline text,
    "createdAt" text,
    questions jsonb,
    attachment text
);

-- 7. Parents
create table if not exists parents (
    id text primary key,
    "schoolId" text references schools(id),
    name text,
    email text,
    "mobileNumber" text,
    "childId" text references students(id),
    "joinedAt" text
);

-- 8. Submissions
create table if not exists submissions (
    id text primary key,
    "assignmentId" text references assignments(id),
    "studentId" text references students(id),
    answers jsonb,
    score integer,
    "maxMarks" integer,
    "submittedAt" text,
    "timeTaken" integer,
    "textAnswer" text,
    attachment text
);

-- 9. Suggestions
create table if not exists suggestions (
  id text primary key,
  "fromTeacherId" text,
  "fromTeacherName" text,
  "toStudentId" text,
  content text,
  "createdAt" text,
  "readAt" text
);

-- 10. System Users (Auth)
create table if not exists system_users (
  id uuid default gen_random_uuid() primary key,
  email text unique not null,
  password_hash text not null,
  role text not null check (role in ('ADMIN', 'DEVELOPER')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 11. App Config (AI Settings)
create table if not exists app_config (
  key text primary key,
  value text not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 12. Generated Modules (History)
create table if not exists generated_modules (
  id uuid default uuid_generate_v4() primary key,
  "studentId" text not null,
  type text not null,
  topic text not null,
  content jsonb not null,
  "classId" text,
  "createdAt" timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 13. Teacher History
create table if not exists teacher_history (
  id text primary key,
  "teacherId" text,
  type text,
  topic text,
  content jsonb,
  "gradeLevel" text,
  subject text,
  "createdAt" text
);

-- 14. Site Content
create table if not exists site_content (
  id text primary key,
  content jsonb,
  "updatedAt" text
);

-- 15. Contact Submissions
create table if not exists contact_submissions (
  id text primary key,
  name text,
  email text,
  message text,
  "submittedAt" text,
  status text
);

-- 16. Password Resets
create table if not exists password_resets (
    id uuid default gen_random_uuid() primary key,
    identifier text not null,
    role text not null,
    otp text not null,
    expires_at timestamp with time zone not null,
    created_at timestamp with time zone default now()
);

-- 17. Opportunities
create table if not exists opportunities (
    id uuid default gen_random_uuid() primary key,
    title text not null,
    type text not null,
    organization text,
    description text,
    deadline date,
    url text,
    tags text[],
    created_at timestamp with time zone default now()
);

-- 18. Learning Gaps (Caching)
create table if not exists learning_gaps (
    id text primary key,
    cached_explanation text,
    cached_questions jsonb,
    updated_at timestamp with time zone default now()
);

-- Storage Buckets
insert into storage.buckets (id, name, public) 
values ('assignments', 'assignments', true), ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Policies (Allow all for simplicity in this stage, should be hardened later)
-- Note: Requires RLS to be enabled first if you want specific policies.
-- For now, we assume standard setup.

-- Default AI Config
insert into app_config (key, value)
values 
  ('ai_provider', 'openrouter'),
  ('ai_model', 'google/gemini-2.0-flash-exp:free'),
  ('ai_audio_model', 'gemini-2.0-flash-exp')
on conflict (key) do nothing;
