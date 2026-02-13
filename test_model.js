import dotenv from 'dotenv';
import { generate } from './backend/ai-service.js';

// Load env vars
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' });

console.log("------------------------------------------");
console.log("   AI SERVICE DIAGNOSTIC TEST");
console.log("------------------------------------------");
console.log("OPENROUTER_API_KEY present:", !!process.env.OPENROUTER_API_KEY);
console.log("GEMINI_API_KEY present:", !!process.env.GEMINI_API_KEY);

const prompt = "Explain quantum computing in one sentence.";

async function runTest() {
    try {
        console.log("\nAttempting generation...");
        const response = await generate(prompt);
        console.log("\n[SUCCESS]");
        console.log("Provider:", response.provider);
        console.log("Model:", response.model);
        console.log("Response:", response.text);
    } catch (error) {
        console.error("\n[FAILURE]");
        console.error("Error:", error.message);
        if (error.cause) console.error("Cause:", error.cause);
    }
}

runTest();
