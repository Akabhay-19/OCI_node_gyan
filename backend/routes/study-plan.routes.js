import express from 'express';
import { verifyToken } from '../middleware/auth.js';
const router = express.Router();

export const createStudyPlanRoutes = (aiService, supabase, helpers) => {
    router.use(verifyToken);
    const { generate } = aiService;
    const { getCurrentModel, getCurrentProvider, cleanText, saveModuleHistory } = helpers;

    router.post('/', async (req, res) => {
        try {
            const { topic, gradeLevel, studentId, classId } = req.body;
            console.log(`[Study Plan] Target Topic: ${topic} for Student: ${studentId}`);

            // Derive context variables
            const gradeMatch = (gradeLevel || 'Grade 10').match(/\d+/);
            const gradeNum = gradeMatch ? parseInt(gradeMatch[0], 10) : 10;
            const cognitiveLevel = gradeNum < 6 ? 'Concrete Operational' : gradeNum < 9 ? 'Early Formal Operational' : 'Formal Operational';

            const vocabStyle = gradeNum < 6
                ? 'Simple, everyday language. Use "fun" and "adventure" metaphors.'
                : gradeNum < 9
                    ? 'Clear, engaging, and semi-formal. define new terms immediately.'
                    : 'Academic, precise, and rigorous. Use domain-specific terminology.';

            const depthStyle = gradeNum < 6
                ? 'Focus on "What" and "Wow". Keep it visual and story-like.'
                : 'Focus on "How" and "Why". Connect concepts to real life.';

            const formulaStyle = gradeNum < 8
                ? 'Use words only: "Force equals push or pull"'
                : 'Use standard notation but explain it: "F = ma (Force equals mass times acceleration)"';

            const prompt = `### ROLE
            You are an expert Educational Designer specifically trained to teach ${gradeLevel} students.

            ### STUDENT CONTEXT
            - Current Grade: ${gradeLevel}
            - Cognitive Level: ${cognitiveLevel}
            - Goal: Deep mastery of "${topic}"

            ### MANDATORY STYLE RULES (STRICTLY ENFORCED)
            1. **VOCABULARY**: ${vocabStyle}
            2. **EXPLANATION DEPTH**: ${depthStyle}
            3. **FORMULA FORMAT**: ${formulaStyle}
            4. **FORMATTING**: Use **Markdown** (## headers, **bold**, - lists). Do NOT wrap in \`\`\`markdown code blocks.
            5. **CRITICAL - NO LATEX**: Do NOT use ANY LaTeX notation whatsoever. No backslash commands like \\textbf, \\nabla, \\frac, \\begin, \\tag, etc. Write all formulas in plain readable English text.

            ### TASK
            Create a comprehensive study plan for "${topic}" tailored to a ${gradeLevel} student.

            ### REQUIREMENTS
            1. **SUMMARY**: A concise overview (2-3 sentences).
            2. **DETAILED EXPLANATION**: ${gradeNum < 8 ? '400-600 words' : '800-1000 words'} covering:
               - Core concepts explained at the student's level
               - ${gradeNum < 8 ? 'Fun facts and visual analogies' : 'Historical context and advanced principles'}
               - Real-world applications relevant to the student
            3. **KEY POINTS**: ${gradeNum < 8 ? '5-6' : '8-10'} critical takeaways.
            4. **VIDEOS**: Exactly 4 YouTube video recommendations (2 English, 2 Hindi/Hinglish).
            5. **OTHER RESOURCES**: 3 text-based resources (NCERT, articles, websites).

            ### OUTPUT FORMAT (JSON)
            {
              "topic": "${topic}",
              "summary": "Brief summary",
              "detailedExplanation": "Markdown/LaTeX content tailored to ${gradeLevel}",
              "keyPoints": ["Point 1", "Point 2"],
              "resources": [
                { "title": "Video title", "searchQuery": "youtube search query", "language": "English", "whyRecommended": "reason" }
              ],
              "otherResources": [{ "title": "Resource title", "url": "URL or search query", "type": "Article/PDF/Website", "description": "brief description" }]
            }

            IMPORTANT: Return ONLY valid JSON. No markdown code blocks.`;

            const modelToUse = await getCurrentModel(supabase);
            const providerToUse = await getCurrentProvider(supabase);

            const response = await generate(prompt, {
                json: true, // Use the service's JSON handling
                model: modelToUse,
                provider: providerToUse
            });

            let planData = JSON.parse(cleanText(response.text));

            // Post-process resources to include direct search links
            // Post-process resources (Videos)
            if (planData.resources) {
                planData.resources = planData.resources.map(r => ({
                    ...r,
                    type: 'video',
                    // Use specific search query from AI, or title, or topic
                    url: `https://www.youtube.com/results?search_query=${encodeURIComponent(r.searchQuery || r.title || topic)}`
                }));
            }

            if (studentId) {
                await saveModuleHistory(supabase, studentId, 'STUDY_PLAN', topic, planData, classId);
            }

            res.json(planData);

        } catch (error) {
            console.error("[Study Plan] Generation Error:", error);
            res.status(500).json({ error: "Failed to generate study plan", details: error.message });
        }
    });

    return router;
};

export default router;
