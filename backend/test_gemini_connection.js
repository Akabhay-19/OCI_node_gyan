
import { GoogleGenAI } from "@google/genai";
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
    console.error("No GEMINI_API_KEY found.");
    process.exit(1);
}

const client = new GoogleGenAI({ apiKey });

async function testModel(modelName) {
    console.log(`Testing model: ${modelName}...`);
    try {
        const response = await client.models.generateContent({
            model: modelName,
            contents: "Hello, are you functional?",
        });
        console.log(`[PASS] ${modelName} responded:`, response.text().slice(0, 50));
        return true;
    } catch (error) {
        console.error(`[FAIL] ${modelName}:`, error.message);
        return false;
    }
}

async function run() {
    await testModel('gemini-2.0-flash-exp');
    // await testModel('gemini-2.5-flash'); // Test if this hypothetical model exists
    // await testModel('gemini-1.5-pro');
}

run();
