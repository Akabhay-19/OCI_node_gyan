
import { generate } from './backend/ai-service.js';
import dotenv from 'dotenv';
dotenv.config();

async function testQuiz() {
    console.log("Starting Quiz Generation Test...");
    const prompt = `Create a multiple choice quiz about "Photosynthesis" for Grade 10 level students.
    Difficulty Level: Medium.
    Generate exactly 5 questions.
    
    Return a JSON array with this structure:
    [
      {
        "question": "Question text in plain English",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correctAnswer": 0,
        "explanation": "Why this is correct, in simple words"
      }
    ]
    
    IMPORTANT: Return ONLY valid JSON, no markdown or extra text.`;

    try {
        const response = await generate(prompt, { json: true });
        console.log("Raw Response Length:", response.text.length);
        console.log("Raw Response Preview:", response.text.substring(0, 200));

        // precise cleaner logic from server.js
        const cleanText = (text) => {
            if (!text) return "";
            let cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const firstOpenBrace = cleaned.indexOf('{');
            const firstOpenBracket = cleaned.indexOf('[');
            let startIndex = -1;
            let endIndex = -1;
            if (firstOpenBrace !== -1 && (firstOpenBracket === -1 || firstOpenBrace < firstOpenBracket)) {
                startIndex = firstOpenBrace;
                endIndex = cleaned.lastIndexOf('}') + 1;
            } else if (firstOpenBracket !== -1) {
                startIndex = firstOpenBracket;
                endIndex = cleaned.lastIndexOf(']') + 1;
            }
            if (startIndex !== -1 && endIndex !== -1) {
                return cleaned.substring(startIndex, endIndex);
            }
            return cleaned;
        };

        const cleaned = cleanText(response.text);
        const json = JSON.parse(cleaned);
        console.log("JSON Parsed Successfully.");
        console.log("Number of questions:", json.length);
        console.log("Success!");
    } catch (e) {
        console.error("Test Failed:", e);
    }
}

testQuiz();
