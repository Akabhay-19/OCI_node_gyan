import { GoogleGenAI } from "@google/genai";
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const apiKey = process.env.REACT_APP_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey: apiKey });

async function testModel(modelName) {
    console.log(`Testing model: ${modelName}...`);
    try {
        const response = await ai.models.generateContent({
            model: modelName,
            contents: "Ping",
        });
        console.log(`SUCCESS: ${modelName} is working.`);
        return true;
    } catch (e) {
        console.error(`FAILED: ${modelName} - ${e.message}`);
        return false;
    }
}

async function run() {
    if (!apiKey) {
        console.error("No API Key found!");
        return;
    }
    await testModel('gemini-2.5-flash');
    await testModel('gemini-1.5-flash');
    await testModel('gemini-2.0-flash-exp');
}

run();
