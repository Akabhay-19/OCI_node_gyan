-- Enable UUID extension (useful for future)
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
    "logoUrl" text
);

-- 2. Teachers
create table if not exists teachers (
    id text primary key,
    "schoolId" text references schools(id),
    name text,
    email text,
    subject text,
    "joinedAt" text,
    "assignedClasses" jsonb, -- Array of class IDs
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
    "studentIds" jsonb -- Array of student IDs
);

-- 4. Students
create table if not exists students (
    id text primary key,
    "schoolId" text references schools(id),
    "classId" text, -- No strict FK in original, keeping loose for now
    "classIds" jsonb, -- Array of class IDs
    name text,
    "mobileNumber" text,
    "rollNumber" text,
    username text,
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

-- Create Storage Buckets (Row Level Security enabled by default)
insert into storage.buckets (id, name, public) 
values ('assignments', 'assignments', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public) 
values ('avatars', 'avatars', true)
on conflict (id) do nothing;
