import express from 'express';
import bcrypt from 'bcryptjs';
import { verifyToken, requireRole } from '../middleware/auth.js';

// Helper to strip fields that don't exist in the database schema
const sanitizeData = (table, data) => {
    const schema = {
        schools: [
            'id', 'name', 'logoUrl', 'inviteCode', 'adminEmail', 'password',
            'mobileNumber', 'motto', 'address', 'city', 'state', 'pincode',
            'subscriptionStatus', 'trialEndsAt', 'studentCount', 'maxStudents',
            'plan', 'details', 'createdAt', 'updatedAt'
        ],
        students: [
            'id', 'username', 'mobileNumber', 'name', 'email', 'password',
            'schoolId', 'classId', 'classIds', 'sectionId', 'rollNumber',
            'grade', 'stream', 'attendance', 'avgScore', 'status',
            'parentEmail', 'parentName', 'parentMobile', 'weakerSubjects',
            'weaknessHistory', 'performanceData', 'profileImage', 'xp',
            'level', 'createdAt'
        ],
        classrooms: [
            'id', 'name', 'schoolId', 'teacherId', 'section', 'stream',
            'motto', 'inviteCode', 'studentIds', 'subject', 'subjects',
            'status', 'archivedAt', 'createdAt'
        ],
        announcements: [
            'id', 'schoolId', 'classId', 'className', 'authorId', 'authorName',
            'content', 'type', 'timestamp'
        ]
    };

    const allowedFields = schema[table];
    if (!allowedFields) return data;

    if (Array.isArray(data)) {
        return data.map(item => {
            const sanitized = {};
            allowedFields.forEach(field => {
                if (item[field] !== undefined) sanitized[field] = item[field];
            });
            return sanitized;
        });
    } else {
        const sanitized = {};
        allowedFields.forEach(field => {
            if (data[field] !== undefined) sanitized[field] = data[field];
        });
        return sanitized;
    }
};

export const createDataRoutes = (supabase) => {
    const router = express.Router();
    // --- Public Routes (No auth required) ---

    // School listing for join flow (must be accessible before login)
    router.get('/schools', async (req, res) => {
        try {
            const { data: schools, error } = await supabase.from('schools').select('*');
            if (error) throw error;

            const joinFlow = req.query.join === 'true';
            if (joinFlow) {
                return res.json(schools.map(({ id, name, inviteCode, type, region, tier }) =>
                    ({ id, name, inviteCode, type, region, tier })));
            }

            // Full school list requires auth - check manually
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return res.status(401).json({ error: 'Access denied. No token provided.' });
            }
            res.json(schools);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // School registration (must be accessible before login)
    router.post('/schools', async (req, res) => {
        try {
            const sanitizedData = sanitizeData('schools', req.body);
            if (sanitizedData.password) {
                sanitizedData.password = await bcrypt.hash(sanitizedData.password, 10);
            }
            const { error } = await supabase.from('schools').insert([sanitizedData]);
            if (error) throw error;
            res.json(sanitizedData);
        } catch (err) {
            console.error("School Registration Error:", err);
            res.status(500).json({ error: err.message });
        }
    });

    // --- Protected Routes (Auth required) ---
    router.use(verifyToken);

    // --- Teachers ---
    router.get('/teachers', async (req, res) => {
        try {
            const { data, error } = await supabase.from('teachers').select('*');
            if (error) throw error;
            res.json(data);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    router.post('/teachers', async (req, res) => {
        try {
            const teacherData = { ...req.body };
            if (teacherData.password) {
                teacherData.password = await bcrypt.hash(teacherData.password, 10);
            }
            const { error } = await supabase.from('teachers').insert([teacherData]);
            if (error) throw error;
            res.json(teacherData);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    router.put('/teachers/:id', async (req, res) => {
        try {
            const { error } = await supabase.from('teachers').update(req.body).eq('id', req.params.id);
            if (error) throw error;
            res.json({ success: true });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // --- Students ---
    router.get('/students', async (req, res) => {
        try {
            const { data, error } = await supabase.from('students').select('*');
            if (error) throw error;
            res.json(data);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    router.post('/students', async (req, res) => {
        try {
            const studentData = { ...req.body };
            if (studentData.password) {
                studentData.password = await bcrypt.hash(studentData.password, 10);
            }
            const { data, error } = await supabase.from('students').insert([studentData]).select();
            if (error) throw error;
            res.json(data[0]);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    router.put('/students/:id', async (req, res) => {
        try {
            const { id: _id, level, ...updates } = req.body;
            const { error } = await supabase.from('students').update(updates).eq('id', req.params.id);
            if (error) throw error;
            res.json({ success: true });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // Nested Routes for Frontend Compatibility
    router.get('/students/:id/suggestions', async (req, res) => {
        try {
            const { data, error } = await supabase.from('suggestions').select('*').eq('toStudentId', req.params.id);
            if (error) return res.json([]);
            res.json(data || []);
        } catch (err) {
            res.json([]);
        }
    });
    router.get('/students/:id/submissions', async (req, res) => {
        try {
            const { data, error } = await supabase.from('assignment_submissions').select('*').eq('studentId', req.params.id);
            if (error) return res.json([]);
            res.json(data || []);
        } catch (err) {
            res.json([]);
        }
    });

    // --- Classrooms ---
    router.get('/classrooms', async (req, res) => {
        try {
            const { data, error } = await supabase.from('classrooms').select('*');
            if (error) throw error;
            res.json(data);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    router.post('/classrooms', async (req, res) => {
        try {
            const classroomData = { ...req.body };
            if (classroomData.teacherId === 'ADMIN' || !classroomData.teacherId?.startsWith('TCH-')) {
                classroomData.teacherId = null;
            }
            const { error } = await supabase.from('classrooms').insert([classroomData]);
            if (error) throw error;
            res.json(classroomData);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    router.delete('/classrooms/:id', async (req, res) => {
        try {
            const { error } = await supabase.from('classrooms').delete().eq('id', req.params.id);
            if (error) throw error;
            res.json({ success: true });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    router.put('/classrooms/:id', async (req, res) => {
        try {
            const { id: _id, ...updates } = req.body;
            const { error } = await supabase.from('classrooms').update(updates).eq('id', req.params.id);
            if (error) throw error;
            res.json({ success: true });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // --- Migration ---
    router.post('/migrate', async (req, res) => {
        try {
            const { schools, students, classrooms, announcements } = req.body;
            if (schools?.length) {
                const cleanSchools = sanitizeData('schools', schools);
                for (const s of cleanSchools) {
                    if (s.password && s.password.length < 30) {
                        s.password = await bcrypt.hash(s.password, 10);
                    }
                }
                await supabase.from('schools').insert(cleanSchools);
            }
            if (students?.length) {
                const cleanStudents = sanitizeData('students', students);
                for (const s of cleanStudents) {
                    if (s.password && s.password.length < 30) {
                        s.password = await bcrypt.hash(s.password, 10);
                    }
                }
                await supabase.from('students').insert(cleanStudents);
            }
            if (classrooms?.length) {
                const cleanClassrooms = sanitizeData('classrooms', classrooms);
                await supabase.from('classrooms').insert(cleanClassrooms);
            }
            if (announcements?.length) {
                const cleanAnnouncements = sanitizeData('announcements', announcements);
                await supabase.from('announcements').insert(cleanAnnouncements);
            }
            res.json({ success: true });
        } catch (err) {
            console.error("Migration Error:", err);
            res.status(500).json({ error: err.message });
        }
    });

    // --- Suggestions ---
    router.get('/suggestions', async (req, res) => {
        try {
            const { studentId } = req.query;
            const query = supabase.from('suggestions').select('*');
            if (studentId) query.eq('toStudentId', studentId);
            const { data, error } = await query;
            if (error) return res.json([]);
            res.json(data || []);
        } catch (err) {
            res.json([]);
        }
    });

    router.post('/suggestions', async (req, res) => {
        try {
            const { error } = await supabase.from('suggestions').insert([req.body]);
            if (error) throw error;
            res.json({ success: true });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // --- Submissions ---
    router.get('/submissions', async (req, res) => {
        try {
            const { assignmentId, studentId } = req.query;
            let query = supabase.from('assignment_submissions').select('*');
            if (assignmentId) query = query.eq('assignmentId', assignmentId);
            if (studentId) query = query.eq('studentId', studentId);
            const { data, error } = await query;
            if (error) return res.json([]);
            res.json(data || []);
        } catch (err) {
            res.json([]);
        }
    });

    router.post('/submissions', async (req, res) => {
        try {
            const { error, data } = await supabase.from('assignment_submissions').insert([req.body]).select();
            if (error) throw error;
            res.json(data?.[0] || { success: true });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    router.put('/submissions/:id', async (req, res) => {
        try {
            const { error } = await supabase.from('assignment_submissions').update(req.body).eq('id', req.params.id);
            if (error) throw error;
            res.json({ success: true });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    return router;
};

export default createDataRoutes;
