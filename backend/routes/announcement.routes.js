import express from 'express';
import { verifyToken } from '../middleware/auth.js';
const router = express.Router();

export const createAnnouncementRoutes = (supabase) => {
    router.use(verifyToken);
    // 1. Get Announcements
    router.get('/', async (req, res) => {
        try {
            const { data, error } = await supabase
                .from('announcements')
                .select('*')
                .order('timestamp', { ascending: false }); // Ordered by timestamp for frontend
            if (error) throw error;
            res.json(data);
        } catch (err) {
            console.error("Fetch Announcements Error:", err);
            res.status(500).json({ error: err.message });
        }
    });

    // 2. Create Announcement
    router.post('/', async (req, res) => {
        try {
            // Frontend passes: { id, content, type, timestamp, authorName, className, authorId, classId, schoolId }
            const { error } = await supabase
                .from('announcements')
                .insert([req.body]);
            if (error) throw error;
            res.json(req.body);
        } catch (err) {
            console.error("Create Announcement Error:", err);
            res.status(500).json({ error: err.message });
        }
    });

    return router;
};

export default router;
