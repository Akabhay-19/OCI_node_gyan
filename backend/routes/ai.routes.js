import express from 'express';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Factory function to create AI routes with dependencies
export const createAIRoutes = (aiService, configState) => {
    const { generate, chat, getStatus } = aiService;

    // Get current AI configuration
    router.get('/config', async (req, res) => {
        res.json({
            currentProvider: configState.currentProvider,
            currentModel: configState.currentModel,
            currentAudioModel: configState.currentAudioModel,
            availableProviders: ['openrouter', 'gemini'],
            geminiModel: 'gemini-2.0-flash-exp'
        });
    });

    // Set AI configuration (provider + model) - Protected Route
    router.post('/config', verifyToken, requireRole('DEVELOPER'), async (req, res) => {
        const { provider, model, audioModel } = req.body;

        if (provider && ['openrouter', 'gemini'].includes(provider)) {
            configState.currentProvider = provider;
            console.log(`[AI Config] Provider changed to: ${provider}`);
        }

        if (model) {
            configState.currentModel = model;
            console.log(`[AI Config] Model changed to: ${model}`);
        }

        if (audioModel) {
            configState.currentAudioModel = audioModel;
            console.log(`[AI Config] Audio Model changed to: ${audioModel}`);
        }

        res.json({
            success: true,
            currentProvider: configState.currentProvider,
            currentModel: configState.currentModel,
            currentAudioModel: configState.currentAudioModel
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
        const models = configState.currentProvider === 'gemini'
            ? [{ id: 'gemini-2.0-flash-exp', name: 'Gemini 2.5 (Flash)', provider: 'Google', free: true }]
            : [{ id: configState.currentModel, name: configState.currentModel, provider: 'OpenRouter', free: true }];

        res.json({
            currentModel: configState.currentModel,
            currentProvider: configState.currentProvider,
            availableModels: models,
            totalModels: models.length
        });
    });

    router.post('/models', async (req, res) => {
        const { model } = req.body;
        if (model) configState.currentModel = model;
        res.json({ success: true, currentModel: configState.currentModel });
    });

    router.get('/status', async (req, res) => {
        res.json({
            ...getStatus(),
            currentProvider: configState.currentProvider,
            currentModel: configState.currentModel
        });
    });

    return router;
};

export default router;
