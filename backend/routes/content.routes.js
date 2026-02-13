import express from 'express';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

export const createContentRoutes = (supabase) => {
    // 1. Site Content
    router.get('/site-content', async (req, res) => {
        try {
            const { data, error } = await supabase
                .from('site_content')
                .select('content')
                .eq('id', 'GLOBAL_CONFIG')
                .single();

            if (error && error.code !== 'PGRST116') throw error;

            if (data) {
                res.json(data.content);
            } else {
                // Return default
                res.json({
                    teamMembers: [{
                        id: '1',
                        name: "Abhay Kumar",
                        role: "Founder & Lead Developer",
                        bio: "Visionary behind Gyan AI...",
                        imageUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Abhay"
                    }]
                });
            }
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    router.post('/site-content', verifyToken, requireRole('DEVELOPER'), async (req, res) => {
        try {
            const { error } = await supabase
                .from('site_content')
                .upsert({ id: 'GLOBAL_CONFIG', content: req.body, updatedAt: new Date().toISOString() });
            if (error) throw error;
            res.json({ success: true });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // 2. Contact Submissions
    router.post('/contact/submit', async (req, res) => {
        const { name, email, message } = req.body;
        const id = `MSG-${Date.now()}`;
        try {
            const { error } = await supabase
                .from('contact_submissions')
                .insert([{ id, name, email, message, submittedAt: new Date().toISOString(), status: 'UNREAD' }]);
            if (error) throw error;
            res.json({ success: true });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    router.get('/contact/submissions', verifyToken, requireRole('DEVELOPER'), async (req, res) => {
        try {
            const { data, error } = await supabase.from('contact_submissions').select('*').order('submittedAt', { ascending: false });
            if (error) throw error;
            res.json(data);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    return router;
};

export default router;
