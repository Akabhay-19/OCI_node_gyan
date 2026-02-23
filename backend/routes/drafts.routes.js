// ============================================================
// GYAN AI — Draft Users Route
// POST   /api/drafts/save      → Save/update draft
// GET    /api/drafts/:draftId  → Get draft by ID
// DELETE /api/drafts/:draftId  → Delete draft
//
// Uses Supabase table: draft_users
// Drafts auto-expire after 24 hours (handled by Supabase RLS or cleanup)
// ============================================================

import express from 'express';

const router = express.Router();

// Table: draft_users
// Columns: draft_id (PK), role, form_data (JSON), last_updated_at, is_completed

// --- Ensure table exists (runs once on startup safely) ---
const ensureTable = async (supabase) => {
    // We'll do a simple select to check if the table exists.
    // If Supabase throws, the table doesn't exist — we handle gracefully.
    // (Actual table creation should be done via Supabase migration)
    try {
        await supabase.from('draft_users').select('draft_id').limit(1);
    } catch (e) {
        console.warn('[Drafts] draft_users table may not exist yet. Please run migrations.');
    }
};

export const createDraftRoutes = (supabase) => {
    // Table init check
    ensureTable(supabase);

    // --- POST /api/drafts/save ---
    router.post('/save', async (req, res) => {
        try {
            const { draftId, role, formData, lastUpdatedAt, isCompleted } = req.body;

            if (!draftId || !role) {
                return res.status(400).json({ error: 'draftId and role are required' });
            }

            // Sanitize: never store password
            const safeFormData = { ...(formData || {}) };
            delete safeFormData.password;
            delete safeFormData.confirmPassword;

            // Check expiry: reject if older than 24h
            const age = Date.now() - (lastUpdatedAt || 0);
            if (age > 24 * 60 * 60 * 1000) {
                return res.status(400).json({ error: 'Draft expired' });
            }

            const { error } = await supabase
                .from('draft_users')
                .upsert({
                    draft_id: draftId,
                    role,
                    form_data: safeFormData,
                    last_updated_at: new Date(lastUpdatedAt || Date.now()).toISOString(),
                    is_completed: isCompleted || false,
                }, { onConflict: 'draft_id' });

            if (error) {
                // Non-critical: log internally, return success to not block frontend
                console.error('[Drafts] Upsert error (non-critical):', error.message);
                return res.json({ success: true, note: 'Local save active' });
            }

            return res.json({ success: true, draftId });
        } catch (err) {
            console.error('[Drafts] Save error:', err.message);
            // Non-critical: don't fail hard
            return res.json({ success: true, note: 'Local save active' });
        }
    });

    // --- GET /api/drafts/:draftId ---
    router.get('/:draftId', async (req, res) => {
        try {
            const { draftId } = req.params;

            if (!draftId) {
                return res.status(400).json({ error: 'draftId required' });
            }

            const { data, error } = await supabase
                .from('draft_users')
                .select('*')
                .eq('draft_id', draftId)
                .eq('is_completed', false)
                .single();

            if (error || !data) {
                return res.status(404).json({ error: 'Draft not found' });
            }

            // Check expiry
            const age = Date.now() - new Date(data.last_updated_at).getTime();
            if (age > 24 * 60 * 60 * 1000) {
                // Auto-delete expired draft
                await supabase.from('draft_users').delete().eq('draft_id', draftId);
                return res.status(404).json({ error: 'Draft expired' });
            }

            return res.json({
                draftId: data.draft_id,
                role: data.role,
                formData: data.form_data,
                lastUpdatedAt: new Date(data.last_updated_at).getTime(),
                isCompleted: data.is_completed,
                currentView: data.form_data?.currentView || 'SIGNUP_DETAILS',
            });
        } catch (err) {
            console.error('[Drafts] Get error:', err.message);
            return res.status(500).json({ error: 'Failed to retrieve draft' });
        }
    });

    // --- DELETE /api/drafts/:draftId ---
    router.delete('/:draftId', async (req, res) => {
        try {
            const { draftId } = req.params;

            if (!draftId) {
                return res.status(400).json({ error: 'draftId required' });
            }

            await supabase.from('draft_users').delete().eq('draft_id', draftId);

            return res.json({ success: true });
        } catch (err) {
            console.error('[Drafts] Delete error:', err.message);
            return res.json({ success: true }); // Non-critical, always return success
        }
    });

    return router;
};
