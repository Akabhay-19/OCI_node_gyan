/**
 * Unified AI Service for GYAN_AI1
 * Supports multiple providers: OpenRouter (default) and Gemini (fallback)
 * 
 * OpenRouter gives access to 350+ models including:
 * - OpenAI: gpt-4, gpt-4-turbo, gpt-4o, gpt-3.5-turbo
 * - Anthropic: claude-3.5-sonnet, claude-3-opus, claude-3-haiku
 * - Google: gemini-2.5-pro, gemini-2.5-flash
 * - Meta: llama-3.1-405b, llama-3.1-70b
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables immediately
dotenv.config({ path: path.join(__dirname, '../.env.local') });
dotenv.config({ path: path.join(__dirname, '../.env') });

// --- Configuration ---
const AI_PROVIDER = 'gemini';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || process.env.VITE_OPENROUTER_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || process.env.REACT_APP_GEMINI_API_KEY;

// Model configurations
const MODELS = {
    openrouter: {
        default: process.env.OPENROUTER_DEFAULT_MODEL || 'google/gemini-2.0-flash-lite-preview-02-05:free',
        fast: 'openai/gpt-3.5-turbo',
        powerful: 'openai/gpt-4o',
        claude: 'anthropic/claude-3.5-sonnet',
        gemini: 'google/gemini-2.0-flash-lite-preview-02-05:free'
    },
    gemini: {
        default: 'gemini-flash-latest',
        powerful: 'gemini-pro-latest'
    }
};

// Initialize Gemini client (for fallback)
let geminiClient = null;
if (GEMINI_API_KEY) {
    geminiClient = new GoogleGenerativeAI(GEMINI_API_KEY);
}

/**
 * Generate content using OpenRouter API
 */
async function generateWithOpenRouter(prompt, options = {}) {
    const model = options.model || MODELS.openrouter.default;
    const maxTokens = options.maxTokens || 4096;
    const jsonMode = options.json || false;

    console.log(`[OpenRouter] Generating with model: ${model}`);

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://gyan-ai.com',
            'X-Title': 'GYAN AI'
        },
        body: JSON.stringify({
            model: model,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: maxTokens,
            // Removing response_format as it causes 400 errors for many free models on OpenRouter
            // response_format: jsonMode ? { type: 'json_object' } : undefined
        })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(`OpenRouter Error: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    return {
        text: data.choices[0]?.message?.content || '',
        model: data.model,
        usage: data.usage,
        provider: 'openrouter'
    };
}

/**
 * Generate content using Gemini API
 */
async function generateWithGemini(prompt, options = {}) {
    if (!geminiClient) {
        throw new Error('Gemini API key not configured');
    }

    const modelName = options.model || MODELS.gemini.default;
    // Configure generation options
    const config = {};
    if (options.temperature) config.temperature = options.temperature;
    if (options.maxTokens) config.maxOutputTokens = options.maxTokens;
    if (options.json) config.responseMimeType = "application/json";

    try {
        const model = geminiClient.getGenerativeModel({ model: modelName });
        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: config
        });
        const response = await result.response;
        const responseText = response.text();

        return {
            text: responseText,
            model: modelName,
            provider: 'gemini'
        };
    } catch (error) {
        console.error("Gemini Generation Error:", error);
        throw new Error(`Gemini Error: ${error.message}`);
    }
}

/**
 * Chat with OpenRouter API (for multi-turn conversations)
 */
async function chatWithOpenRouter(messages, options = {}) {
    const model = options.model || MODELS.openrouter.default;
    const maxTokens = options.maxTokens || 4096;

    const formattedMessages = messages.map(msg => ({
        role: msg.role === 'ai' || msg.role === 'model' ? 'assistant' : msg.role,
        content: msg.text || msg.content || msg.parts?.[0]?.text || ''
    }));

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://gyan-ai.com',
            'X-Title': 'GYAN AI Chat'
        },
        body: JSON.stringify({
            model: model,
            messages: formattedMessages,
            max_tokens: maxTokens
        })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(`OpenRouter Chat Error: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    return {
        text: data.choices[0]?.message?.content || '',
        model: data.model,
        usage: data.usage,
        provider: 'openrouter'
    };
}

/**
 * Main AI generation function with automatic fallback
 */
async function generate(prompt, options = {}) {
    // Force lowercase provider matching
    const requestedProvider = (options.provider || AI_PROVIDER || 'gemini').toLowerCase();
    console.log(`[AI Service] Generating with preferred provider: ${requestedProvider}`);

    try {
        if (requestedProvider === 'openrouter' && OPENROUTER_API_KEY) {
            return await generateWithOpenRouter(prompt, options);
        } else if (requestedProvider === 'gemini' && GEMINI_API_KEY) {
            return await generateWithGemini(prompt, options);
        } else if (OPENROUTER_API_KEY) {
            return await generateWithOpenRouter(prompt, options);
        } else if (GEMINI_API_KEY) {
            return await generateWithGemini(prompt, options);
        } else {
            throw new Error('No AI provider configured. Set OPENROUTER_API_KEY or GEMINI_API_KEY');
        }
    } catch (error) {
        console.warn(`Primary AI (${requestedProvider}) failed: ${error.message}`);
        const primaryError = error.message;

        // RETRY LOGIC for Gemini 503
        if (requestedProvider === 'gemini' && (error.message.includes('503') || error.message.includes('overloaded'))) {
            console.log("Gemini overloaded. Retrying in 2s...");
            await new Promise(r => setTimeout(r, 2000));
            try {
                return await generateWithGemini(prompt, options);
            } catch (retryErr) {
                console.error("Gemini Retry Failed:", retryErr.message);
            }
        }

        // Fallback logic
        try {
            if (requestedProvider === 'openrouter' && GEMINI_API_KEY) {
                console.log('Falling back to Gemini...');
                return await generateWithGemini(prompt, { ...options, model: MODELS.gemini.default });
            } else if (requestedProvider === 'gemini' && OPENROUTER_API_KEY) {
                console.log('Falling back to OpenRouter...');

                // User preferred initial model
                const initialModel = 'google/gemini-2.0-flash-lite-preview-02-05:free';
                try {
                    console.log(`[OpenRouter] Trying initial model: ${initialModel}`);
                    return await generateWithOpenRouter(prompt, { ...options, model: initialModel });
                } catch (e) {
                    console.warn(`[OpenRouter] Initial model ${initialModel} failed: ${e.message}`);
                }

                // Fallback list if initial fails
                const fallbacks = [
                    'google/gemini-flash-1.5',
                    'google/gemini-pro',
                    'mistralai/mistral-7b-instruct:free',
                    'openai/gpt-3.5-turbo'
                ];

                for (const model of fallbacks) {
                    try {
                        console.log(`[OpenRouter] Trying fallback model: ${model}`);
                        return await generateWithOpenRouter(prompt, { ...options, model });
                    } catch (e) {
                        console.warn(`[OpenRouter] Fallback ${model} failed: ${e.message}`);
                    }
                }
                throw new Error("All OpenRouter fallbacks failed.");
            }
        } catch (fallbackError) {
            throw new Error(`Primary AI (${requestedProvider}) failed: ${primaryError}. Fallback also failed: ${fallbackError.message}`);
        }

        throw error; // If no fallback was attempted
    }
}

/**
 * Chat function with automatic fallback
 */
async function chat(messages, options = {}) {
    const preferredProvider = options.provider || AI_PROVIDER;

    try {
        if (preferredProvider === 'openrouter' && OPENROUTER_API_KEY) {
            return await chatWithOpenRouter(messages, options);
        } else if (OPENROUTER_API_KEY) {
            return await chatWithOpenRouter(messages, options);
        } else if (GEMINI_API_KEY) {
            // Fallback to Gemini chat
            const model = geminiClient.getGenerativeModel({ model: MODELS.gemini.default });
            const chatSession = model.startChat({
                history: messages.slice(0, -1).map(msg => ({
                    role: msg.role === 'ai' || msg.role === 'model' ? 'model' : 'user',
                    parts: [{ text: msg.text || msg.content }]
                }))
            });
            const lastMessage = messages[messages.length - 1];
            const result = await chatSession.sendMessage(lastMessage.text || lastMessage.content);
            const response = await result.response;
            return {
                text: response.text(),
                model: MODELS.gemini.default,
                provider: 'gemini'
            };
        } else {
            throw new Error('No AI provider configured');
        }
    } catch (error) {
        console.warn(`Chat AI failed: ${error.message}`);
        throw error;
    }
}

/**
 * Get available models from OpenRouter
 */
async function getAvailableModels() {
    if (!OPENROUTER_API_KEY) return [];

    const response = await fetch('https://openrouter.ai/api/v1/models', {
        headers: { 'Authorization': `Bearer ${OPENROUTER_API_KEY}` }
    });

    if (!response.ok) return [];

    const data = await response.json();
    return data.data.map(m => ({
        id: m.id,
        name: m.name,
        context: m.context_length,
        pricing: m.pricing
    }));
}

/**
 * Get current AI configuration status
 */
function getStatus() {
    return {
        provider: AI_PROVIDER,
        openrouter: {
            configured: !!OPENROUTER_API_KEY,
            defaultModel: MODELS.openrouter.default
        },
        gemini: {
            configured: !!GEMINI_API_KEY,
            defaultModel: MODELS.gemini.default
        }
    };
}

// Log initialization status
console.log(`\n[AI Service] Initialized`);
console.log(`  Provider: ${AI_PROVIDER.toUpperCase()}`);
console.log(`  OpenRouter: ${OPENROUTER_API_KEY ? '✓ Configured' : '✗ Not configured'}`);
console.log(`  Gemini: ${GEMINI_API_KEY ? '✓ Configured (fallback)' : '✗ Not configured'}`);
if (OPENROUTER_API_KEY) {
    console.log(`  Default Model: ${MODELS.openrouter.default}`);
}
console.log('');

// Export the AI service
export {
    generate,
    chat,
    generateWithOpenRouter,
    generateWithGemini,
    chatWithOpenRouter,
    getAvailableModels,
    getStatus,
    MODELS
};

export default {
    generate,
    chat,
    getAvailableModels,
    getStatus,
    MODELS
};
