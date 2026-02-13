/**
 * Environment Validation Utility
 * Ensures required environment variables are present at startup.
 */

const requiredVars = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'JWT_SECRET',
];

const optionalVars = [
    'GEMINI_API_KEY',
    'OPENROUTER_API_KEY',
    'RESEND_API_KEY',
    'ALLOWED_ORIGINS',
];

export const validateEnv = () => {
    console.log('[GYAN AI] Validating environment...');
    const missing = [];

    for (const varName of requiredVars) {
        // Check both direct and VITE_ prefixed versions
        if (!process.env[varName] && !process.env[`VITE_${varName}`]) {
            missing.push(varName);
        }
    }

    if (missing.length > 0) {
        console.error(`[GYAN AI] CRITICAL: Missing required environment variables: ${missing.join(', ')}`);
        console.error('[GYAN AI] Please check your .env file.');
        process.exit(1);
    } else {
        console.log('[GYAN AI] ✓ All required environment variables are present.');
    }

    // Warn about missing optional vars
    for (const varName of optionalVars) {
        if (!process.env[varName] && !process.env[`VITE_${varName}`]) {
            console.warn(`[GYAN AI] Warning: Optional ${varName} is not set. Some features may be disabled.`);
        }
    }
};
