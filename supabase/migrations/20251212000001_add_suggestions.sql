-- Suggestions (Teacher to Student Feedback)
create table if not exists suggestions (
  id text primary key,
  "fromTeacherId" text,
  "fromTeacherName" text,
  "toStudentId" text,
  content text,
  "createdAt" text,
  "readAt" text
);
