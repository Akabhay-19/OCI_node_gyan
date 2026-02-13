import express from 'express';
import { verifyToken } from '../middleware/auth.js';
const router = express.Router();

export const createHistoryRoutes = (supabase) => {
    router.use(verifyToken);
    // 1. Get Student Module History
    router.get('/students/:studentId/modules', async (req, res) => {
        const { studentId } = req.params;
        try {
            const { data, error } = await supabase
                .from('generated_modules')
                .select('*')
                .eq('studentId', studentId)
                .order('createdAt', { ascending: false });
            if (error) throw error;
            res.json(data);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // 2. Get Student Assignment History (Flattened)
    router.get('/students/:studentId/history', async (req, res) => {
        const { studentId } = req.params;
        try {
            const { data, error } = await supabase
                .from('submissions')
                .select(`
                    id, score, maxMarks, submittedAt, timeTaken,
                    assignments ( title, subject, type )
                `)
                .eq('studentId', studentId)
                .order('submittedAt', { ascending: false });

            if (error) throw error;
            const flattened = data.map(sub => ({
                submissionId: sub.id,
                score: sub.score,
                maxMarks: sub.maxMarks,
                submittedAt: sub.submittedAt,
                timeTaken: sub.timeTaken,
                title: sub.assignments?.title,
                subject: sub.assignments?.subject,
                type: sub.assignments?.type
            }));
            res.json(flattened);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // 3. Get Teacher History
    router.get('/teachers/:teacherId/history', async (req, res) => {
        const { teacherId } = req.params;
        try {
            const { data, error } = await supabase
                .from('teacher_history')
                .select('*')
                .eq('teacherId', teacherId)
                .order('createdAt', { ascending: false });
            if (error) throw error;
            res.json(data);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // 4. Save Module History (Legacy path /api/save-module-history)
    router.post('/save-module-history', async (req, res) => {
        const { studentId, type, topic, content, subject, classId } = req.body;
        try {
            const { error } = await supabase.from('generated_modules').insert([{
                studentId, type, topic, content, subject, classId
            }]);
            if (error) throw error;
            res.json({ success: true });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    return router;
};

export default router;
