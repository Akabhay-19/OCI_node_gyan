
import React from 'react';

export type UserRole = 'STUDENT' | 'TEACHER' | 'PARENT' | 'ADMIN';

export interface AppState {
  view: 'HOME' | 'ROLE_SELECTION' | 'SCHOOL_JOIN' | 'DASHBOARD' | 'REGISTER_SCHOOL' | 'CLASS_SELECTION' | 'DEV_CONSOLE' | 'ABOUT' | 'TEAM' | 'CONTACT';
  userRole: UserRole | null;
  schoolName: string | null;
  schoolId?: string; // For SaaS linkage
  schoolLogo?: string; // Visual identity
  currentUser?: Student | Teacher | Parent; // Track the logged-in user details
}

// --- SaaS / Backend Types ---
export type SubscriptionTier = 'TRIAL' | 'STARTER' | 'ENTERPRISE';

export interface Teacher {
  id: string;
  schoolId: string;
  name: string;
  email: string;
  subject: string;
  joinedAt: string;
  mobileNumber?: string;
  password?: string; // [NEW] For authentication
  assignedClasses: string[]; // List of class IDs or Names
  google_id?: string;
  auth_provider?: string;
}

export interface Parent {
  id: string;
  schoolId: string;
  name: string;
  email: string;
  childId: string; // Link to student
}

export interface Classroom {
  id: string;
  schoolId: string;
  teacherId: string; // Created by
  name: string; // e.g. "Grade 10 - A"
  section: string;
  stream?: string; // For Grade 11-12: Science (Medical/Non-Medical), Commerce, Arts
  motto?: string;
  inviteCode: string; // Unique Class Code
  studentIds: string[];
  subject?: string; // [NEW] Primary subject for this class (e.g. "Maths")
  subjects: { id: string; name: string; teacherId?: string }[];
  status: 'ACTIVE' | 'LOCKED' | 'ARCHIVED'; // LOCKED prevents enrollment, ARCHIVED is soft-deleted
  archivedAt?: string; // ISO timestamp when archived (for 7-day auto-purge)
}

export interface Announcement {
  id: string;
  schoolId: string;
  classId?: string; // If null, it's school-wide
  className?: string; // Display name of target class
  authorId?: string; // Author teacher/admin ID
  authorName: string;
  content: string; // "Thought of the Day"
  type: 'THOUGHT' | 'NOTICE';
  timestamp: string;
}

export interface SchoolProfile {
  id: string;
  name: string;
  logoUrl?: string; // Base64 or URL
  inviteCode: string; // The magic code
  adminEmail: string;
  password?: string; // [NEW] Admin login password
  mobileNumber?: string; // School contact number
  motto?: string; // School motto/tagline
  address?: string; // Full address
  city?: string;
  state?: string;
  pincode?: string;
  subscriptionStatus: 'ACTIVE' | 'EXPIRED' | 'TRIAL';
  trialEndsAt: string; // ISO Date
  studentCount: number;
  maxStudents?: number; // Optional - no limit by default
  plan: SubscriptionTier;
  faculty?: Teacher[];
  google_id?: string;
  auth_provider?: string;
}

// --- Learning Types ---
export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number; // index
  explanation: string;
}

export interface StudyPlanItem {
  topic: string;
  summary: string;
  detailedExplanation: string; // New field for deep dive content
  keyPoints: string[];
  resources: {
    title: string;
    url: string;
    language: string;
    whyRecommended?: string; // AI explanation
  }[];
  otherResources: {
    title: string;
    url: string;
    type: 'article' | 'pdf' | 'website';
    description: string;
  }[];
}

export interface StoryResponse {
  title: string;
  story: string;
  genre: string;
  keyConcepts: string[];
}

export interface WeaknessRecord {
  id: string;
  topic: string;
  subject?: string; // e.g. "Physics", "Math"
  subTopic?: string; // Specific concept (e.g. "Photosynthesis" -> "Light Reaction")
  source?: 'AI_LEARNING' | 'ASSIGNMENT' | 'PRACTICE';
  detectedAt: string;
  status: 'OPEN' | 'RESOLVED';
  score: number; // Initial low score
  remedialCompleted: boolean;
  remedialScore?: number; // Score after remedial
  classId?: string; // [NEW] Link to specific class context
  remedialData?: {
    explanation: string;
    questions: any[];
    userAnswers: number[]; // Store validation history
  };
}

export interface RemedialContent {
  topic: string;
  explanation: string;
  practiceQuestions: QuizQuestion[];
}

export interface Student {
  id: string;
  schoolId?: string; // Link to specific school
  classId?: string; // Link to specific classroom
  classIds?: string[]; // [NEW] Support multiple sections (e.g. Science + Math)
  name: string;
  grade: string;
  stream?: string;
  email?: string;
  mobileNumber?: string;
  rollNumber?: string;
  username?: string;
  password?: string;
  parentEmail?: string;
  parentName?: string;
  parentMobile?: string;
  attendance: number;
  avgScore: number;
  status: 'Active' | 'At Risk' | 'Exceling';
  weakerSubjects: string[];
  weaknessHistory: WeaknessRecord[]; // Detailed tracking
  performanceData?: Record<string, any>; // [NEW] Mastery Tracking & GMI Data
  xp?: number; // [NEW] Gamification
  level?: number; // [NEW] Gamification
  createdAt?: string; // Joining date for attendance tracking
  google_id?: string;
  auth_provider?: string;
}

export type AssignmentType = 'MCQ' | 'SUBJECTIVE' | 'Quiz' | 'UPLOAD' | 'MIXED';

export interface Assignment {
  id: string;
  title: string;
  description: string;
  startTime?: string; // ISO Date when quiz opens
  deadline: string; // ISO Date when quiz closes
  duration?: number; // Minutes allowed to complete
  imageUrl?: string; // Base64 or URL
  maxMarks: number;
  createdAt: string;
  type?: AssignmentType;
  assignedTo?: string[]; // Student IDs
  classId?: string; // Assigned to specific class
  subject?: string; // e.g. "Physics"
  className?: string; // Display name of class
  questions?: any[] | string; // Stored questions JSON or Object
  attachment?: string; // Base64 file
}

export interface Submission {
  id: string;
  assignmentId: string;
  studentId: string;
  studentName: string;
  status: 'PENDING' | 'SUBMITTED' | 'GRADED';
  marks?: number;
  submittedAt?: string;
  feedback?: string;
  submissionUrl?: string;
  textAnswer?: string; // For subjective
  attachment?: string; // For handwritten upload
  answers?: AssignmentAnswer[]; // [NEW] Structured answers per question
  globalAttachment?: string; // [NEW] Whole assignment PDF
}

export interface AiAssignmentResponse {
  title: string;
  description: string;
  suggestedMaxMarks: number;
  questions: {
    question: string;
    options?: string[];
    correctAnswer?: number;
    explanation?: string;
  }[];
}

export interface AssignmentAnswer {
  questionId: string | number;
  questionText?: string;
  textAnswer?: string;
  attachment?: string; // Base64 or URL
}

export interface ChatMessage {
  id: string;
  sender: 'PARENT' | 'TEACHER' | 'STUDENT';
  text: string;
  timestamp: string;
}

export interface Suggestion {
  id: string;
  fromTeacherId: string;
  fromTeacherName: string;
  toStudentId: string;
  content: string;
  createdAt: string;
  readAt?: string;
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  xp: number;
  badges: string[];
}

// Reusable Component Props
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  glow?: boolean;
  size?: 'sm' | 'md' | 'lg';
  glowColor?: 'cyan' | 'orange' | 'blue' | 'red' | 'green' | 'purple';
}

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: 'cyan' | 'orange' | 'blue' | 'red' | 'green' | 'purple';
  hoverEffect?: boolean;
}

// Resource/File Offering for classes
export interface Resource {
  id: string;
  schoolId: string;
  classId: string;
  className?: string;
  subject: string;
  title: string;
  description?: string;
  fileName: string;
  fileType: string; // e.g., 'pdf', 'doc', 'ppt'
  fileData: string; // Base64 encoded file
  uploadedBy: string; // Teacher/Admin name
  uploadedById?: string;
  uploadedAt: string; // ISO Date
}

// --- Flashcards & History ---

export interface Flashcard {
  front: string;
  back: string;
}

export type GeneratedModuleType = 'QUIZ' | 'STUDY_PLAN' | 'FLASHCARDS' | 'STORY' | 'ASSIGNMENT' | 'MINDMAP';

export interface ModuleHistoryItem {
  id: string;
  studentId: string;
  type: GeneratedModuleType;
  topic: string;
  maxMarks?: number; // Optional metadata for assignments/quizzes
  content: any; // JSON content depending on type
  createdAt: string;
  subject?: string; // [NEW] Context
  classId?: string; // [NEW] Context
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  bio: string;
  imageUrl: string; // URL or Base64
  socials: {
    linkedin?: string;
    twitter?: string;
    github?: string;
  };
}

export interface SiteContent {
  teamMembers: TeamMember[];
  aboutUsText?: string; // Optional expansion
  contactInfo?: {
    email: string;
    phone: string;
    address: string;
  };
}

export interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  message: string;
  submittedAt: string;
  status: 'UNREAD' | 'READ' | 'ARCHIVED';
}

export interface Opportunity {
  id: string;
  title: string;
  type: 'SCHOLARSHIP' | 'COMPETITION' | 'OLYMPIAD';
  organization: string;
  deadline: string; // ISO Date string
  reward: string;
  description: string;
  tags: string[];
  link: string;
  searchQuery?: string;
  gradeLevel?: string;
  region?: string;
  interest?: string;
  createdAt?: string;
}

// [NEW] Adaptive Learning Types
export type RecommendationType = 'REMEDIAL' | 'QUIZ' | 'PLAN' | 'NONE';

export interface LearningRecommendation {
  type: RecommendationType;
  topic: string;
  subTopic?: string;
  reason: string;
  actionLabel: string;
  context?: any;
  priority?: number;
}
