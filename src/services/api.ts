import { SchoolProfile, Student, Classroom, Announcement, Teacher, SiteContent } from '../types';

// In production, use relative path (served by same backend). In development, use localhost:5000.
// Production: use relative path. Development: use localhost:5012
const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:5000/api');

export const AI_MODELS = [
    { id: 'google/gemini-2.0-flash-exp:free', name: 'Gemini 2.5 (Flash)', provider: 'Google' }
];

export const DEFAULT_MODEL = 'google/gemini-2.0-flash-exp:free';

export const api = {
    // Schools
    getSchools: async (): Promise<SchoolProfile[]> => {
        const res = await fetch(`${API_URL}/schools`);
        if (!res.ok) throw new Error('Failed to fetch schools');
        return res.json();
    },
    createSchool: async (school: SchoolProfile): Promise<SchoolProfile> => {
        const res = await fetch(`${API_URL}/schools`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(school),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || 'Failed to create school');
        }
        return res.json();
    },
    createTeacher: async (teacher: any): Promise<any> => {
        const res = await fetch(`${API_URL}/teachers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(teacher),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || 'Failed to create teacher');
        }
        return res.json();
    },
    updateTeacher: async (id: string, updates: Partial<Teacher>): Promise<void> => {
        const res = await fetch(`${API_URL}/teachers/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || 'Failed to update teacher');
        }
    },

    // Students
    getStudents: async (): Promise<Student[]> => {
        const res = await fetch(`${API_URL}/students`);
        if (!res.ok) throw new Error('Failed to fetch students');
        return res.json();
    },
    createStudent: async (student: Student): Promise<Student> => {
        const res = await fetch(`${API_URL}/students`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(student),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || 'Failed to create student');
        }
        return res.json();
    },
    updateStudent: async (student: Student): Promise<void> => {
        const res = await fetch(`${API_URL}/students/${student.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(student),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || 'Failed to update student');
        }
    },

    // Classrooms
    getClassrooms: async (): Promise<Classroom[]> => {
        const res = await fetch(`${API_URL}/classrooms`);
        if (!res.ok) throw new Error('Failed to fetch classrooms');
        return res.json();
    },
    createClassroom: async (classroom: Classroom): Promise<Classroom> => {
        const res = await fetch(`${API_URL}/classrooms`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(classroom),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || 'Failed to create classroom');
        }
        return res.json();
    },
    updateClassroom: async (id: string, updates: Partial<Classroom>): Promise<void> => {
        const res = await fetch(`${API_URL}/classrooms/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || 'Failed to update classroom');
        }
    },
    deleteClassroom: async (id: string): Promise<void> => {
        const res = await fetch(`${API_URL}/classrooms/${id}`, {
            method: 'DELETE',
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || 'Failed to delete classroom');
        }
    },

    // Announcements
    getAnnouncements: async (): Promise<Announcement[]> => {
        const res = await fetch(`${API_URL}/announcements`);
        if (!res.ok) throw new Error('Failed to fetch announcements');
        return res.json();
    },
    createAnnouncement: async (announcement: Announcement): Promise<Announcement> => {
        const res = await fetch(`${API_URL}/announcements`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(announcement),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || 'Failed to create announcement');
        }
        return res.json();
    },

    // Migration
    migrateData: async (data: { schools: SchoolProfile[], students: Student[], classrooms: Classroom[], announcements: Announcement[] }): Promise<void> => {
        const res = await fetch(`${API_URL}/migrate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || 'Migration failed');
        }
    },
    login: async (credentials: any): Promise<any> => {
        const res = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credentials),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || 'Login failed');
        }
        const data = await res.json();

        // [NEW] Persist Session
        if (data.id) {
            localStorage.setItem('GYAN_USER_ID', data.id);
            localStorage.setItem('GYAN_USER_ROLE', credentials.role || 'STUDENT');
            if (data.schoolId) localStorage.setItem('GYAN_SCHOOL_ID', data.schoolId);
        }

        return data;
    },

    forgotPassword: async (role: string, identifier: string): Promise<any> => {
        const res = await fetch(`${API_URL}/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role, identifier }),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || 'Failed to send reset code');
        }
        return res.json();
    },

    resetPassword: async (role: string, identifier: string, code: string, newPassword: string): Promise<any> => {
        const res = await fetch(`${API_URL}/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role, identifier, code, newPassword }),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || 'Failed to reset password');
        }
        return res.json();
    },

    logout: () => {
        localStorage.removeItem('GYAN_USER_ID');
        localStorage.removeItem('GYAN_USER_ROLE');
        localStorage.removeItem('GYAN_SCHOOL_ID');
    },

    // --- Teacher History ---
    getTeacherHistory: async (teacherId: string): Promise<any[]> => {
        const res = await fetch(`${API_URL}/teachers/${teacherId}/history`);
        if (!res.ok) return [];
        return res.json();
    },

    // --- Module History ---
    getModuleHistory: async (studentId: string): Promise<any[]> => {
        const res = await fetch(`${API_URL}/students/${studentId}/modules`);
        if (!res.ok) return [];
        return res.json();
    },

    saveModuleHistory: async (studentId: string, type: string, topic: string, content: any, subject?: string, classId?: string): Promise<void> => {
        try {
            const res = await fetch(`${API_URL}/save-module-history`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ studentId, type, topic, content, subject, classId })
            });
            if (!res.ok) {
                const text = await res.text();
                console.error("Failed to save history:", res.status, text);
            }
        } catch (e) {
            console.error("Network error saving history:", e);
        }
    },

    // --- AI Generation Endpoints (Migrated from Client-Side) ---

    generateQuiz: async (topic: string, gradeLevel: string, count: number = 20, studentId?: string, difficulty?: string, classId?: string): Promise<any> => {
        const res = await fetch(`${API_URL}/quiz`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topic, gradeLevel, count, studentId, difficulty, classId })
        });
        if (!res.ok) throw new Error('Failed to generate quiz');
        return res.json();
    },

    generateStudyPlan: async (topic: string, gradeLevel: string, studentId?: string, classId?: string): Promise<any> => {
        const res = await fetch(`${API_URL}/study-plan`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topic, gradeLevel, studentId, classId })
        });
        if (!res.ok) throw new Error('Failed to generate study plan');
        return res.json();
    },

    generateStory: async (topic: string, subject: string, gradeLevel: string, language: string, studentId?: string, classId?: string): Promise<any> => {
        const res = await fetch(`${API_URL}/story`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topic, subject, gradeLevel, language, studentId, classId })
        });
        if (!res.ok) throw new Error('Failed to generate story');
        return res.json();
    },

    generateAssignment: async (topic: string, questionCount: number, type: string, subject: string, gradeLevel: string, difficulty: string, studentId?: string, classId?: string): Promise<any> => {
        const res = await fetch(`${API_URL}/assignment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topic, questionCount, type, subject, gradeLevel, difficulty, studentId, classId })
        });
        if (!res.ok) throw new Error('Failed to generate assignment');
        return res.json();
    },

    generateFlashcards: async (topic: string, gradeLevel: string, count: number = 20, studentId?: string, classId?: string): Promise<any> => {
        const res = await fetch(`${API_URL}/flashcards`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topic, gradeLevel, count, studentId, classId })
        });
        if (!res.ok) throw new Error('Failed to generate flashcards');
        return res.json();
    },

    generateRemedialContent: async (topic: string, subTopic: string, gradeLevel: string, subject?: string): Promise<any> => {
        const res = await fetch(`${API_URL}/remedial/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topic, subTopic, gradeLevel, subject })
        });
        if (!res.ok) throw new Error('Failed to generate remedial content');
        return res.json();
    },

    resolveGap: async (studentId: string, gapId: string, score: number, totalQuestions: number, topic: string, subTopic: string): Promise<any> => {
        const res = await fetch(`${API_URL}/remedial/resolve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ studentId, gapId, score, totalQuestions, topic, subTopic })
        });
        if (!res.ok) throw new Error('Failed to resolve gap');
        return res.json();
    },

    chat: async (message: string, history: any[]): Promise<any> => {
        const res = await fetch(`${API_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, history })
        });
        if (!res.ok) throw new Error('Failed to get chat response');
        return res.json();
    },

    analyzeEnglish: async (text: string): Promise<any> => {
        const res = await fetch(`${API_URL}/english/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        });
        if (!res.ok) throw new Error('Analysis failed');
        return res.json();
    },

    generateEnglishPractice: async (topic: string, level: string, focusContext?: string, previousQuestions?: string[]): Promise<any> => {
        const res = await fetch(`${API_URL}/english/generate-practice`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topic, level, focusContext, previousQuestions })
        });
        if (!res.ok) throw new Error('Generation failed');
        return res.json();
    },

    validateTranslation: async (question: string, answer: string, context?: string): Promise<any> => {
        const res = await fetch(`${API_URL}/english/validate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question, answer, context })
        });
        if (!res.ok) throw new Error('Validation failed');
        return res.json();
    },

    askTutor: async (message: string, context?: string): Promise<{ response: string; success: boolean }> => {
        const res = await fetch(`${API_URL}/english/tutor`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, context })
        });
        if (!res.ok) throw new Error('Tutor unavailable');
        return res.json();
    },

    // --- Writing Assistant ---
    generateWritingGuide: async (type: string, topic: string): Promise<any> => {
        const res = await fetch(`${API_URL}/english/writing/guide`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type, topic })
        });
        if (!res.ok) throw new Error('Failed to generate guide');
        return res.json();
    },

    evaluateWriting: async (type: string, topic: string, content: string): Promise<any> => {
        const res = await fetch(`${API_URL}/english/writing/evaluate`, {
            method: 'POST', // Corrected method from previous plan
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type, topic, content })
        });
        if (!res.ok) throw new Error('Failed to evaluate writing');
        return res.json();
    },

    // Mindmap: Supports both File Upload and Text
    generateMindMap: async (input: File | string, type: 'file' | 'text', topic?: string, context?: { grade?: string; subject?: string }): Promise<any> => {
        if (type === 'file' && input instanceof File) {
            const formData = new FormData();
            formData.append('file', input);
            if (context?.grade) formData.append('gradeLevel', context.grade);
            if (context?.subject) formData.append('subject', context.subject);

            const res = await fetch(`${API_URL}/mindmap`, { // Fixed endpoint to match server.js
                method: 'POST',
                body: formData // Content-Type header skipped automatically for FormData
            });
            if (!res.ok) throw new Error('Failed to generate mindmap from file');
            return res.json();
        } else if (type === 'text' && typeof input === 'string') {
            const res = await fetch(`${API_URL}/generate-mindmap-from-text`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: input,
                    topic: topic || input,
                    gradeLevel: context?.grade,
                    subject: context?.subject
                })
            });
            if (!res.ok) throw new Error('Failed to generate mindmap from text');
            return res.json();
        }
        throw new Error('Invalid input for MindMap generation');
    },

    analyzePrerequisites: async (topic: string, gradeLevel: string): Promise<{ prerequisite: string; reason: string; resourceQuery: string }> => {
        const res = await fetch(`${API_URL}/prerequisites`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topic, gradeLevel })
        });
        if (!res.ok) throw new Error('Failed to analyze prerequisites');
        return res.json();
    },

    submitQuizResult: async (studentId: string, topic: string, userAnswers: number[], questions: any[], classId?: string, source: 'AI_LEARNING' | 'ASSIGNMENT' | 'PRACTICE' = 'AI_LEARNING', subject?: string): Promise<any> => {
        const res = await fetch(`${API_URL}/quiz/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ studentId, topic, userAnswers, questions, classId, source, subject })
        });
        if (!res.ok) throw new Error('Failed to submit quiz');
        return res.json();
    },

    analyzeQuizResults: async (topic: string, questions: any[], userAnswers: number[]): Promise<string[]> => {
        const res = await fetch(`${API_URL}/analyze-quiz`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topic, questions, userAnswers })
        });
        if (!res.ok) throw new Error('Failed to analyze quiz results');
        const data = await res.json();
        return data.weakConcepts || data;
    },

    findOpportunities: async (interest: string, region: string, gradeLevel: string, type: string): Promise<any[]> => {
        const res = await fetch(`${API_URL}/opportunities/find`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ interest, region, gradeLevel, type })
        });
        if (!res.ok) throw new Error('Failed to find opportunities');
        const data = await res.json();
        return data.opportunities || [];
    },

    checkSystemHealth: async (): Promise<boolean> => {
        try {
            // Simple health check ping to backend or just assume true if API_URL is reachable
            const res = await fetch(API_URL.replace('/api', '')); // Root ping if available, or just verify backend is up
            return res.ok;
        } catch (e) {
            return false;
        }
    },

    // --- Dynamic Site Content ---
    getSiteContent: async (): Promise<SiteContent> => {
        try {
            const res = await fetch(`${API_URL}/site-content`);
            if (res.ok) return res.json();
        } catch (e) {
            console.error("Failed to fetch site content from backend", e);
        }

        // Fallback to localStorage if backend fails
        const localContent = localStorage.getItem('GYAN_SITE_CONTENT');
        if (localContent) return JSON.parse(localContent);

        // Default Fallback
        return {
            teamMembers: [
                {
                    id: '1',
                    name: "Abhay Kumar",
                    role: "Founder & Lead Developer",
                    bio: "Visionary behind Gyan AI, passionate about EdTech and AI.",
                    imageUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Abhay",
                    socials: { linkedin: "#", twitter: "#", github: "#" }
                }
            ]
        };
    },

    updateSiteContent: async (content: SiteContent): Promise<void> => {
        try {
            const res = await fetch(`${API_URL}/site-content`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(content)
            });
            if (!res.ok) throw new Error("Failed to save site content to backend");

            // Still sync with localStorage for immediate local UI responsiveness if needed
            localStorage.setItem('GYAN_SITE_CONTENT', JSON.stringify(content));
        } catch (e) {
            console.error("API Update Error:", e);
            // Fallback to localStorage only
            localStorage.setItem('GYAN_SITE_CONTENT', JSON.stringify(content));
        }
    },

    // --- Contact Form Services ---
    submitContactForm: async (data: { name: string; email: string; message: string }) => {
        try {
            const res = await fetch(`${API_URL}/contact/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error("Failed to submit message");
            return await res.json();
        } catch (e) {
            console.error("Contact Submit Error:", e);
            throw e;
        }
    },

    getContactSubmissions: async (): Promise<any[]> => {
        try {
            const res = await fetch(`${API_URL}/contact/submissions`);
            if (res.ok) return res.json();
            return [];
        } catch (e) {
            console.error("Failed to fetch submissions", e);
            return [];
        }
    }
};
