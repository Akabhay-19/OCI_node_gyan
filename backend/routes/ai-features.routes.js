import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import fs from 'fs';
const router = express.Router();

export const createAIFeatureRoutes = (aiService, supabase, helpers, upload) => {
    router.use(verifyToken);
    const { generate } = aiService;
    const { cleanText, extractTextFromPDF, extractTextFromDOCX, getCurrentModel, getCurrentProvider } = helpers;

    // 1. Generate Remedial Content
    router.post('/remedial/generate', async (req, res) => {
        const { topic, subTopic, gradeLevel, subject } = req.body;
        try {
            const contextPhrase = subTopic ? `(specifically focusing on "${subTopic}")` : '';
            const prompt = `You are an expert AI tutor helping a student close a learning gap.
            1. CONCEPT EXPLANATION: Explain "${topic}" ${contextPhrase} to a ${gradeLevel} student who is struggling. Use analogies. Keep it under 200 words.
            2. QUIZ: Create a multiple choice quiz about "${topic}" ${contextPhrase} for ${gradeLevel} students. Generate between 5 to 10 questions.
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
                  "correctAnswer": 0, // Index of correct option (0-3)
                  "explanation": "Detailed paragraph explaining the answer"
                }
              ]
            }`;
            const result = await generate(prompt, { json: true });
            res.json(JSON.parse(cleanText(result.text)));
        } catch (error) {
            console.error("Remedial Gen Error:", error);
            res.status(500).json({ error: "Failed to generate remedial content" });
        }
    });

    // 2. Resolve Remedial Gap
    router.post('/remedial/resolve', async (req, res) => {
        const { studentId, gapId, score, totalQuestions } = req.body;
        try {
            const percentage = (score / totalQuestions) * 100;
            const isResolved = percentage >= 80;
            if (isResolved) {
                const { data: student } = await supabase.from('students').select('weaknessHistory').eq('id', studentId).single();
                let history = student?.weaknessHistory || [];
                const idx = history.findIndex(g => g.id === gapId);
                if (idx !== -1) {
                    history[idx].status = 'RESOLVED';
                    history[idx].resolvedAt = new Date().toISOString();
                    await supabase.from('students').update({ weaknessHistory: history }).eq('id', studentId);
                }
            }
            res.json({ success: true, resolved: isResolved, percentage });
        } catch (error) {
            console.error("Gap Resolution Error:", error);
            res.status(500).json({ error: "Failed to resolve gap" });
        }
    });

    // 3. Mind Map Generation
    router.post('/mindmap', upload.single('file'), async (req, res) => {
        try {
            if (!req.file) return res.status(400).json({ error: "No file uploaded" });
            const buffer = fs.readFileSync(req.file.path);
            let text = "";
            if (req.file.mimetype === 'application/pdf') text = await extractTextFromPDF(buffer);
            else if (req.file.mimetype.includes('word')) text = await extractTextFromDOCX(buffer);
            else text = buffer.toString('utf-8');
            fs.unlinkSync(req.file.path);

            const prompt = `You are an expert educational AI helper. 
            Generate a comprehensive hierarchical structure for a concept map / mind map about: "${text.substring(0, 200)}..."
            Create a detailed mindmap covering key concepts, subtopics, and relationships.
            The output must be strictly valid JSON.
            Structure the JSON as a list of nodes and a list of edges.
            Nodes: { "id": "unique_id", "label": "Concise Label", "type": "default" }
            Edges: { "id": "e_source_target", "source": "source_id", "target": "target_id" }
            CRITICAL INSTRUCTIONS FOR "NOTEBOOKLM" STYLE DEPTH:
            1.  **Deep Hierarchy**: Start with the Central Topic. Break it down into Major Themes. Break those into Subtopics. Break those into specific Details. Continue until you reach atomic facts where no further breakdown is useful.
            2.  **Exhaustive**: Do NOT limit the number of nodes. Capture ALL relevant information from the text.
            3.  **Concise Labels**: Keep node labels short and punchy (max 5-7 words).
            4.  **Single Root**: Ensure there is exactly one central "root" node that connects to all major themes.
            Output Format Example:
            {
              "nodes": [
                {"id": "root", "label": "Atoms & Molecules", "type": "input"},
                {"id": "1", "label": "Laws of Chemical Combination"},
                {"id": "1.1", "label": "Law of Conservation of Mass"}
              ],
              "edges": [
                {"id": "e1", "source": "root", "target": "1"},
                {"id": "e2", "source": "1", "target": "1.1"}
              ]
            }
            IMPORTANT:
            1. Return ONLY the JSON string. No markdown.
            2. Ensure the JSON is valid and parsable.
            
            Text to analyze:
            ${text.substring(0, 10000)}`;
            const result = await generate(prompt, {
                model: await getCurrentModel(supabase),
                provider: await getCurrentProvider(supabase)
            });
            res.json(JSON.parse(cleanText(result.text)));
        } catch (error) {
            console.error("Mind Map Error:", error);
            res.status(500).json({ error: error.message });
        }
    });

    // 4. Teacher Tools: Lesson Plan
    // 4. Teacher Tools: Lesson Plan
    router.post('/teacher/lesson-plan', async (req, res) => {
        const { topic, gradeLevel, duration, objectives, subject } = req.body;
        try {
            const prompt = `Create a detailed lesson plan for:
            Topic: "${topic}"
            Subject: "${subject || 'General'}"
            Grade: ${gradeLevel}
            Duration: ${duration}
            Objectives: ${objectives || 'Standard learning outcomes'}

            Return JSON object with a single key "markdown" containing the lesson plan in Markdown format.
            Example: { "markdown": "# Title\n\n## Objectives..." }`;

            const modelToUse = await getCurrentModel(supabase);
            const providerToUse = await getCurrentProvider(supabase);

            const result = await generate(prompt, {
                json: true,
                model: modelToUse,
                provider: providerToUse
            });

            res.json(JSON.parse(cleanText(result.text)));
        } catch (error) {
            console.error("Lesson Plan Error:", error);
            res.status(500).json({ error: "Failed to generate lesson plan", details: error.message });
        }
    });

    // 4.5 Teacher Tools: Presentation
    router.post('/teacher/presentation', async (req, res) => {
        const { topic, subject, gradeLevel, description } = req.body;
        try {
            const prompt = `You are an expert pedagogical designer. Create a slide-based presentation for:
            Topic: "${topic}"
            Subject: "${subject || 'General'}"
            Grade: ${gradeLevel}
            Context/Description: ${description || 'Comprehensive overview'}
            
            REQUIREMENTS:
            1. Generate a sequence of at least 8 slides.
            2. Each slide must have a "title", a list of "content" (bullet points), and a "visualSuggestion" (description of a diagram or image).
            3. Include a "footer" for each slide.
            4. Return ONLY valid JSON with a single key "slides" containing the array of slide objects.
            
            Example Format:
            {
              "slides": [
                {
                  "title": "Introduction to Newton's Laws",
                  "content": ["First Law: Inertia", "Second Law: F=ma", "Third Law: Action-Reaction"],
                  "visualSuggestion": "A diagram showing a ball at rest and a force arrow being applied.",
                  "footer": "Physics 101 - Lesson 1"
                }
              ]
            }`;

            const modelToUse = await getCurrentModel(supabase);
            const providerToUse = await getCurrentProvider(supabase);

            const result = await generate(prompt, {
                json: true,
                model: modelToUse,
                provider: providerToUse
            });

            res.json(JSON.parse(cleanText(result.text)));
        } catch (error) {
            console.error("Presentation Error:", error);
            res.status(500).json({ error: "Failed to generate presentation", details: error.message });
        }
    });

    // 5. Generate Mindmap from Text
    router.post('/generate-mindmap-from-text', async (req, res) => {
        const { text, topic, gradeLevel, subject } = req.body;
        try {
            const prompt = `You are an expert educational AI helper. 
            Generate a comprehensive hierarchical structure for a concept map / mind map about: "${topic || 'Main Topic'}"
            Create a detailed mindmap covering key concepts, subtopics, and relationships.
            The output must be strictly valid JSON.
            Structure the JSON as a list of nodes and a list of edges.
            Nodes: { "id": "unique_id", "label": "Concise Label", "type": "default" }
            Edges: { "id": "e_source_target", "source": "source_id", "target": "target_id" }
            CRITICAL INSTRUCTIONS FOR "NOTEBOOKLM" STYLE DEPTH:
            1.  **Deep Hierarchy**: Start with the Central Topic. Break it down into Major Themes. Break those into Subtopics. Break those into specific Details. Continue until you reach atomic facts where no further breakdown is useful.
            2.  **Exhaustive**: Do NOT limit the number of nodes. Capture ALL relevant information from the text.
            3.  **Concise Labels**: Keep node labels short and punchy (max 5-7 words).
            4.  **Single Root**: Ensure there is exactly one central "root" node that connects to all major themes.
            Output Format Example:
            {
              "nodes": [
                {"id": "root", "label": "Atoms & Molecules", "type": "input"},
                {"id": "1", "label": "Laws of Chemical Combination"},
                {"id": "1.1", "label": "Law of Conservation of Mass"}
              ],
              "edges": [
                {"id": "e1", "source": "root", "target": "1"},
                {"id": "e2", "source": "1", "target": "1.1"}
              ]
            }
            IMPORTANT:
            1. Return ONLY the JSON string. No markdown.
            2. Ensure the JSON is valid and parsable.
            
            Text to analyze:
            ${text.substring(0, 10000)} ${topic ? `(Topic: ${topic})` : ''}`;
            const result = await generate(prompt, {
                model: await getCurrentModel(supabase),
                provider: await getCurrentProvider(supabase)
            });
            res.json(JSON.parse(cleanText(result.text)));
        } catch (error) {
            console.error("Text Mindmap Error:", error);
            res.status(500).json({ error: error.message });
        }
    });

    // 6. Prerequisites Analysis
    router.post('/prerequisites', async (req, res) => {
        const { topic, gradeLevel } = req.body;
        try {
            const prompt = `Analyze the topic "${topic}" for ${gradeLevel} students. Identify the MOST critical prerequisite concept they must know first.
            Return JSON format: { "prerequisite": "Concept Name", "reason": "Why this is critical", "resourceQuery": "Search term for educational videos" }`;
            const result = await generate(prompt, { json: true });
            res.json(JSON.parse(cleanText(result.text)));
        } catch (error) {
            console.error("Prerequisites Error:", error);
            res.status(500).json({ error: "Failed to analyze prerequisites" });
        }
    });

    // 7. Story Generation
    router.post('/story', async (req, res) => {
        const { topic, subject, gradeLevel, language } = req.body;
        try {
            const prompt = `Write an educational story explaining "${topic}" in the subject of "${subject}" for a ${gradeLevel} student in ${language}. The story should make the concept easy to understand.
            CRITICAL FORMATTING RULES:
            - Use ONLY plain English text. NO LaTeX, NO mathematical symbols like \\, \\textbf, \\nabla, \\frac, etc.
            - Write any formulas in simple words: "Energy equals mass times the speed of light squared"
            - Make it engaging, readable, and age-appropriate.
            Return JSON: {"title": "Story title", "story": "Full story text in plain English", "genre": "Genre", "keyConcepts": ["concept1", "concept2"]}
            IMPORTANT: Return ONLY valid JSON.`;
            const result = await generate(prompt);
            res.json(JSON.parse(cleanText(result.text)));
        } catch (error) {
            console.error("Story Gen Error:", error);
            res.status(500).json({ error: "Failed to generate story" });
        }
    });

    // 8. Flashcards Generation
    router.post('/flashcards', async (req, res) => {
        const { topic, gradeLevel, count } = req.body;
        try {
            const prompt = `Create a set of ${count || 10} study flashcards about "${topic}" for a ${gradeLevel || 'Grade 10'} student.
            Each flashcard should have a 'front' (term/question) and 'back' (definition/answer). Keep the 'back' concise.
            CRITICAL FORMATTING RULES:
            - Use ONLY plain English text. NO LaTeX, NO mathematical symbols like \\, \\textbf, \\nabla, \\frac, etc.
            - Write formulas in simple words: "Force = mass × acceleration" NOT "F = m \\cdot a"
            - Keep answers clear, concise, and easy to memorize.
            Return JSON array: [{"front": "Question/term in plain English", "back": "Answer/definition in plain English"}]
            IMPORTANT: Return ONLY valid JSON array.`;
            const result = await generate(prompt, { json: true });
            res.json(JSON.parse(cleanText(result.text)));
        } catch (error) {
            console.error("Flashcards Error:", error);
            res.status(500).json({ error: "Failed to generate flashcards" });
        }
    });

    // 9. Find Opportunities
    router.post('/opportunities/find', async (req, res) => {
        const { interest, region, gradeLevel, type } = req.body;
        try {
            const prompt = `List 5 active or upcoming ${type || 'competitions and scholarships'} for ${gradeLevel || 'High School'} students in 2025/2026 related to "${interest}".
            Focus on opportunities relevant to: ${region}.
            CRITICAL FILTERING RULES:
            1. STRICTLY EXCLUDE opportunities that are NOT for ${gradeLevel}. If uncertain, exclude it.
            2. If no opportunities are found specifically for ${gradeLevel}, return an empty array []. DO NOT hallucinate.
            Return a strictly valid JSON array of objects with this schema:
            {
              "id": "string (unique)",
            "title": "string",
            "type": "SCHOLARSHIP" | "COMPETITION" | "OLYMPIAD",
            "organization": "string",
            "deadline": "YYYY-MM-DD (approximate if unknown)",
            "reward": "string",
            "description": "string (brief summary)",
            "tags": ["string"],
            "link": "string (Official URL. If unknown, leave empty string '')",
            "searchQuery": "string (Google search query to find this opportunity, e.g. 'Apply for XYZ Scholarship 2026')"
            }
            Ensure the data looks realistic and high quality.`;
            const result = await generate(prompt, { json: true });
            res.json(JSON.parse(cleanText(result.text || '{"opportunities": []}')));
        } catch (error) {
            console.error("Opportunities Error:", error);
            res.status(500).json({ error: "Failed to find opportunities" });
        }
    });

    // 10. Chat
    router.post('/chat', async (req, res) => {
        const { message, history } = req.body;
        try {
            const prompt = `You are a helpful educational assistant. Use the conversation history to provide relevant guidance.
            User Message: ${message}
            History: ${JSON.stringify(history)}
            
            (IMPORTANT: Use ONLY plain English text in your response. Do NOT use any LaTeX notation or mathematical symbols like \\textbf, \\nabla, \\frac, etc. Write formulas in simple readable words like 'Force = mass times acceleration'. Keep explanations clear and easy to understand.)`;
            const result = await generate(prompt);
            res.json({ response: result.text });
        } catch (error) {
            console.error("Chat Error:", error);
            res.status(500).json({ error: "Failed to get chat response" });
        }
    });

    return router;
};

export default router;
