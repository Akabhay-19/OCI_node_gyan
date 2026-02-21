import { SchoolProfile, Student, Classroom, Announcement, Teacher, SiteContent } from '../types';
import { jwtDecode } from 'jwt-decode';

// In production, use relative path (served by same backend). In development, use localhost:5000.
const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:5000/api');

export const AI_MODELS = [
    { id: 'google/gemini-2.0-flash-exp:free', name: 'Gemini 2.5 (Flash)', provider: 'Google' }
];

export const DEFAULT_MODEL = 'google/gemini-2.0-flash-exp:free';

export const api = {
    // --- Token Helpers ---
    isTokenExpired: (token: string): boolean => {
        try {
            const decoded: any = jwtDecode(token);
            if (!decoded.exp) return false;
            // exp is in seconds, Date.now() in milliseconds
            return decoded.exp * 1000 < Date.now();
        } catch (e) {
            return true;
        }
    },

    getToken: (): string | null => {
        const token = sessionStorage.getItem('GYAN_TOKEN') || localStorage.getItem('devToken');
        if (token && api.isTokenExpired(token)) {
            console.warn('[API] Token expired in storage');
            api.clearToken();
            return null;
        }
        return token;
    },

    setToken: (token: string, isDev: boolean = false) => {
        if (isDev) {
            localStorage.setItem('devToken', token);
        } else {
            sessionStorage.setItem('GYAN_TOKEN', token);
        }
    },

    clearToken: () => {
        sessionStorage.removeItem('GYAN_TOKEN');
        localStorage.removeItem('devToken');
        sessionStorage.removeItem('GYAN_USER_ID');
        sessionStorage.removeItem('GYAN_USER_ROLE');
        sessionStorage.removeItem('GYAN_SCHOOL_ID');
        sessionStorage.removeItem('GYAN_AUTH_PROVIDER');
    },

    getDevToken: (): string | null => {
        return localStorage.getItem('devToken');
    },

    clearDevToken: (): void => {
        localStorage.removeItem('devToken');
    },

    // --- Auth Helpers ---
    getAuthHeaders: () => {
        const token = api.getToken();
        return {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        };
    },

    authFetch: async (url: string, options: RequestInit = {}): Promise<Response> => {
        const token = api.getToken();

        // Safety: Prevent requests with invalid/missing tokens
        if (!token || api.isTokenExpired(token)) {
            console.warn('[API] Authenticated request without valid token:', url);
            // Don't redirect here, let the caller handle it or 401 middleware handle it
            // Only redirect if we are sure we are not in a loop
            if (window.location.pathname !== '/auth' && window.location.pathname !== '/') {
                api.clearToken();
                window.location.href = '/auth';
            }
            throw new Error('Authentication required');
        }

        const headers = {
            ...api.getAuthHeaders(),
            ...options.headers,
        };

        const res = await fetch(url, { ...options, headers });

        // Global 401 Handling
        if (res.status === 401) {
            console.warn('[API] Received 401, session invalid.');
            api.clearToken();
            window.location.href = '/auth';
            throw new Error('Session expired');
        }

        return res;
    },

    // --- Schools ---
    getSchools: async (join: boolean = false): Promise<SchoolProfile[]> => {
        const url = join ? `${API_URL}/schools?join=true` : `${API_URL}/schools`;

        // Always use standard fetch for schools to avoid redirect loops.
        // authFetch is too aggressive with window.location.href changes.
        const token = api.getToken();
        const res = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            }
        });

        if (!res.ok) {
            if (res.status === 401 && !join) return [];
            throw new Error('Failed to fetch schools');
        }
        return res.json();
    },
    createSchool: async (school: SchoolProfile): Promise<SchoolProfile> => {
        const res = await fetch(`${API_URL}/schools`, {
            method: 'POST',
            headers: api.getAuthHeaders(),
            body: JSON.stringify(school),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || 'Failed to create school');
        }
        return res.json();
    },

    // --- Teachers ---
    getTeachers: async (): Promise<Teacher[]> => {
        const res = await api.authFetch(`${API_URL}/teachers`);
        if (!res.ok) throw new Error('Failed to fetch teachers');
        return res.json();
    },
    createTeacher: async (teacher: any): Promise<any> => {
        const res = await fetch(`${API_URL}/teachers`, {
            method: 'POST',
            headers: api.getAuthHeaders(),
            body: JSON.stringify(teacher),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || 'Failed to create teacher');
        }
        return res.json();
    },
    updateTeacher: async (id: string, updates: Partial<Teacher>): Promise<void> => {
        const res = await api.authFetch(`${API_URL}/teachers/${id}`, {
            method: 'PUT',
            body: JSON.stringify(updates),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || 'Failed to update teacher');
        }
    },

    // --- Students ---
    getStudents: async (classId?: string): Promise<Student[]> => {
        const url = classId ? `${API_URL}/students?classId=${classId}` : `${API_URL}/students`;
        const res = await api.authFetch(url);
        if (!res.ok) throw new Error('Failed to fetch students');
        return res.json();
    },
    createStudent: async (student: any): Promise<Student> => {
        const res = await fetch(`${API_URL}/students`, {
            method: 'POST',
            headers: api.getAuthHeaders(),
            body: JSON.stringify(student),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || 'Failed to create student');
        }
        return res.json();
    },
    updateStudent: async (student: Student): Promise<void> => {
        const res = await api.authFetch(`${API_URL}/students/${student.id}`, {
            method: 'PUT',
            body: JSON.stringify(student),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || 'Failed to update student');
        }
    },

    // --- Classrooms ---
    getClassrooms: async (): Promise<Classroom[]> => {
        const res = await api.authFetch(`${API_URL}/classrooms`);
        if (!res.ok) throw new Error('Failed to fetch classrooms');
        return res.json();
    },
    createClassroom: async (classroom: Classroom): Promise<Classroom> => {
        const res = await api.authFetch(`${API_URL}/classrooms`, {
            method: 'POST',
            body: JSON.stringify(classroom),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || 'Failed to create classroom');
        }
        return res.json();
    },
    updateClassroom: async (id: string, updates: Partial<Classroom>): Promise<void> => {
        const res = await api.authFetch(`${API_URL}/classrooms/${id}`, {
            method: 'PUT',
            body: JSON.stringify(updates),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || 'Failed to update classroom');
        }
    },
    deleteClassroom: async (id: string): Promise<void> => {
        const res = await api.authFetch(`${API_URL}/classrooms/${id}`, {
            method: 'DELETE',
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || 'Failed to delete classroom');
        }
    },

    // --- Announcements ---
    getAnnouncements: async (): Promise<Announcement[]> => {
        const res = await api.authFetch(`${API_URL}/announcements`);
        if (!res.ok) throw new Error('Failed to fetch announcements');
        return res.json();
    },
    createAnnouncement: async (announcement: Announcement): Promise<Announcement> => {
        const res = await api.authFetch(`${API_URL}/announcements`, {
            method: 'POST',
            body: JSON.stringify(announcement),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || 'Failed to create announcement');
        }
        return res.json();
    },

    // --- Auth Actions (Public) ---
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

        if (data.id) {
            sessionStorage.setItem('GYAN_USER_ID', data.id);
            sessionStorage.setItem('GYAN_USER_ROLE', credentials.role || 'STUDENT');
            if (data.schoolId) sessionStorage.setItem('GYAN_SCHOOL_ID', data.schoolId);
            if (data.token) api.setToken(data.token);
        }
        return data;
    },

    googleLogin: async (idToken: string, role: string): Promise<any> => {
        const res = await fetch(`${API_URL}/google-login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken, role }),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || 'Google login failed');
        }
        const data = await res.json();

        if (data.id) {
            sessionStorage.setItem('GYAN_USER_ID', data.id);
            sessionStorage.setItem('GYAN_USER_ROLE', role || 'STUDENT');
            if (data.schoolId) sessionStorage.setItem('GYAN_SCHOOL_ID', data.schoolId);
            if (data.token) api.setToken(data.token);
            sessionStorage.setItem('GYAN_AUTH_PROVIDER', 'google');
        }
        return data;
    },

    logout: () => {
        api.clearToken();
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

    // --- History & Data ---
    getTeacherHistory: async (teacherId: string): Promise<any[]> => {
        const res = await api.authFetch(`${API_URL}/teachers/${teacherId}/history`);
        if (!res.ok) return [];
        return res.json();
    },

    getModuleHistory: async (studentId: string): Promise<any[]> => {
        const res = await api.authFetch(`${API_URL}/students/${studentId}/modules`);
        if (!res.ok) return [];
        return res.json();
    },

    saveModuleHistory: async (studentId: string, type: string, topic: string, content: any, subject?: string, classId?: string): Promise<void> => {
        try {
            await api.authFetch(`${API_URL}/save-module-history`, {
                method: 'POST',
                body: JSON.stringify({ studentId, type, topic, content, subject, classId })
            });
        } catch (e) {
            console.error("Error saving history:", e);
        }
    },

    migrateData: async (data: any): Promise<void> => {
        const res = await api.authFetch(`${API_URL}/migrate`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error('Data migration failed');
    },

    // --- AI Generation ---
    generateQuiz: async (topic: string, gradeLevel: string, count: number = 20, studentId?: string, difficulty?: string, classId?: string): Promise<any> => {
        const res = await api.authFetch(`${API_URL}/quiz`, {
            method: 'POST',
            body: JSON.stringify({ topic, gradeLevel, count, studentId, difficulty, classId })
        });
        return res.json();
    },

    generateStudyPlan: async (topic: string, gradeLevel: string, studentId?: string, classId?: string): Promise<any> => {
        const res = await api.authFetch(`${API_URL}/study-plan`, {
            method: 'POST',
            body: JSON.stringify({ topic, gradeLevel, studentId, classId })
        });
        return res.json();
    },

    generateStory: async (topic: string, subject: string, gradeLevel: string, language: string, studentId?: string, classId?: string): Promise<any> => {
        const res = await api.authFetch(`${API_URL}/story`, {
            method: 'POST',
            body: JSON.stringify({ topic, subject, gradeLevel, language, studentId, classId })
        });
        return res.json();
    },

    generateAssignment: async (topic: string, questionCount: number, type: string, subject: string, gradeLevel: string, difficulty: string, studentId?: string, classId?: string): Promise<any> => {
        const res = await api.authFetch(`${API_URL}/assignment`, {
            method: 'POST',
            body: JSON.stringify({ topic, questionCount, type, subject, gradeLevel, difficulty, studentId, classId })
        });
        return res.json();
    },

    generateFlashcards: async (topic: string, gradeLevel: string, count: number = 20, studentId?: string, classId?: string): Promise<any> => {
        const res = await api.authFetch(`${API_URL}/flashcards`, {
            method: 'POST',
            body: JSON.stringify({ topic, gradeLevel, count, studentId, classId })
        });
        return res.json();
    },

    generateRemedialContent: async (topic: string, subTopic: string, gradeLevel: string, subject?: string): Promise<any> => {
        const res = await api.authFetch(`${API_URL}/remedial/generate`, {
            method: 'POST',
            body: JSON.stringify({ topic, subTopic, gradeLevel, subject })
        });
        return res.json();
    },

    resolveGap: async (studentId: string, gapId: string, score: number, totalQuestions: number, topic: string, subTopic: string): Promise<any> => {
        const res = await api.authFetch(`${API_URL}/remedial/resolve`, {
            method: 'POST',
            body: JSON.stringify({ studentId, gapId, score, totalQuestions, topic, subTopic })
        });
        return res.json();
    },

    chat: async (message: string, history: any[]): Promise<any> => {
        const res = await api.authFetch(`${API_URL}/chat`, {
            method: 'POST',
            body: JSON.stringify({ message, history })
        });
        return res.json();
    },

    // --- English Tools ---
    analyzeEnglish: async (text: string): Promise<any> => {
        const res = await api.authFetch(`${API_URL}/english/analyze`, {
            method: 'POST',
            body: JSON.stringify({ text })
        });
        return res.json();
    },

    generateEnglishPractice: async (topic: string, level: string, focusContext?: string, previousQuestions?: string[]): Promise<any> => {
        const res = await api.authFetch(`${API_URL}/english/generate-practice`, {
            method: 'POST',
            body: JSON.stringify({ topic, level, focusContext, previousQuestions })
        });
        return res.json();
    },

    validateTranslation: async (question: string, answer: string, context?: string): Promise<any> => {
        const res = await api.authFetch(`${API_URL}/english/validate`, {
            method: 'POST',
            body: JSON.stringify({ question, answer, context })
        });
        return res.json();
    },

    askTutor: async (message: string, context?: string): Promise<{ response: string; success: boolean }> => {
        const res = await api.authFetch(`${API_URL}/english/tutor`, {
            method: 'POST',
            body: JSON.stringify({ message, context })
        });
        return res.json();
    },

    generateWritingGuide: async (type: string, topic: string): Promise<any> => {
        const res = await api.authFetch(`${API_URL}/english/writing/guide`, {
            method: 'POST',
            body: JSON.stringify({ type, topic })
        });
        return res.json();
    },

    evaluateWriting: async (type: string, topic: string, content: string): Promise<any> => {
        const res = await api.authFetch(`${API_URL}/english/writing/evaluate`, {
            method: 'POST',
            body: JSON.stringify({ type, topic, content })
        });
        return res.json();
    },

    // --- Mindmap & Planning ---
    generateMindMap: async (input: File | string, type: 'file' | 'text', topic?: string, context?: { grade?: string; subject?: string }): Promise<any> => {
        if (type === 'file' && input instanceof File) {
            const formData = new FormData();
            formData.append('file', input);
            if (context?.grade) formData.append('gradeLevel', context.grade);
            if (context?.subject) formData.append('subject', context.subject);

            const res = await fetch(`${API_URL}/mindmap`, {
                method: 'POST',
                body: formData
            });
            if (!res.ok) throw new Error('Failed to generate mindmap');
            return res.json();
        } else {
            const res = await api.authFetch(`${API_URL}/generate-mindmap-from-text`, {
                method: 'POST',
                body: JSON.stringify({ text: input, topic, gradeLevel: context?.grade, subject: context?.subject })
            });
            return res.json();
        }
    },

    analyzePrerequisites: async (topic: string, gradeLevel: string): Promise<any> => {
        const res = await api.authFetch(`${API_URL}/prerequisites`, {
            method: 'POST',
            body: JSON.stringify({ topic, gradeLevel })
        });
        return res.json();
    },

    // --- Performance & Recommendations ---
    submitQuizResult: async (payload: any): Promise<any> => {
        const res = await api.authFetch(`${API_URL}/quiz/submit`, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        return res.json();
    },

    getRecommendations: async (studentId: string): Promise<any[]> => {
        const res = await api.authFetch(`${API_URL}/quiz/recommendations?studentId=${studentId}`);
        return res.json();
    },

    analyzeQuizResults: async (topic: string, questions: any[], userAnswers: number[]): Promise<string[]> => {
        const res = await api.authFetch(`${API_URL}/analyze-quiz`, {
            method: 'POST',
            body: JSON.stringify({ topic, questions, userAnswers })
        });
        const data = await res.json();
        return data.weakConcepts || data;
    },

    // --- Opportunities ---
    findOpportunities: async (interest: string, region: string, gradeLevel: string, type: string): Promise<any[]> => {
        const res = await api.authFetch(`${API_URL}/opportunities/find`, {
            method: 'POST',
            body: JSON.stringify({ interest, region, gradeLevel, type })
        });
        const data = await res.json();
        return data.opportunities || [];
    },

    // --- Site Content ---
    getSiteContent: async (): Promise<SiteContent> => {
        try {
            const res = await fetch(`${API_URL}/site-content`);
            if (res.ok) return res.json();
        } catch (e) {
            console.error("Fallback to local site content", e);
        }
        const local = localStorage.getItem('GYAN_SITE_CONTENT');
        return local ? JSON.parse(local) : { teamMembers: [] };
    },

    updateSiteContent: async (content: SiteContent): Promise<void> => {
        try {
            await api.authFetch(`${API_URL}/site-content`, {
                method: 'POST',
                body: JSON.stringify(content)
            });
            localStorage.setItem('GYAN_SITE_CONTENT', JSON.stringify(content));
        } catch (e) {
            console.error("Local sync of site content");
            localStorage.setItem('GYAN_SITE_CONTENT', JSON.stringify(content));
        }
    },

    // --- Contact Form ---
    submitContactForm: async (data: any) => {
        const res = await fetch(`${API_URL}/contact/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return res.json();
    },

    getContactSubmissions: async (): Promise<any[]> => {
        const res = await api.authFetch(`${API_URL}/contact/submissions`);
        return res.json();
    },

    // --- Dev Console ---
    devLogin: async (credentials: any): Promise<boolean> => {
        const res = await fetch(`${API_URL}/auth/dev-login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credentials)
        });
        if (!res.ok) throw new Error("Invalid Developer Credentials");
        const data = await res.json();
        if (data.token) api.setToken(data.token, true);
        return data.success;
    },

    getDevStats: async (): Promise<any> => {
        const token = localStorage.getItem('devToken');
        const res = await fetch(`${API_URL}/dev/stats`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return res.json();
    },

    getDevSchools: async (): Promise<any[]> => {
        const token = localStorage.getItem('devToken');
        const res = await fetch(`${API_URL}/dev/schools`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return res.json();
    },

    // --- AI Config ---
    setAIConfig: async (config: any): Promise<any> => {
        const res = await api.authFetch(`${API_URL}/ai/config`, {
            method: 'POST',
            body: JSON.stringify(config)
        });
        return res.json();
    },

    // --- Attendance ---
    getAttendance: async (classId: string, date?: string): Promise<any> => {
        const res = await api.authFetch(`${API_URL}/attendance/${classId}/${encodeURIComponent(date || '')}`);
        return res.json();
    },

    saveAttendance: async (classId: string, schoolId: string | undefined, date: string, records: any, markedById?: string): Promise<any> => {
        const res = await api.authFetch(`${API_URL}/attendance`, {
            method: 'POST',
            body: JSON.stringify({ classId, schoolId, date, records, markedById })
        });
        return res.json();
    },

    getStudentAttendance: async (studentId: string, classId?: string, days: number = 365): Promise<any> => {
        const res = await api.authFetch(`${API_URL}/attendance/student/${studentId}?days=${days}${classId ? `&classId=${classId}` : ''}`);
        return res.json();
    },

    getClassAttendanceHistory: async (classId: string, days: number = 30): Promise<any[]> => {
        const res = await api.authFetch(`${API_URL}/attendance/history/${classId}?days=${days}`);
        return res.json();
    },

    // --- Teacher AI Tools ---
    generateLessonPlan: async (payload: any): Promise<any> => {
        const res = await api.authFetch(`${API_URL}/teacher/lesson-plan`, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        return res.json();
    },

    generatePresentation: async (payload: any): Promise<any> => {
        const res = await api.authFetch(`${API_URL}/teacher/presentation`, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        return res.json();
    },

    checkSystemHealth: async (): Promise<boolean> => {
        try {
            const res = await fetch(API_URL.replace('/api', ''));
            return res.ok;
        } catch {
            return false;
        }
    }
};
