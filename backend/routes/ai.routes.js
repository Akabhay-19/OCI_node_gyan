import express from 'express';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Factory function to create AI routes with dependencies
export const createAIRoutes = (aiService, supabase) => {
    const { generate, chat, getStatus } = aiService;

    // Default values (used if DB fetch fails)
    const defaults = {
        provider: process.env.AI_PROVIDER || 'openrouter',
        model: process.env.OPENROUTER_DEFAULT_MODEL || 'google/gemini-2.0-flash-exp:free',
        audioModel: 'gemini-2.0-flash-exp'
    };

    // In-memory cache for config (60-second TTL)
    let configCache = null;
    let cacheExpiry = 0;
    const CACHE_TTL_MS = 60 * 1000; // 60 seconds

    // Helper: Get config from cache or database
    const getConfig = async () => {
        // Return cached value if still valid
        if (configCache && Date.now() < cacheExpiry) {
            return configCache;
        }

        try {
            const { data, error } = await supabase
                .from('app_config')
                .select('key, value')
                .in('key', ['ai_provider', 'ai_model', 'ai_audio_model']);

            if (error || !data || data.length === 0) {
                console.log('[AI Config] Using defaults (no DB config found)');
                return defaults;
            }

            const config = {};
            data.forEach(row => {
                if (row.key === 'ai_provider') config.provider = row.value;
                if (row.key === 'ai_model') config.model = row.value;
                if (row.key === 'ai_audio_model') config.audioModel = row.value;
            });

            const result = {
                provider: config.provider || defaults.provider,
                model: config.model || defaults.model,
                audioModel: config.audioModel || defaults.audioModel
            };

            // Update cache
            configCache = result;
            cacheExpiry = Date.now() + CACHE_TTL_MS;
            console.log('[AI Config] Cache refreshed');

            return result;
        } catch (err) {
            console.error('[AI Config] DB error:', err);
            return configCache || defaults; // Return stale cache if DB fails
        }
    };

    // Helper: Invalidate cache (call after config updates)
    const invalidateCache = () => {
        configCache = null;
        cacheExpiry = 0;
    };

    // Helper: Set config in database
    const setConfig = async (key, value) => {
        try {
            const { error } = await supabase
                .from('app_config')
                .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });

            if (error) {
                console.error(`[AI Config] Failed to set ${key}:`, error);
                return false;
            }
            return true;
        } catch (err) {
            console.error(`[AI Config] DB error setting ${key}:`, err);
            return false;
        }
    };

    // Get current AI configuration
    router.get('/config', async (req, res) => {
        const config = await getConfig();
        res.json({
            currentProvider: config.provider,
            currentModel: config.model,
            currentAudioModel: config.audioModel,
            availableProviders: ['openrouter', 'gemini'],
            geminiModel: 'gemini-2.0-flash-exp'
        });
    });

    // Set AI configuration (provider + model) - Protected Route
    router.post('/config', verifyToken, requireRole('DEVELOPER'), async (req, res) => {
        const { provider, model, audioModel } = req.body;
        const updates = [];

        if (provider && ['openrouter', 'gemini'].includes(provider)) {
            updates.push(setConfig('ai_provider', provider));
            console.log(`[AI Config] Provider changed to: ${provider}`);
        }

        if (model) {
            updates.push(setConfig('ai_model', model));
            console.log(`[AI Config] Model changed to: ${model}`);
        }

        if (audioModel) {
            updates.push(setConfig('ai_audio_model', audioModel));
            console.log(`[AI Config] Audio Model changed to: ${audioModel}`);
        }

        await Promise.all(updates);
        invalidateCache(); // Invalidate cache to force fresh read
        const config = await getConfig();

        res.json({
            success: true,
            currentProvider: config.provider,
            currentModel: config.model,
            currentAudioModel: config.audioModel
        });
    });

    // Get available free models from OpenRouter
    router.get('/free-models', async (req, res) => {
        try {
            const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
            if (!OPENROUTER_API_KEY) {
                return res.json({ models: [], error: 'OpenRouter API key not configured' });
            }

            const response = await fetch('https://openrouter.ai/api/v1/models', {
                headers: { 'Authorization': `Bearer ${OPENROUTER_API_KEY}` }
            });

            if (!response.ok) {
                return res.json({ models: [], error: 'Failed to fetch models from OpenRouter' });
            }

            const data = await response.json();

            // Filter to free models only
            const freeModels = data.data
                .filter(m => {
                    const promptCost = parseFloat(m.pricing?.prompt || '999');
                    return promptCost === 0 || m.id.includes(':free');
                })
                .map(m => ({
                    id: m.id,
                    name: m.name,
                    context: m.context_length,
                    provider: m.id.split('/')[0]
                }))
                .slice(0, 50);

            res.json({
                models: freeModels,
                totalFree: freeModels.length
            });
        } catch (error) {
            console.error('Free models fetch error:', error);
            res.json({ models: [], error: error.message });
        }
    });

    // Legacy endpoints for backwards compatibility
    router.get('/models', async (req, res) => {
        const config = await getConfig();
        const models = config.provider === 'gemini'
            ? [{ id: 'gemini-2.0-flash-exp', name: 'Gemini 2.5 (Flash)', provider: 'Google', free: true }]
            : [{ id: config.model, name: config.model, provider: 'OpenRouter', free: true }];

        res.json({
            currentModel: config.model,
            currentProvider: config.provider,
            availableModels: models,
            totalModels: models.length
        });
    });

    router.post('/models', async (req, res) => {
        const { model } = req.body;
        if (model) {
            await setConfig('ai_model', model);
        }
        const config = await getConfig();
        res.json({ success: true, currentModel: config.model });
    });

    router.get('/status', async (req, res) => {
        const config = await getConfig();
        res.json({
            ...getStatus(),
            currentProvider: config.provider,
            currentModel: config.model
        });
    });

    return router;
};

export default router;
