
import express from 'express';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

export const createDevRoutes = (supabase) => {

    // Protected: Allow DEVELOPER or ADMIN
    router.use(verifyToken);
    router.use((req, res, next) => {
        if (req.user.role === 'DEVELOPER' || req.user.role === 'ADMIN') {
            next();
        } else {
            res.status(403).json({ error: 'Access denied. Developer or Admin role required.' });
        }
    });

    // 1. Get Global Stats
    router.get('/stats', async (req, res) => {
        try {
            const [schools, teachers, students] = await Promise.all([
                supabase.from('schools').select('id', { count: 'exact', head: true }),
                supabase.from('teachers').select('id', { count: 'exact', head: true }),
                supabase.from('students').select('id', { count: 'exact', head: true })
            ]);

            res.json({
                schools: schools.count || 0,
                teachers: teachers.count || 0,
                students: students.count || 0,
                parents: 0 // Parents are students with asParent flag or separate table? Defaulting to 0 for now.
            });
        } catch (err) {
            console.error('Dev Stats Error:', err);
            res.status(500).json({ error: err.message });
        }
    });

    // 2. Get Enriched Schools List
    router.get('/schools', async (req, res) => {
        try {
            const { data: schools, error } = await supabase.from('schools').select('*');
            if (error) throw error;

            // Enrich with counts
            const enriched = await Promise.all(schools.map(async (school) => {
                const { count: teacherCount } = await supabase
                    .from('teachers')
                    .select('id', { count: 'exact', head: true })
                    .eq('schoolId', school.id);

                const { count: studentCount } = await supabase
                    .from('students')
                    .select('id', { count: 'exact', head: true })
                    .eq('schoolId', school.id);

                return {
                    ...school,
                    teacherCount: teacherCount || 0,
                    studentCount: studentCount || 0
                };
            }));

            res.json(enriched);
        } catch (err) {
            console.error('Dev Schools Error:', err);
            res.status(500).json({ error: err.message });
        }
    });

    // 3. Get School Details
    router.get('/school/:id/details', async (req, res) => {
        try {
            const schoolId = req.params.id;

            const [teachers, students, classrooms] = await Promise.all([
                supabase.from('teachers').select('*').eq('schoolId', schoolId),
                supabase.from('students').select('*').eq('schoolId', schoolId),
                supabase.from('classrooms').select('*').eq('schoolId', schoolId)
            ]);

            res.json({
                teachers: teachers.data || [],
                students: students.data || [],
                parents: [], // Placeholder
                classrooms: classrooms.data || []
            });
        } catch (err) {
            console.error('Dev School Details Error:', err);
            res.status(500).json({ error: err.message });
        }
    });

    return router;
};
