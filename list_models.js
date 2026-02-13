import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env.local') });
dotenv.config({ path: path.join(__dirname, '.env') });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
    console.error("No Gemini API Key found!");
    process.exit(1);
}

const client = new GoogleGenerativeAI(GEMINI_API_KEY);

async function listModels() {
    try {
        // Since GoogleGenerativeAI SDK doesn't have a direct listModels method on the client instance in some versions (or it's on a different manager), 
        // we might not be able to list them easily with this SDK version if it's strictly for generation.
        // However, we can try a direct fetch if needed, but let's try to see if we can use a known model that *must* exist like 'gemini-pro'.
        // Actually, let's try to just generate with 'gemini-pro' as a test in this script.

        console.log("Testing 'gemini-pro'...");
        const model = client.getGenerativeModel({ model: "gemini-pro" });
        const result = await model.generateContent("Hello");
        console.log("Success with gemini-pro!");
        console.log(result.response.text());

    } catch (error) {
        console.error("Failed with gemini-pro:", error.message);

        try {
            console.log("Testing 'models/gemini-1.5-flash' (with prefix)...");
            const model2 = client.getGenerativeModel({ model: "models/gemini-1.5-flash" });
            const result2 = await model2.generateContent("Hello");
            console.log("Success with models/gemini-1.5-flash!");
            console.log(result2.response.text());
        } catch (err2) {
            console.error("Failed with models/gemini-1.5-flash:", err2.message);
        }
    }
}

listModels();
