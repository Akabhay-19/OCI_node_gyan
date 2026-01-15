
import { generate } from './backend/ai-service.js';
import dotenv from 'dotenv';
dotenv.config();

async function testRemedial() {
    console.log("Starting Remedial Content Generation Test...");

    const topic = "Photosynthesis";
    const gradeLevel = "Grade 10";
    const subject = "Biology";
    const contextPhrase = subject && subject !== 'General' ? `in the context of ${subject}` : '';

    const prompt = `You are an expert AI tutor helping a student close a learning gap.

    1. CONCEPT EXPLANATION: Explain "${topic}" ${contextPhrase} to a ${gradeLevel} student who is struggling. Use analogies. Keep it under 200 words.
    2. QUIZ: Create a multiple choice quiz about "${topic}" ${contextPhrase} for ${gradeLevel} students. Generate exactly 3 questions.

    REQUIREMENTS:
    1. Output ONLY valid JSON.
    2. "explanation" field must be a detailed paragraph explaining the answer.

    Return JSON with this EXACT structure:
    {
      "explanation": "The concept explanation from step 1",
      "practiceQuestions": [
        {
          "question": "Question text",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "correctAnswer": 0,
          "explanation": "Detailed paragraph explaining the answer"
        }
      ]
    }`;

    try {
        const response = await generate(prompt, { json: true });
        console.log("Raw Response Length:", response.text.length);
        console.log("Raw Response Preview:", response.text.substring(0, 300));

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
        const data = JSON.parse(cleaned);

        console.log("\\n--- PARSED DATA ---");
        console.log("Explanation exists:", !!data.explanation);
        console.log("Explanation length:", data.explanation?.length || 0);
        console.log("Practice Questions count:", data.practiceQuestions?.length || 0);

        if (data.practiceQuestions && data.practiceQuestions.length > 0) {
            console.log("First question:", data.practiceQuestions[0].question);
            console.log("First question options count:", data.practiceQuestions[0].options?.length);
            console.log("First question correctAnswer:", data.practiceQuestions[0].correctAnswer);
        }

        console.log("\\nSuccess!");
    } catch (e) {
        console.error("Test Failed:", e);
    }
}

testRemedial();
