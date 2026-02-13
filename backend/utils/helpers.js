// Utility helpers for route handlers

export const sanitizeString = (str) => {
    if (typeof str !== 'string') return str;
    return str.trim().replace(/[<>]/g, '');
};

export const parseIntSafe = (val, fallback = 0) => {
    const parsed = parseInt(val, 10);
    return isNaN(parsed) ? fallback : parsed;
};

export const isValidUUID = (str) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
};

// --- AI Helpers ---

export const cleanText = (text) => {
    if (!text) return '';
    // Remove markdown code blocks if present
    let cleaned = text.replace(/```json/g, '').replace(/```/g, '');
    return cleaned.trim();
};

export const getCurrentModel = async (supabase) => {
    // In future this can fetch from DB settings
    return undefined; // Let AI service use default
};

export const getCurrentProvider = async (supabase) => {
    return undefined; // Let AI service use default
};

export const saveModuleHistory = async (supabase, userId, type, topic, data, classId) => {
    try {
        await supabase.from('module_history').insert([{
            userId,
            type,
            topic,
            data,
            classId,
            timestamp: new Date().toISOString()
        }]);
    } catch (e) {
        console.error("Failed to save module history:", e);
    }
};

// Re-export generate from ai-service if needed, but usually it's passed directly.
// The server.js passes 'helpers' which imports * as helpers.
// So we need 'generate' in here? No, server.js likely passes aiService.generate as 'generate'
// BUT server.js line 7: const { generate ... } = helpers;
// This means server.js EXPECTS generate to be in helpers?
// Let's check server.js again.
// Line 125: createStudyPlanRoutes(aiService, supabase, helpers)
// study-plan.routes.js Line 7: const { generate, ... } = helpers
// WAIT. If server.js passes (aiService, supabase, helpers),
// then study-plan.routes.js line 7 destructures from `helpers`?
// NO. createStudyPlanRoutes = (aiService, supabase, helpers) => { ... }
// It destructures `helpers` on line 7!
// So `helpers` MUST contain `generate`.
// BUT `server.js` imports `aiService`.
// So `server.js` should probably pass `generate` explicitly or I should add it to `helpers`.
// Actually, I should update `study-plan.routes.js` to use `aiService.generate` instead of looking for it in `helpers`.
// That is a better fix.
// But for now, I will add the explicit helpers that ARE missing (cleanText, getCurrentModel, etc).

