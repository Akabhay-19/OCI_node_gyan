import express from 'express';
import { verifyToken } from '../middleware/auth.js';
const router = express.Router();

export const createAssignmentRoutes = (aiService, supabase, helpers) => {
    router.use(verifyToken);
    const { generate } = aiService;
    const { getCurrentModel, getCurrentProvider, cleanText, saveModuleHistory } = helpers;

    // 1. Assignment Generation
    router.post('/generate', async (req, res) => {
        try {
            const { topic, questionCount, type, studentId, classId, gradeLevel, subject, difficulty } = req.body;
            let qCount = questionCount || 20;
            if (qCount < 20) qCount = 20;
            if (qCount > 30) qCount = 30;

            const typeInstructions = type === 'MCQ'
                ? '- Generate ONLY Multiple Choice Questions.'
                : type === 'Theory'
                    ? '- Generate ONLY Theory/Subjective questions.'
                    : '- Generate a MIX of MCQ (approx 60%) and Theory (approx 40%) questions.';

            const questionFormat = type === 'MCQ'
                ? `{"question": "Question text", "options": ["A", "B", "C", "D"], "correctAnswer": 0, "marks": 1}`
                : `{"question": "Question text", "answerKey": "Key points for grading", "marks": 5}`;

            const prompt = `Create a school assignment about "${topic}" for ${gradeLevel} ${subject} students. 
            Difficulty: ${difficulty}.
            ${typeInstructions}

            CRITICAL FORMATTING RULES:
            - Use ONLY plain English text. NO LaTeX, NO mathematical symbols like \\, \\textbf, \\nabla, \\frac, etc.
            - Write formulas in simple words: "Area = length × width" NOT "A = l \\cdot w"
            - Make questions clear and readable for students.
            - For MCQ: options array MUST have exactly 4 items.
            - For MCQ: correctAnswer MUST be an integer 0-3.

            Return JSON with structure:
            {
              "title": "Creative Title",
              "description": "Brief instructions in plain English",
              "suggestedMaxMarks": ${qCount * 2},
              "questions": [
                 ${questionFormat}
              ]
            }

            IMPORTANT: Return ONLY valid JSON with exactly ${qCount} questions.`;

            const response = await generate(prompt, {
                json: true,
                model: await getCurrentModel(supabase),
                provider: await getCurrentProvider(supabase)
            });

            const assignmentData = JSON.parse(cleanText(response.text));

            if (studentId) {
                await saveModuleHistory(supabase, studentId, 'ASSIGNMENT', topic, assignmentData, classId);
            }

            res.json({
                ...assignmentData,
                _meta: {
                    model: response.model,
                    provider: response.provider
                }
            });
        } catch (error) {
            console.error("Assignment Error:", error);
            res.status(500).json({ error: "Failed to generate assignment" });
        }
    });

    // 2. Submit Assignment
    router.post('/submit', async (req, res) => {
        const { id, assignmentId, studentId, score, maxMarks, timeTaken, answers, textAnswer, attachment } = req.body;
        const submittedAt = new Date().toISOString();

        try {
            const { error } = await supabase
                .from('submissions')
                .insert([{
                    id, assignmentId, studentId, score, maxMarks, submittedAt, timeTaken,
                    status: 'SUBMITTED', answers, textAnswer, attachment
                }]);

            if (error) throw error;

            // Updated student average score logic
            const { data: subs } = await supabase.from('submissions').select('score, maxMarks').eq('studentId', studentId);
            if (subs && subs.length > 0) {
                const total = subs.reduce((acc, curr) => acc + (curr.score / curr.maxMarks) * 100, 0);
                const avgScore = Math.round(total / subs.length);
                await supabase.from('students').update({ avgScore }).eq('id', studentId);
            }

            res.json({ success: true, message: "Submitted successfully" });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // 3. Get Assignments (by class)
    router.get('/', async (req, res) => {
        const { classId } = req.query;
        try {
            let query = supabase.from('assignments').select('*').order('createdAt', { ascending: false });
            if (classId) query = query.eq('classId', classId);
            const { data, error } = await query;
            if (error) throw error;
            res.json(data);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    return router;
};

export default router;
