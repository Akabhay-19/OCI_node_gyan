import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import AdaptiveLearningService from '../services/AdaptiveLearning.js';

const router = express.Router();

export const createQuizRoutes = (aiService, supabase, helpers) => {
    router.use(verifyToken);
    const { generate } = aiService;
    const { getCurrentModel, getCurrentProvider, cleanText, saveModuleHistory } = helpers;
    const adaptiveService = new AdaptiveLearningService(supabase);

    // 1. Quiz Generation
    router.post('/', async (req, res) => {
        try {
            const { topic, gradeLevel, count, difficulty, studentId, classId } = req.body;
            // Enforce 20-30 questions
            let qCount = count || 20;
            if (qCount < 20) qCount = 20;
            if (qCount > 30) qCount = 30;

            const difficultyLevel = difficulty || 'Medium';
            const prompt = `Create a multiple choice quiz about ${topic} for ${gradeLevel} level students.
            Difficulty Level: ${difficultyLevel}.
            Generate exactly ${qCount} questions.

            CRITICAL FORMATTING RULES:
            - Use ONLY plain English text. NO LaTeX, NO mathematical symbols like \\, \\textbf, \\nabla, \\frac, etc.
            - Write formulas in simple words: "Force = mass × acceleration" NOT "F = m \\cdot a"
            - For fractions, write "(a divided by b)" or "a/b"
            - For exponents, write "x squared" or "x^2"
            - Keep explanations simple and readable for students.

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

            const modelToUse = await getCurrentModel();
            const providerToUse = await getCurrentProvider();
            const response = await generate(prompt, { json: true, model: modelToUse, provider: providerToUse });
            let quizData = JSON.parse(cleanText(response.text));

            // Validate if it's an array or wrapped object
            if (!Array.isArray(quizData)) {
                if (quizData.quiz && Array.isArray(quizData.quiz)) quizData = quizData.quiz;
                else if (quizData.questions && Array.isArray(quizData.questions)) quizData = quizData.questions;
                else if (Object.values(quizData)[0] && Array.isArray(Object.values(quizData)[0])) {
                    quizData = Object.values(quizData)[0];
                }
            }

            // Auto-save to history if studentId is present
            if (studentId && Array.isArray(quizData)) {
                await saveModuleHistory(studentId, 'QUIZ', topic, quizData, classId);
            }

            res.json({
                questions: quizData,
                _meta: {
                    model: response.model,
                    provider: response.provider || providerToUse
                }
            });
        } catch (error) {
            console.error("Quiz Error:", error);
            res.status(500).json({ error: "Failed to generate quiz", details: error.message });
        }
    });

    // 2. Submit Quiz & Update Adaptive Logic
    router.post('/submit', async (req, res) => {
        try {
            const { studentId, topic, score, totalQuestions, timeTaken, idealTime, sentiment, gaps } = req.body;

            // 1. Fetch Student State
            const { data: student, error } = await supabase
                .from('students')
                .select('performanceData, weaknessHistory, avgScore')
                .eq('id', studentId)
                .single();

            if (error) throw error;

            let performanceData = student.performanceData || {};
            let weaknessHistory = student.weaknessHistory || [];

            // 2. GMI Algorithm: Update Mastery for this Topic
            const currentMastery = performanceData[topic] || { score: 0, stability: 1, lastPracticed: null };
            const interaction = {
                score,
                maxScore: totalQuestions,
                timeTaken: timeTaken || 60, // default 60s
                idealTime: idealTime || 45, // default 45s
                sentiment: sentiment || 'NEUTRAL'
            };

            const newMastery = adaptiveService.calculateMastery(currentMastery, interaction);

            // 3. PID Algorithm: Adjust Difficulty
            // We need a history of scores. Storing last 5 scores in performanceData[topic].history
            const history = currentMastery.history || [];
            history.push(score / totalQuestions);
            if (history.length > 5) history.shift(); // Keep last 5

            newMastery.history = history;
            const currentDifficulty = currentMastery.level || 'Medium';
            const newDifficulty = adaptiveService.adjustDifficulty(history, currentDifficulty);
            newMastery.level = newDifficulty;

            // 4. Update Gaps (Weakness History)
            if (gaps && Array.isArray(gaps)) {
                gaps.forEach(gap => {
                    // Check if gap already exists
                    const existingGapIdx = weaknessHistory.findIndex(w => w.atomicTopic === gap.atomicTopic);
                    if (existingGapIdx > -1) {
                        // Update existing gap
                        weaknessHistory[existingGapIdx].occurrences = (weaknessHistory[existingGapIdx].occurrences || 1) + 1;
                        weaknessHistory[existingGapIdx].lastDetected = new Date().toISOString();
                    } else {
                        // Add new gap
                        weaknessHistory.push({
                            id: Date.now() + Math.random().toString(),
                            topic: topic,
                            subTopic: gap.atomicTopic || 'General',
                            atomicTopic: gap.atomicTopic,
                            gapType: gap.gapType,
                            severity: 'HIGH', // Initial severity
                            status: 'OPEN',
                            detectedAt: new Date().toISOString(),
                            lastDetected: new Date().toISOString(),
                            occurrences: 1
                        });
                    }
                });
            }

            // Save back to DB
            performanceData[topic] = newMastery;

            await supabase
                .from('students')
                .update({
                    performanceData,
                    weaknessHistory
                })
                .eq('id', studentId);

            res.json({
                success: true,
                mastery: newMastery,
                difficulty: newDifficulty,
                message: "Adaptive Profile Updated"
            });

        } catch (err) {
            console.error("Quiz Submit Error:", err);
            res.status(500).json({ error: err.message });
        }
    });

    // 3. Get Next Best Action (Recommendations)
    router.get('/recommendations', async (req, res) => {
        try {
            const { studentId } = req.query;
            const { data: student, error } = await supabase
                .from('students')
                .select('performanceData, weaknessHistory')
                .eq('id', studentId)
                .single();

            if (error) throw error;

            const recommendations = adaptiveService.recommendActions({
                performanceData: student.performanceData || {},
                weaknessHistory: student.weaknessHistory || []
            });

            res.json(recommendations);
        } catch (err) {
            console.error("Recommendations Error:", err);
            res.status(500).json({ error: err.message });
        }
    });

    // 4. Quiz Analysis (Existing Enhanced)
    router.post('/analyze', async (req, res) => {
        try {
            const { topic, questions, userAnswers, gradeLevel, subject } = req.body;

            const gradeMatch = (gradeLevel || 'Grade 10').match(/\d+/);
            const gradeNum = gradeMatch ? parseInt(gradeMatch[0], 10) : 10;

            const vocabExample = gradeNum <= 5
                ? 'Use analogies like "Lego bricks", "building blocks", "puzzle pieces"'
                : gradeNum <= 8
                    ? 'Use analogies like "factory assembly lines", "team coordination", "recipe steps"'
                    : 'Use precise academic terminology like "molecular bonds", "systemic processes", "algorithmic steps"';

            const questionAnalysis = questions.map((q, i) => {
                const userAnswer = userAnswers[i];
                const isCorrect = userAnswer === q.correctAnswer;
                return `Q${i + 1}: "${q.question}"
                - Correct Answer: "${q.options[q.correctAnswer]}"
                - Student's Answer: "${q.options[userAnswer]}" ${isCorrect ? '✓ CORRECT' : '✗ INCORRECT'}`;
            }).join('\n\n');

            const prompt = `### ROLE: DIAGNOSTIC PEDAGOGY EXPERT
            You are a Senior Academic Diagnostician with 20+ years of experience in ${gradeLevel || 'Grade 10'} ${subject || 'Science'} education. Your specialty is identifying the ROOT CAUSE of student learning gaps, not just surface-level errors.

            ### STUDENT CONTEXT
            - Grade Level: ${gradeLevel || 'Grade 10'}
            - Subject: ${subject || 'Science'}
            - Topic Tested: "${topic}"
            - Curriculum Standard: CBSE/NCERT (India) or equivalent

            ### TASK: ATOMIC GAP ANALYSIS
            Analyze the following quiz results and perform a DEEP DIAGNOSTIC analysis.

            ### QUIZ DATA
            ${questionAnalysis}

            ### MANDATORY ANALYSIS FRAMEWORK
            1. **ATOMIC DETAIL** (Do NOT generalize)
               - ❌ BAD: "Math" or "Physics"
               - ✓ GOOD: "Single-digit carrying in addition" or "Direction of friction force on inclined planes"
               - Break down the topic into the SMALLEST possible unit of knowledge.
            2. **DISTRACTOR ANALYSIS** (For each wrong answer)
               - Why did the student pick THAT specific wrong option?
               - What MISCONCEPTION does this reveal?
               - Example: If student picked "Plants breathe in oxygen" instead of "Plants absorb CO2", the misconception is "Confusing respiration with photosynthesis".
            3. **GAP CLASSIFICATION** (Categorize each gap)
               - PROCEDURAL: Student knows the concept but made a calculation/process error.
               - FACTUAL: Student lacks specific factual knowledge.
               - CONCEPTUAL: Student has a fundamental misunderstanding of the underlying principle.
            4. **GRADE-LOCKED VOCABULARY**
               - ${vocabExample}
               - All explanations and sub-topic names must be age-appropriate for ${gradeLevel || 'Grade 10'}.
            5. **SYLLABUS ALIGNMENT**
               - Map each gap to the exact chapter/unit from ${subject || 'Science'} CBSE/NCERT curriculum where applicable.

            ### OUTPUT FORMAT (JSON)
            Return a JSON object with this EXACT structure:
            {
              "summary": {
                "totalQuestions": ${questions.length},
                "correctCount": ${questions.filter((q, i) => userAnswers[i] === q.correctAnswer).length},
                "weaknessCount": ${questions.filter((q, i) => userAnswers[i] !== q.correctAnswer).length}
              },
              "gaps": [
                {
                  "atomicTopic": "Exact sub-topic name (atomic level)",
                  "gapType": "PROCEDURAL" | "FACTUAL" | "CONCEPTUAL",
                  "misconception": "The specific wrong belief the student has",
                  "distractorChosen": "The wrong option text",
                  "whyChosen": "Explanation of why student likely picked this",
                  "syllabusReference": "NCERT Chapter X.Y or equivalent",
                  "remedialFocus": "Specific skill/fact to remediate"
                }
              ],
              "overallDiagnosis": "2-3 sentence summary of student's learning state",
              "priorityRemediation": ["Top 3 topics to focus on, in order of importance"]
            }

            ### CRITICAL RULES
            - Return ONLY valid JSON. No markdown, no code blocks.
            - EXCLUDE scores, percentages, or meta-commentary from gap names.
            - If student got everything correct, return empty "gaps" array with positive "overallDiagnosis".`;

            const response = await generate(prompt, {
                json: true,
                model: await getCurrentModel(supabase),
                provider: await getCurrentProvider(supabase)
            });

            res.json(JSON.parse(cleanText(response.text)));
        } catch (err) {
            console.error("Quiz Analyze Error:", err);
            res.status(500).json({ error: err.message });
        }
    });

    return router;
};

export default createQuizRoutes;
