
import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(__dirname, 'database.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    db.run('PRAGMA foreign_keys = ON'); // Enable foreign key constraints
    db.run('PRAGMA journal_mode = WAL'); // Enable Write-Ahead Logging for concurrency
  }
});

// Initial Data
const INITIAL_SCHOOLS = [
  { id: 'SCH-DEMO', name: 'Nebula Academy', inviteCode: 'NEB-2025', adminEmail: 'admin@nebula.edu', subscriptionStatus: 'ACTIVE', trialEndsAt: '2025-12-31', studentCount: 150, maxStudents: 500, plan: 'ENTERPRISE', logoUrl: '' }
];
const INITIAL_TEACHERS = [
  { id: 'T-DEMO', schoolId: 'SCH-DEMO', name: 'Sarah Connor', email: 'sarah@nebula.edu', subject: 'Physics', joinedAt: '2024-01-15', assignedClasses: '[]' }
];
const INITIAL_STUDENTS = [];
const INITIAL_CLASSROOMS = [];
const INITIAL_ANNOUNCEMENTS = [];
const INITIAL_PARENTS = [
  { id: 'P-DEMO-1', schoolId: 'SCH-DEMO', name: 'John Doe Sr.', email: 'john.sr@example.com', mobileNumber: '9998887771', childId: 'STU-001', joinedAt: '2024-02-01' }
];

db.serialize(() => {
  // Schools Table
  db.run(`CREATE TABLE IF NOT EXISTS schools (
    id TEXT PRIMARY KEY,
    name TEXT,
    inviteCode TEXT,
    adminEmail TEXT,
    subscriptionStatus TEXT,
    trialEndsAt TEXT,
    studentCount INTEGER,
    maxStudents INTEGER,
    plan TEXT,
    logoUrl TEXT
  )`);


  // Students Table
  db.run(`CREATE TABLE IF NOT EXISTS students (
    id TEXT PRIMARY KEY,
    schoolId TEXT,
    classId TEXT,
    name TEXT,
    mobileNumber TEXT,
    rollNumber TEXT,
    username TEXT,
    password TEXT,
    grade TEXT,
    attendance INTEGER,
    avgScore INTEGER,
    status TEXT,
    weakerSubjects TEXT, -- JSON string
    weaknessHistory TEXT, -- JSON string
    FOREIGN KEY(schoolId) REFERENCES schools(id)
  )`);

  // Classrooms Table
  db.run(`CREATE TABLE IF NOT EXISTS classrooms (
    id TEXT PRIMARY KEY,
    schoolId TEXT,
    teacherId TEXT,
    name TEXT,
    section TEXT,
    motto TEXT,
    inviteCode TEXT,
    studentIds TEXT, -- JSON string
    subject TEXT, -- Main Subject
    subjects TEXT, -- JSON string of all subjects
    FOREIGN KEY(schoolId) REFERENCES schools(id),
    FOREIGN KEY(teacherId) REFERENCES teachers(id)
  )`);

  // Teachers Table (Added missing table definition which was implicit in previous files but good to be explicit if not already exists)
  db.run(`CREATE TABLE IF NOT EXISTS teachers (
    id TEXT PRIMARY KEY,
    schoolId TEXT,
    name TEXT,
    email TEXT,
    subject TEXT,
    joinedAt TEXT,
    assignedClasses TEXT, -- JSON string
    FOREIGN KEY(schoolId) REFERENCES schools(id)
  )`);

  // Announcements Table
  db.run(`CREATE TABLE IF NOT EXISTS announcements (
    id TEXT PRIMARY KEY,
    schoolId TEXT,
    authorName TEXT,
    content TEXT,
    type TEXT,
    timestamp TEXT,
    FOREIGN KEY(schoolId) REFERENCES schools(id)
  )`);

  // Assignments Table
  db.run(`CREATE TABLE IF NOT EXISTS assignments (
    id TEXT PRIMARY KEY,
    classId TEXT,
    title TEXT,
    description TEXT,
    subject TEXT,
    type TEXT,
    maxMarks INTEGER,
    deadline TEXT,
    createdAt TEXT,
    questions TEXT, -- JSON string
    FOREIGN KEY(classId) REFERENCES classrooms(id)
  )`);

  // Parents Table
  db.run(`CREATE TABLE IF NOT EXISTS parents (
    id TEXT PRIMARY KEY,
    schoolId TEXT,
    name TEXT,
    email TEXT,
    mobileNumber TEXT,
    childId TEXT,
    joinedAt TEXT,
    FOREIGN KEY(schoolId) REFERENCES schools(id),
    FOREIGN KEY(childId) REFERENCES students(id)
  )`);

  // Migration: Add 'questions' column to assignments table if missing
  db.run("ALTER TABLE assignments ADD COLUMN questions TEXT", (err) => {
    if (err && !err.message.includes("duplicate column name")) console.error("Migration Note:", err.message);
  });

  // Migration: Add 'attachment' column to assignments table if missing
  db.run("ALTER TABLE assignments ADD COLUMN attachment TEXT", (err) => {
    if (err && !err.message.includes("duplicate column name")) console.error("Migration Note:", err.message);
  });

  db.run(`CREATE TABLE IF NOT EXISTS submissions (
    id TEXT PRIMARY KEY,
    assignmentId TEXT,
    studentId TEXT,
    answers TEXT, -- JSON string of student answers
    score INTEGER,
    maxMarks INTEGER,
    submittedAt TEXT,
    timeTaken INTEGER,
    textAnswer TEXT, -- New: For subjective text
    attachment TEXT, -- New: For subjective file
    FOREIGN KEY(assignmentId) REFERENCES assignments(id),
    FOREIGN KEY(studentId) REFERENCES students(id)
  )`);

  // Migration: Add textAnswer/attachment to submissions if missing
  db.run("ALTER TABLE submissions ADD COLUMN textAnswer TEXT", (err) => {
    if (err && !err.message.includes("duplicate column name")) console.error("Migration Note:", err.message);
  });
  db.run("ALTER TABLE submissions ADD COLUMN attachment TEXT", (err) => {
    if (err && !err.message.includes("duplicate column name")) console.error("Migration Note:", err.message);
  });


  // Migration: Add 'classIds' column to students table if missing
  db.run("ALTER TABLE students ADD COLUMN classIds TEXT", (err) => {
    if (err && !err.message.includes("duplicate column name")) console.error("Migration Note:", err.message);
  });

  // Migration: Add 'password' column to teachers table if missing
  db.run("ALTER TABLE teachers ADD COLUMN password TEXT", (err) => {
    if (err && !err.message.includes("duplicate column name")) console.error("Migration Note:", err.message);
  });

  // Migration: Add 'mobileNumber' column to teachers table if missing
  db.run("ALTER TABLE teachers ADD COLUMN mobileNumber TEXT", (err) => {
    if (err && !err.message.includes("duplicate column name")) console.error("Migration Note:", err.message);
  });

  // Migration: Add 'subject' column to classrooms table if missing
  db.run("ALTER TABLE classrooms ADD COLUMN subject TEXT", (err) => {
    if (err && !err.message.includes("duplicate column name")) console.error("Migration Note:", err.message);
  });

  // Migration: Add 'subjects' column to classrooms table if missing
  db.run("ALTER TABLE classrooms ADD COLUMN subjects TEXT", (err) => {
    if (err && !err.message.includes("duplicate column name")) console.error("Migration Note:", err.message);
  });

  // Seed Data if empty
  db.get("SELECT count(*) as count FROM schools", (err, row) => {
    if (row && row.count === 0) {
      console.log("Seeding initial data...");
      db.serialize(() => {
        const stmtSchool = db.prepare("INSERT INTO schools VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        INITIAL_SCHOOLS.forEach(s => stmtSchool.run(s.id, s.name, s.inviteCode, s.adminEmail, s.subscriptionStatus, s.trialEndsAt, s.studentCount, s.maxStudents, s.plan, s.logoUrl));
        stmtSchool.finalize();

        const stmtTeacher = db.prepare("INSERT INTO teachers VALUES (?, ?, ?, ?, ?, ?, ?)");
        INITIAL_TEACHERS.forEach(t => stmtTeacher.run(t.id, t.schoolId, t.name, t.email, t.subject, t.joinedAt, t.assignedClasses));
        stmtTeacher.finalize();

        const stmtStudent = db.prepare("INSERT INTO students VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        INITIAL_STUDENTS.forEach(s => stmtStudent.run(s.id, s.schoolId, s.classId, s.name, s.mobileNumber, s.rollNumber, s.username, s.password, s.grade, s.attendance, s.avgScore, s.status, s.weakerSubjects, s.weaknessHistory));
        stmtStudent.finalize();

        const stmtClass = db.prepare("INSERT INTO classrooms VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
        INITIAL_CLASSROOMS.forEach(c => stmtClass.run(c.id, c.schoolId, c.teacherId, c.name, c.section, c.motto, c.inviteCode, c.studentIds));
        stmtClass.finalize();

        const stmtAnn = db.prepare("INSERT INTO announcements VALUES (?, ?, ?, ?, ?, ?)");
        INITIAL_ANNOUNCEMENTS.forEach(a => stmtAnn.run(a.id, a.schoolId, a.authorName, a.content, a.type, a.timestamp));
        stmtAnn.finalize();
      });
    }

    // Independent check for parents (in case schools existed but parents didn't)
    db.get("SELECT count(*) as count FROM parents", (err, pRow) => {
      if (pRow && pRow.count === 0) {
        // Find a valid student to link to
        db.get("SELECT id, schoolId FROM students LIMIT 1", (err, student) => {
          if (student) {
            console.log("Seeding parents linked to student:", student.id);
            const stmtParent = db.prepare("INSERT INTO parents VALUES (?, ?, ?, ?, ?, ?, ?)");
            // Create a parent linked to this real student
            stmtParent.run('P-DEMO-1', student.schoolId, 'John Doe Sr.', 'john.sr@example.com', '9998887771', student.id, '2024-02-01');
            stmtParent.finalize();
          } else {
            console.log("No students found, skipping parent seed.");
          }
        });
      }
    });
  });
});

export default db;
