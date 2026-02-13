import express from 'express';
import { verifyToken } from '../middleware/auth.js';
const router = express.Router();

export const createEnglishRoutes = (aiService, supabase, helpers) => {
    router.use(verifyToken);
    const { generate } = aiService;
    const { cleanText } = helpers;

    // 1. Analyze English Text
    router.post('/analyze', async (req, res) => {
        try {
            const { text } = req.body;
            const prompt = `Act as an English Code Compiler. Analyze the following text for grammar, tone, and style.
            Return JSON format: {
              "errors": [{"line": 1, "message": "...", "suggestion": "..." }],
              "cefrLevel": "A1-C2", "tone": "...", "readability": "...", "score": 0-100
            }
            Text: "${text}"`;
            const result = await generate(prompt);
            res.json(JSON.parse(cleanText(result.text)));
        } catch (error) {
            res.status(500).json({ error: 'Analysis failed' });
        }
    });

    // 2. Generate Practice
    router.post('/generate-practice', async (req, res) => {
        try {
            const { topic, level, focusContext } = req.body;
            let prompt = "";

            if (topic.includes("Active & Passive Voice")) {
                const subType = topic.split(" - ")[1];
                prompt = `Generate a sentence in Active Voice ${subType ? `specifically in ${subType} Tense` : ''} for the student to convert into Passive Voice.
                Topic: Active & Passive Voice ${subType ? `(${subType})` : ''}
                Difficulty: ${level}`;
            } else if (topic.includes("Nouns") || topic.includes("Verbs")) {
                const subType = topic.split(" - ")[1];
                prompt = `Generate a sentence. The student must identify the Nouns and Verbs.
                ${subType ? `Focus specifically on including examples of: ${subType}.` : ''}
                Topic: Nouns & Verbs ${subType ? `(${subType})` : ''}
                Difficulty: ${level}`;
            } else {
                const isBroadTense = topic.endsWith("Tense") && !topic.includes("Simple") && !topic.includes("Continuous") && !topic.includes("Perfect");
                prompt = `Generate a single Hindi sentence for a student to translate to English.
                Topic: ${topic} ${isBroadTense ? '(Mix of Simple, Continuous, Perfect forms randomly)' : ''}
                Difficulty: ${level}`;
            }

            if (focusContext) {
                prompt += `\nFocus Context: ${focusContext}`;
            }

            const isVoice = topic.startsWith("Active & Passive Voice");
            const isNounVerb = topic.startsWith("Nouns") || topic.startsWith("Verbs");

            prompt += `\nReturn JSON format: {"question": "${isVoice ? "Active Voice Sentence" : isNounVerb ? "Sentence" : "Hindi Sentence"}", "answer": "${isVoice ? "Passive Voice Conversion" : isNounVerb ? "Nouns: [list], Verbs: [list]" : "English Translation"}", "hints": ["hint1"] }`;

            const result = await generate(prompt);
            res.json(JSON.parse(cleanText(result.text)));
        } catch (error) {
            console.error('Generate Practice Error:', error);
            res.status(500).json({ error: 'Generation failed' });
        }
    });

    // 3. Validate Practice
    router.post('/validate', async (req, res) => {
        try {
            const { question, answer, context } = req.body;
            let instructions = "If the Question was in Hindi, check the English Translation.";
            if (context?.includes("Active & Passive Voice")) {
                instructions = "The user MUST convert the sentence to Passive Voice. Check strict grammatical accuracy.";
            } else if (context?.includes("Nouns") || context?.includes("Verbs")) {
                instructions = "The user MUST identify Nouns and Verbs. Check if the classification is correct.";
            }

            const prompt = `Evaluate this student's answer.
            Context/Topic: ${context || "General Translation"}
            Question/Prompt: "${question}"
            Student Answer: "${answer}"
            Instructions: ${instructions}
            Return JSON: { "correct": boolean, "feedback": "...", "improved": "..." }`;

            const result = await generate(prompt);
            res.json(JSON.parse(cleanText(result.text)));
        } catch (error) {
            res.status(500).json({ error: 'Validation failed' });
        }
    });

    // 4. Writing Assistant
    router.post('/writing/guide', async (req, res) => {
        try {
            const { type, topic } = req.body;
            const prompt = `Create a writing guide for a student. Type: ${type}, Topic: ${topic}.
            Return JSON: { "structure": [{"part": "...", "instruction": "..."}], "example": "..." }`;
            const result = await generate(prompt);
            res.json(JSON.parse(cleanText(result.text)));
        } catch (error) {
            res.status(500).json({ error: "Failed" });
        }
    });

    router.post('/writing/evaluate', async (req, res) => {
        try {
            const { type, topic, content } = req.body;
            const prompt = `Evaluate this student's writing. Type: ${type}, Topic: ${topic}, Content: "${content}".
            Return JSON: { "score": 0, "corrections": [...], "tips": [...] }`;
            const result = await generate(prompt);
            res.json(JSON.parse(cleanText(result.text)));
        } catch (error) {
            res.status(500).json({ error: "Failed" });
        }
    });

    return router;
};

export default router;
