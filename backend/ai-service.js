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

import { GoogleGenAI, Type } from "@google/genai";
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });
dotenv.config({ path: path.join(__dirname, '../.env') });

// --- Configuration ---
const AI_PROVIDER = 'openrouter';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.REACT_APP_GEMINI_API_KEY;

// Model configurations
const MODELS = {
    openrouter: {
        default: process.env.OPENROUTER_DEFAULT_MODEL || 'google/gemini-2.0-flash-exp:free',
        fast: 'openai/gpt-3.5-turbo',
        powerful: 'openai/gpt-4o',
        claude: 'anthropic/claude-3.5-sonnet',
        gemini: 'google/gemini-2.5-flash'
    },
    gemini: {
        default: 'gemini-1.5-flash',
        powerful: 'gemini-1.5-pro'
    }
};

// Initialize Gemini client (for fallback)
let geminiClient = null;
if (GEMINI_API_KEY) {
    geminiClient = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
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
    const config = options.json ? {
        responseMimeType: "application/json",
    } : {};

    try {
        const response = await geminiClient.models.generateContent({
            model: modelName,
            contents: prompt,
            config
        });

        return {
            text: response.text,
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
    const preferredProvider = options.provider || AI_PROVIDER;

    try {
        if (preferredProvider === 'openrouter' && OPENROUTER_API_KEY) {
            return await generateWithOpenRouter(prompt, options);
        } else if (preferredProvider === 'gemini' && GEMINI_API_KEY) {
            return await generateWithGemini(prompt, options);
        } else if (OPENROUTER_API_KEY) {
            return await generateWithOpenRouter(prompt, options);
        } else if (GEMINI_API_KEY) {
            return await generateWithGemini(prompt, options);
        } else {
            throw new Error('No AI provider configured. Set OPENROUTER_API_KEY or GEMINI_API_KEY');
        }
    } catch (error) {
        console.warn(`Primary AI (${preferredProvider}) failed: ${error.message}`);

        // Fallback logic
        if (preferredProvider === 'openrouter' && GEMINI_API_KEY) {
            console.log('Falling back to Gemini...');
            return await generateWithGemini(prompt, { ...options, model: MODELS.gemini.default });
        } else if (preferredProvider === 'gemini' && OPENROUTER_API_KEY) {
            console.log('Falling back to OpenRouter...');
            return await generateWithOpenRouter(prompt, options);
        }

        throw error;
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
            const geminiChat = geminiClient.chats.create({
                model: MODELS.gemini.default,
                history: messages.slice(0, -1).map(msg => ({
                    role: msg.role === 'ai' ? 'model' : 'user',
                    parts: [{ text: msg.text || msg.content }]
                }))
            });
            const lastMessage = messages[messages.length - 1];
            const result = await geminiChat.sendMessage(lastMessage.text || lastMessage.content);
            return {
                text: result.response.text,
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
    MODELS,
    Type
};

export default {
    generate,
    chat,
    getAvailableModels,
    getStatus,
    MODELS
};
