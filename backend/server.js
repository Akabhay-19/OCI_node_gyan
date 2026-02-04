// Deployment trigger: 2026-02-03 20:15
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import multer from 'multer';
import { createRequire } from 'module';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import { generateToken, verifyToken, requireRole } from './middleware/auth.js';

// Import unified AI service (OpenRouter default, Gemini fallback)
import { generate, chat, getStatus as getAIStatus, Type } from './ai-service.js';
import { WebSocketServer } from 'ws';
import { handleGeminiStream } from './sockets/GeminiSocket.js';

// Import email verification service
import { sendEmailOTP, verifyEmailOTP, sendPasswordResetEmail } from './email-service.js';

// Import route modules
import { createAuthRoutes } from './routes/auth.routes.js';
import { createAIRoutes } from './routes/ai.routes.js';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

// --- Text Extraction Helpers ---

const extractTextFromPDF = async (buffer) => {
  try {
    const data = await pdfParse(buffer);
    return data.text;
  } catch (error) {
    throw new Error(`Error reading PDF: ${error.message}`);
  }
};

const extractTextFromDOCX = async (buffer) => {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } catch (error) {
    throw new Error(`Error reading DOCX: ${error.message}`);
  }
};

// --- Mindmap Prompt Generator ---
const getMindmapPrompt = (text, isTopic = false) => {
  let basePrompt = "";
  if (isTopic) {
    basePrompt = `
You are an expert educational AI helper. 
Generate a comprehensive hierarchical structure for a concept map / mind map about: "${text}"

Create a detailed mindmap covering key concepts, subtopics, and relationships.
`;
  } else {
    const truncatedText = text.slice(0, 100000);
    basePrompt = `
You are an expert educational AI helper.
Analyze the following text and generate a comprehensive, deep hierarchical concept map / mind map.

Text to analyze:
${truncatedText}
`;
  }

  return basePrompt + `
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
    {"id": "1.1", "label": "Law of Conservation of Mass"},
    {"id": "1.2", "label": "Law of Constant Proportions"}
  ],
  "edges": [
    {"id": "e1", "source": "root", "target": "1"},
    {"id": "e2", "source": "1", "target": "1.1"},
    {"id": "e3", "source": "1", "target": "1.2"}
  ]
}

IMPORTANT:
1. Return ONLY the JSON string. No markdown.
2. Ensure the JSON is valid and parsable.
`;
};




const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env.local') });
dotenv.config({ path: path.join(__dirname, '../.env') });

// Initialize Supabase for Backend
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("CRITICAL: Supabase URL or Key is missing in Backend Environment!");
}

const supabase = createClient(supabaseUrl || "", supabaseKey || "");

const app = express();

// Allow all CORS to prevent localhost connection issues
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'] }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Root Route (Development Health Check / API Root)
if (process.env.NODE_ENV !== 'production') {
  app.get('/', (req, res) => {
    res.send(`
          <div style="font-family: sans-serif; text-align: center; padding: 50px; background: #020617; color: #00f3ff;">
              <h1>Gyan Backend System</h1>
              <p>Status: <span style="color: #22c55e;">ONLINE</span></p>
              <p>Port: ${process.env.PORT || 5000}</p>
              <p>Note: Root serving frontend in production mode.</p>
          </div>
      `);
  });
}

// Server Port Configuration
const PORT = process.env.PORT || 5000;

// Serve frontend in production (Moved to end of file)
// if (process.env.NODE_ENV === 'production') { ... }


// --- AI CONFIGURATION ---
// AI service is now handled by ai-service.js
// Supports OpenRouter (default) and Gemini (fallback)

// Shared config state (for AI routes)
const configState = {
  currentProvider: process.env.AI_PROVIDER || 'openrouter',
  currentModel: process.env.OPENROUTER_DEFAULT_MODEL || 'google/gemini-2.0-flash-exp:free',
  currentAudioModel: 'gemini-2.0-flash-exp'
};

// Mount modular routes
const aiRoutes = createAIRoutes({ generate, chat, getStatus: getAIStatus }, supabase);
const authRoutes = createAuthRoutes(supabase, { sendEmailOTP, verifyEmailOTP, sendPasswordResetEmail });

app.use('/api/ai', aiRoutes);
app.use('/api/auth', authRoutes);
app.use('/api', authRoutes); // Mount /api/login at root level too

// Helper: Get current AI model from database (with fallback)
const getCurrentModel = async () => {
  try {
    const { data, error } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', 'ai_model')
      .single();

    if (error || !data) {
      return process.env.OPENROUTER_DEFAULT_MODEL || 'google/gemini-2.0-flash-exp:free';
    }
    return data.value;
  } catch (err) {
    console.error('[AI Config] Error getting model:', err);
    return process.env.OPENROUTER_DEFAULT_MODEL || 'google/gemini-2.0-flash-exp:free';
  }
};

// Multer Config for File Uploads
// Helper: Get current AI provider from database (with fallback)
const getCurrentProvider = async () => {
  try {
    const { data, error } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', 'ai_provider')
      .single();

    if (error || !data) return 'openrouter'; // Default
    return data.value;
  } catch (err) {
    console.error('[AI Config] Error getting provider:', err);
    return 'openrouter';
  }
};

// Multer Config for File Uploads
const upload = multer({ dest: 'uploads/' });

const cleanText = (text) => {
  if (!text) return "";
  // Removes markdown code blocks
  let cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();

  // Find JSON start and end
  const firstOpenBrace = cleaned.indexOf('{');
  const firstOpenBracket = cleaned.indexOf('[');

  let startIndex = -1;
  let endIndex = -1;

  // Determine if object or array starts first
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

// --- Local Teacher History (Fallback) ---
const TEACHER_HISTORY_FILE = path.join(process.cwd(), 'teacher_history.json');

const getLocalTeacherHistory = (teacherId) => {
  try {
    if (fs.existsSync(TEACHER_HISTORY_FILE)) {
      const allHistory = JSON.parse(fs.readFileSync(TEACHER_HISTORY_FILE, 'utf-8'));
      return allHistory.filter(h => h.teacherId === teacherId);
    }
  } catch (e) {
    console.error("Local history read error:", e);
  }
  return [];
};

const saveLocalTeacherHistory = (item) => {
  try {
    let history = [];
    if (fs.existsSync(TEACHER_HISTORY_FILE)) {
      history = JSON.parse(fs.readFileSync(TEACHER_HISTORY_FILE, 'utf-8'));
    }
    history.unshift({ id: 'local_' + Date.now(), ...item });
    fs.writeFileSync(TEACHER_HISTORY_FILE, JSON.stringify(history.slice(0, 200), null, 2));
  } catch (e) {
    console.error("Local history save error:", e);
  }
};

// --- Helper: Save Module History ---
const saveModuleHistory = async (studentId, type, topic, content, classId) => {
  if (!studentId) {
    console.warn("[HISTORY] Skipping save - no studentId provided");
    return;
  }

  console.log(`[HISTORY] Attempting to save: studentId=${studentId}, type=${type}, topic=${topic}, classId=${classId || 'NULL'}`);

  try {
    const payload = {
      studentId,
      type,
      topic,
      content,
      classId: classId || null,
      class_id: classId || null, // Handle potential snake_case column
      createdAt: new Date().toISOString()
    };

    console.log("[HISTORY] Payload:", JSON.stringify(payload).substring(0, 500) + "...");

    const { data, error } = await supabase.from('generated_modules').insert([payload]).select();

    if (error) {
      console.error("[HISTORY] Save FAILED:", error.message);
    } else {
      console.log("[HISTORY] Save SUCCESS! Inserted ID:", data?.[0]?.id || 'unknown');
    }
  } catch (e) {
    console.error("[HISTORY] Exception:", e.message);
  }
};

// --- Helper: Save Teacher History ---
const saveTeacherHistory = async (teacherId, type, topic, content, gradeLevel, subject) => {
  if (!teacherId) {
    console.warn("[TEACHER HISTORY] Skipping save - no teacherId provided");
    return;
  }

  const item = {
    teacherId,
    type,
    topic,
    content,
    gradeLevel,
    subject,
    createdAt: new Date().toISOString()
  };

  console.log(`[TEACHER HISTORY] Saving for ${teacherId}: ${topic}`);

  // 1. Save locally ALWAYS (as a robust backup)
  saveLocalTeacherHistory(item);

  // 2. Try Supabase
  try {
    const { error } = await supabase.from('teacher_history').insert([item]);
    if (error) {
      console.error("[TEACHER HISTORY] Supabase Error:", error.message);
    }
  } catch (e) {
    console.error("[TEACHER HISTORY] Supabase Exception:", e.message);
  }
};

// --- ROUTES ---


// Root Route (moved to avoid conflict)


app.get('/api/status', (req, res) => {
  res.send(`
        <div style="font-family: sans-serif; text-align: center; padding: 50px; background: #020617; color: #00f3ff;">
            <h1>Gyan Backend System</h1>
            <p>Status: <span style="color: #22c55e;">ONLINE</span></p>
            <p>Port: ${process.env.PORT || 5000}</p>
        </div>
    `);
});

app.get('/api/health', (req, res) => {
  const status = getAIStatus();
  res.json({
    status: 'online',
    aiProvider: status.provider,
    defaultModel: status.openrouter.defaultModel
  });
});

// --- AI MODEL MANAGEMENT ---

// --- AI MODEL MANAGEMENT ---

// Runtime configuration (mutable - changes without server restart)
let currentProvider = process.env.AI_PROVIDER || 'openrouter';
let currentModel = process.env.OPENROUTER_DEFAULT_MODEL || 'google/gemini-2.0-flash-exp:free';
let currentAudioModel = 'gemini-2.0-flash-exp'; // Default audio model

// Get current AI configuration
app.get('/api/ai/config', async (req, res) => {
  res.json({
    currentProvider,
    currentModel,
    currentAudioModel,
    availableProviders: ['openrouter', 'gemini'],
    geminiModel: 'gemini-2.0-flash-exp'
  });
});

// Set AI configuration (provider + model) - Protected Route
app.post('/api/ai/config', verifyToken, requireRole('DEVELOPER'), async (req, res) => {
  const { provider, model, audioModel } = req.body;

  if (provider && ['openrouter', 'gemini'].includes(provider)) {
    currentProvider = provider;
    console.log(`[AI Config] Provider changed to: ${provider}`);
  }

  if (model) {
    currentModel = model;
    console.log(`[AI Config] Model changed to: ${model}`);
  }

  if (audioModel) {
    currentAudioModel = audioModel;
    console.log(`[AI Config] Audio Model changed to: ${audioModel}`);
  }

  res.json({
    success: true,
    currentProvider,
    currentModel,
    currentAudioModel
  });
});

// Get available free models from OpenRouter
app.get('/api/ai/free-models', async (req, res) => {
  try {
    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
    if (!OPENROUTER_API_KEY) {
      return res.json({ models: [], error: 'OpenRouter API key not configured' });
    }

    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: { 'Authorization': `Bearer ${OPENROUTER_API_KEY}` }
    });

    if (!response.ok) {
      return res.json({ models: [], error: 'Failed to fetch models from OpenRouter' });
    }

    const data = await response.json();

    // Filter to free models only (pricing.prompt === "0" or very cheap)
    const freeModels = data.data
      .filter(m => {
        const promptCost = parseFloat(m.pricing?.prompt || '999');
        return promptCost === 0 || m.id.includes(':free');
      })
      .map(m => ({
        id: m.id,
        name: m.name,
        context: m.context_length,
        provider: m.id.split('/')[0]
      }))
      .slice(0, 50); // Limit to 50 models

    res.json({
      models: freeModels,
      totalFree: freeModels.length
    });
  } catch (error) {
    console.error('Free models fetch error:', error);
    res.json({ models: [], error: error.message });
  }
});

// Legacy endpoints for backwards compatibility
app.get('/api/ai/models', async (req, res) => {
  const models = currentProvider === 'gemini'
    ? [{ id: 'gemini-2.0-flash-exp', name: 'Gemini 2.5 (Flash)', provider: 'Google', free: true }]
    : [{ id: currentModel, name: currentModel, provider: 'OpenRouter', free: true }];

  res.json({
    currentModel,
    currentProvider,
    availableModels: models,
    totalModels: models.length
  });
});

app.post('/api/ai/models', async (req, res) => {
  const { model } = req.body;
  if (model) currentModel = model;
  res.json({ success: true, currentModel });
});

app.get('/api/ai/status', async (req, res) => {
  res.json({
    ...getAIStatus(),
    currentProvider,
    currentModel
  });
});

// Developer Console Login
app.post('/api/auth/dev-login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const { data: user, error } = await supabase
      .from('system_users')
      .select('*')
      .eq('email', email)
      .eq('role', 'DEVELOPER')
      .single();

    if (error || !user) {
      console.warn(`[Dev Auth] Login failed: User ${email} not found or role mismatch.`);
      return res.status(401).json({ error: 'Invalid Developer Credentials' });
    }

    console.log(`[Dev Auth] User found: ${email}. Verifying password...`);
    const isValid = await bcrypt.compare(password, user.password_hash);

    if (isValid) {
      // Generate JWT token
      const token = generateToken({
        id: user.id,
        email: user.email,
        role: user.role
      });
      res.json({ success: true, token });
    } else {
      res.status(401).json({ error: 'Invalid Developer Credentials' });
    }
  } catch (err) {
    console.error('Dev Auth Error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Auth
app.post('/api/login', async (req, res) => {
  const { username, password, email, role, asParent } = req.body;

  try {
    if (role === 'STUDENT' || (role === 'PARENT' && asParent)) {
      console.log(`[Login] Attempting Student login for: ${username}`);
      const { data: students, error } = await supabase
        .from('students')
        .select('*')
        .or(`username.eq.${username},mobileNumber.eq.${username},id.eq.${username},email.eq.${username}`)
        .eq('password', password);

      if (error) throw error;
      if (!students || students.length === 0) return res.status(401).json({ error: "Invalid credentials" });

      const student = students[0];
      // Keep JSON parsing for compatibility if needed, though Supabase returns objects for JSON columns automatically
      // But based on migration, they might come as objects already. Safe check:
      /* 
         Supabase automatically parses JSONB columns into JS Objects.
         However, our frontend expects these to be present.
      */

      if (asParent) {
        res.json({ ...student, loginAsParent: true });
      } else {
        res.json(student);
      }

    } else if (role === 'TEACHER') {
      console.log(`[Login] Attempting Teacher login for: ${email}`);
      const { data: teachers, error } = await supabase
        .from('teachers')
        .select('*')
        .or(`email.eq.${email},mobileNumber.eq.${email}`)
        .eq('password', password);

      if (error) throw error;
      if (!teachers || teachers.length === 0) return res.status(401).json({ error: "Invalid credentials" });

      res.json(teachers[0]);

    } else if (role === 'ADMIN') {
      console.log(`[Login] Attempting Admin login for: ${email}`);
      const { data: schools, error } = await supabase
        .from('schools')
        .select('*')
        .eq('adminEmail', email)
        .eq('password', password); // Verify password

      if (error) {
        console.error("[Login] Admin DB Error:", error);
        throw error;
      }
      if (!schools || schools.length === 0) {
        console.warn(`[Login] Admin login failed for ${email}: No school found or wrong password.`);
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const school = schools[0];
      console.log(`[Login] Admin login success: ${school.name}`);
      res.json({ id: school.id, name: school.name, email: school.adminEmail, role: 'ADMIN', schoolId: school.id });
    } else {
      console.warn(`[Login] Invalid role attempted: ${role}`);
      res.status(400).json({ error: "Invalid role" });
    }
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// 1. Quiz Generation
app.post('/api/quiz', async (req, res) => {
  try {
    const { topic, gradeLevel, count, difficulty } = req.body;
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
    
    IMPORTANT:
    1. Return ONLY valid JSON.
    2. Escape all double quotes inside strings (e.g., \\").
    3. Escape all newlines in strings as \\\\n.
    4. Do NOT output trailing commas.`;

    const modelToUse = await getCurrentModel();
    const providerToUse = await getCurrentProvider();
    const response = await generate(prompt, { json: true, model: modelToUse, provider: providerToUse });
    let quizData = JSON.parse(cleanText(response.text));

    // Validate if it's an array or wrapped object
    if (!Array.isArray(quizData)) {
      if (quizData.quiz && Array.isArray(quizData.quiz)) quizData = quizData.quiz;
      else if (quizData.questions && Array.isArray(quizData.questions)) quizData = quizData.questions;
      else if (Object.values(quizData)[0] && Array.isArray(Object.values(quizData)[0])) {
        // Fallback: take the first array found in values
        quizData = Object.values(quizData)[0];
      }
    }

    // Auto-save to history if studentId is present
    if (req.body.studentId && Array.isArray(quizData)) {
      await saveModuleHistory(req.body.studentId, 'QUIZ', topic, quizData, req.body.classId);
    }

    // Include model info in response
    res.json({
      questions: quizData,
      _meta: {
        model: response.model || currentModel,
        provider: response.provider || 'openrouter'
      }
    });
  } catch (error) {
    console.error("Quiz Error:", error);
    res.status(500).json({ error: "Failed to generate quiz", details: error.message });
  }
});

// 2. Study Plan
app.post('/api/study-plan', async (req, res) => {
  try {
    const { topic, gradeLevel, studentId, classId } = req.body;
    console.log(`[STUDY-PLAN] Received: topic=${topic}, studentId=${studentId}, classId=${classId || 'NULL'}`);

    // Parse grade number for conditional logic
    const gradeMatch = (gradeLevel || '').match(/\d+/);
    const gradeNum = gradeMatch ? parseInt(gradeMatch[0], 10) : 10;

    // Determine cognitive level and style based on grade
    const cognitiveLevel = gradeNum < 8 ? 'Concrete Operational (visual, experiential)' : 'Formal Operational (abstract, analytical)';
    const vocabStyle = gradeNum < 8 ? 'simple, everyday language. Avoid jargon.' : 'precise academic vocabulary appropriate for high school.';
    const depthStyle = gradeNum < 8
      ? 'Focus on visual concepts, simple experiments, relatable analogies, and "big picture" ideas. Keep explanations concise and engaging.'
      : 'Include specific scientific laws, mathematical derivations, proofs, and industrial/real-world applications. Be thorough and detailed.';
    const formulaStyle = gradeNum < 8
      ? 'Use simple formulas written in plain text, like "speed = distance / time" or "Force = mass × acceleration". Keep it simple.'
      : 'Use clear formulas in readable format, like "velocity = change in distance / change in time" or "Force = mass × acceleration". You may use simple notation like "x^2" for squares.';

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
  "topic": "Topic name",
  "summary": "Brief summary",
  "detailedExplanation": "Markdown content with \\\\n for newlines. DO NOT use unescaped newlines.",
  "keyPoints": ["Point 1", "Point 2"],
  "resources": [
    { "title": "Video title", "searchQuery": "youtube search query", "language": "English", "whyRecommended": "reason" }
  ],
  "otherResources": [{ "title": "Resource title", "url": "URL or search query", "type": "Article/PDF/Website", "description": "brief description" }]
}

IMPORTANT:
1. Return ONLY valid JSON.
2. Escape all double quotes inside strings (e.g., \\").
3. Escape all newlines in strings as \\\\n.
4. Do NOT output trailing commas.`;

    const modelToUse = await getCurrentModel();
    const providerToUse = await getCurrentProvider();
    const response = await generate(prompt, { json: true, model: modelToUse, provider: providerToUse, maxTokens: 8192 });
    const data = JSON.parse(cleanText(response.text));

    // Post-process to add valid URLs for videos
    if (data.resources) {
      data.resources = data.resources.map(r => ({
        ...r,
        url: `https://www.youtube.com/results?search_query=${encodeURIComponent(r.searchQuery || r.title + ' ' + (r.language || '') + ' tutorial')}`
      }));
    }

    // Post-process other resources
    if (data.otherResources) {
      data.otherResources = data.otherResources.map(r => ({
        ...r,
        url: (r.url && r.url.startsWith('http')) ? r.url : `https://www.google.com/search?q=${encodeURIComponent(r.title + ' ' + topic + ' article')}`
      }));
    }

    if (req.body.studentId) {
      await saveModuleHistory(req.body.studentId, 'STUDY_PLAN', topic, data, req.body.classId);
    }

    // Add model info to response
    res.json({
      ...data,
      _meta: {
        model: response.model || currentModel,
        provider: response.provider || 'openrouter'
      }
    });
  } catch (error) {
    console.error("Study Plan Error:", error.message);
    console.error("Stack:", error.stack);
    res.status(500).json({ error: "Failed to generate plan", details: error.message });
  }
});

// 3. Story Mode
app.post('/api/story', async (req, res) => {
  try {
    const { topic, subject, gradeLevel, language } = req.body;
    const prompt = `Write an educational story explaining "${topic}" in the subject of "${subject}" for a ${gradeLevel} student.
    
    LANGUAGE REQUIREMENT: Write the story primarily in "${language}".
    
    CRITICAL FORMATTING RULES:
    - NO LaTeX, NO mathematical symbols like \\, \\textbf, \\nabla, \\frac, etc.
    - Write any formulas in simple words: "Energy equals mass times the speed of light squared"
    - Make it engaging, readable, and age-appropriate.
    
    Return JSON: 
    {
      "title": "Story title (in ${language})", 
      "story": "Full story text in ${language}", 
      "genre": "Genre", 
      "keyConcepts": ["concept1", "concept2"]
    }
    
    IMPORTANT: 
    1. Return ONLY valid JSON.
    2. Escape all double quotes inside strings (e.g., \\").
    3. Escape all newlines in strings as \\\\n.`;

    const response = await generate(prompt, { json: true, model: await getCurrentModel(), provider: await getCurrentProvider() });
    const storyData = JSON.parse(cleanText(response.text));

    if (req.body.studentId) {
      await saveModuleHistory(req.body.studentId, 'STORY', topic, storyData, req.body.classId);
    }

    // Add model info to response
    res.json({
      ...storyData,
      _meta: {
        model: response.model || currentModel,
        provider: response.provider || 'openrouter'
      }
    });
  } catch (error) {
    console.error("Story Error:", error);
    res.status(500).json({ error: "Failed to generate story" });
  }
});

// 4. Assignment Generator
app.post('/api/assignment', async (req, res) => {
  try {
    // Enforce 20-30 questions
    const { topic, questionCount, type, studentId, classId, gradeLevel, subject, difficulty } = req.body;
    let qCount = questionCount || 20;
    if (qCount < 20) qCount = 20;
    if (qCount > 30) qCount = 30;

    // Build type-specific instructions
    let typeInstructions = '';
    let questionFormat = '';

    if (type === 'MCQ' || type === 'Quiz') {
      typeInstructions = `Generate exactly ${qCount} MULTIPLE CHOICE questions. Each question MUST have exactly 4 options and a correctAnswer index (0-3).`;
      questionFormat = `{ 
        "question": "Question text in plain English", 
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correctAnswer": 0,
        "explanation": "Why this is the correct answer",
        "marks": 2 
      }`;
    } else if (type === 'SUBJECTIVE') {
      typeInstructions = `Generate exactly ${qCount} SUBJECTIVE/ESSAY questions. These are open-ended questions that require written answers. Do NOT include options.`;
      questionFormat = `{ 
        "question": "Question text in plain English (open-ended)", 
        "marks": 2,
        "sampleAnswer": "A brief model answer" 
      }`;
    } else if (type === 'MIXED') {
      const mcqCount = Math.ceil(qCount / 2);
      const subjCount = qCount - mcqCount;
      typeInstructions = `Generate ${mcqCount} MULTIPLE CHOICE questions (with options) and ${subjCount} SUBJECTIVE questions (without options, open-ended).
      - MCQ questions MUST have "options" array and "correctAnswer" index.
      - SUBJECTIVE questions should NOT have options, only the question text.`;
      questionFormat = `For MCQ: { "question": "...", "options": ["A", "B", "C", "D"], "correctAnswer": 0, "explanation": "...", "marks": 2 }
      For SUBJECTIVE: { "question": "...", "marks": 2, "sampleAnswer": "..." }`;
    } else {
      // Default to MCQ if type unknown
      typeInstructions = `Generate exactly ${qCount} MULTIPLE CHOICE questions with 4 options each.`;
      questionFormat = `{ "question": "...", "options": ["A", "B", "C", "D"], "correctAnswer": 0, "explanation": "...", "marks": 2 }`;
    }

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

    const response = await generate(prompt, { json: true, model: await getCurrentModel(), provider: await getCurrentProvider() });
    const assignmentData = JSON.parse(cleanText(response.text));

    if (req.body.studentId) {
      await saveModuleHistory(req.body.studentId, 'ASSIGNMENT', topic, assignmentData, req.body.classId);
    }

    res.json({
      ...assignmentData,
      _meta: {
        model: response.model || currentModel,
        provider: response.provider || 'openrouter'
      }
    });
  } catch (error) {
    console.error("Assignment Error:", error);
    res.status(500).json({ error: "Failed to generate assignment" });
  }
});

// 8. Remedial Content with Caching
app.post('/api/remedial', async (req, res) => {
  try {
    const { topic, gradeLevel, subject, gapId, studentId } = req.body;

    // [NEW] Check cache first if gapId is provided
    if (gapId && studentId) {
      try {
        const { data: cachedGap } = await supabase
          .from('learning_gaps')
          .select('cached_explanation, cached_questions')
          .eq('id', gapId)
          .single();

        if (cachedGap?.cached_explanation && cachedGap?.cached_questions) {
          console.log(`[REMEDIAL CACHE] Serving cached content for gap ${gapId}`);
          return res.json({
            topic: topic,
            explanation: cachedGap.cached_explanation,
            practiceQuestions: cachedGap.cached_questions,
            _meta: {
              cached: true,
              model: 'cached',
              provider: 'cache'
            }
          });
        }
      } catch (cacheErr) {
        console.warn('[REMEDIAL CACHE] Cache lookup failed, generating fresh:', cacheErr.message);
      }
    }

    // Generate fresh content
    const contextPhrase = subject && subject !== 'General' ? `in the context of ${subject}` : '';
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

    console.log(`[REMEDIAL] Generating for topic = "${topic}", subject = "${subject}", grade = "${gradeLevel}"`);

    const response = await generate(prompt, {
      json: true,
      model: await getCurrentModel(), provider: await getCurrentProvider(),
      provider: currentProvider
    });
    const data = JSON.parse(cleanText(response.text));

    console.log(`[REMEDIAL] Generated - Explanation length: ${data.explanation?.length || 0} chars`);
    console.log(`[REMEDIAL] Generated - Questions count: ${data.practiceQuestions?.length || 0} `);

    // [NEW] Cache the generated content if gapId is provided
    if (gapId) {
      try {
        await supabase
          .from('learning_gaps')
          .update({
            cached_explanation: data.explanation,
            cached_questions: data.practiceQuestions
          })
          .eq('id', gapId);
        console.log(`[REMEDIAL CACHE] Stored content for gap ${gapId}`);
      } catch (cacheErr) {
        console.warn('[REMEDIAL CACHE] Failed to store in cache:', cacheErr.message);
      }
    }

    res.json({
      ...data,
      _meta: {
        cached: false,
        model: response.model || currentModel,
        provider: response.provider || 'openrouter'
      }
    });
  } catch (error) {
    console.error("Remedial Error:", error);
    res.status(500).json({ error: "Failed to generate remedial content" });
  }
});

// 9. Teacher Lesson Plan Generator
app.post('/api/teacher/lesson-plan', async (req, res) => {
  try {
    const { topic, subject, gradeLevel, depth, duration } = req.body;

    const prompt = `
    ROLE: You are an Expert Education Advisor and Curriculum Architect with 15-20 years of experience in pedagogy and instructional design. 
    You excel at creating engaging, high-impact lesson plans that cater to diverse learning styles while ensuring deep conceptual understanding.

    TASK: Create a detailed, engaging lesson plan for a ${duration || '60 minute'} class.
    
    TOPIC: ${topic}
    SUBJECT: ${subject}
    GRADE: ${gradeLevel}
    DEPTH: ${depth || 'Standard curriculum depth'}

    OUTPUT FORMAT: Markdown (clean, structured, ready to render).

    STRUCTURE:
    # Lesson Plan: [Topic Name]
    
    ## 🎯 Learning Objectives
    - [Objective 1]
    - [Objective 2]
    
    ## ⏱️ Lesson Flow
    1. **Hook / Warm-up (5 mins):** [Activity]
    2. **Core Concept Delivery (20 mins):** [Explanation strategies]
    3. **Guided Practice (15 mins):** [Activity]
    4. **Independent Application (15 mins):** [Activity]
    5. **Closure (5 mins):** [Wrap up]

    ## 🗝️ Key Concepts & Definitions
    - **[Concept 1]:** Definition
    
    ## 💡 Teacher Tips / Common Misconceptions
    - [Tip 1]

    ## 📝 Assessment / Checks for Understanding
    - [Question 1]
    - [Question 2]

    Style: Professional, encouraging, and practical for immediate classroom use.
    DO NOT wrap in a code block. Return raw markdown text.
    `;

    const response = await generate(prompt, {
      json: false
    });

    const lessonPlanMarkdown = response.text; // Text is already markdown

    // Save to history if teacherId provided
    const teacherId = req.body.teacherId;
    if (teacherId) {
      await saveTeacherHistory(teacherId, 'LESSON_PLAN', topic, lessonPlanMarkdown, gradeLevel, subject);
    }

    res.json({
      markdown: lessonPlanMarkdown,
      _meta: {
        model: response.model,
        provider: response.provider || 'openrouter'
      }
    });

  } catch (error) {
    console.error("Lesson Plan Gen Error:", error);
    res.status(500).json({ error: "Failed to generate lesson plan" });
  }
});

// 10. Teacher Presentation Generator
app.post('/api/teacher/presentation', async (req, res) => {
  try {
    const { topic, description, gradeLevel, teacherId, subject } = req.body;

    const prompt = `
    ROLE: You are an expert Visual Content Creator and Educational Designer with 15 years of experience in pedagogical visualizations.
    TASK: Create a high-quality, eye-catchy, and detailed presentation structure for a class.
    
    TOPIC: ${topic}
    GRADE: ${gradeLevel}
    SUBJECT: ${subject || 'General Education'}
    ADDITIONAL INFO: ${description || 'Standard curriculum depth'}

    OUTPUT FORMAT: Strictly valid JSON array of slide objects.
    
    JSON SCHEMA FOR EACH SLIDE:
    {
      "title": "Concise Slide Title",
      "content": ["Engaging bullet point 1", "Engaging bullet point 2", "Engaging bullet point 3"],
      "footer": "Short key takeaway or transition prompt",
      "visualSuggestion": "Visual description for the teacher (e.g., 'Diagram showing the water cycle', 'Close-up image of a leaf cell')"
    }

    SLIDE COUNT: 8-12 slides.
    
    SLIDE PROGRESSION:
    1. Title Slide
    2. Hook / Engagement Activity
    3. Learning Objectives (What will students learn?)
    4-10. Core Concepts (Break topics into small, high-impact digestible chunks)
    11. Summary / Quick Recap
    12. Q&A / Closing Activity

    CRITICAL RULES:
    1. Return ONLY a valid JSON array. No markdown code blocks, no preamble.
    2. Each bullet point should be professional yet accessible.
    3. Ensure the content is "Visual-First" — focused on what the teacher explains, not walls of text.
    `;

    console.log(`[PRESENTATION] Generating for: ${topic}`);

    const response = await generate(prompt, {
      json: true
    });

    console.log(`[PRESENTATION] Raw AI Response Type: ${typeof response.text}`);
    // console.log(`[PRESENTATION] Raw AI Response: ${response.text.substring(0, 500)}...`);

    let slides = [];
    try {
      const cleanResponse = cleanText(response.text);
      slides = JSON.parse(cleanResponse);
    } catch (parseError) {
      console.error("[PRESENTATION] JSON Parse Failed. Trying secondary clean...", parseError.message);
      try {
        // Fallback: try to find the first [ and last ]
        const start = response.text.indexOf('[');
        const end = response.text.lastIndexOf(']') + 1;
        if (start !== -1 && end !== -1) {
          const fallbackClean = response.text.substring(start, end);
          slides = JSON.parse(fallbackClean);
        } else {
          throw new Error("Could not find JSON array in response");
        }
      } catch (fError) {
        console.error("[PRESENTATION] Secondary Parse also FAILED:", fError.message);
        throw new Error("AI returned malformed data format");
      }
    }

    console.log(`[PRESENTATION] Successfully parsed ${slides.length} slides`);

    // Save to history if teacherId provided
    if (teacherId) {
      await saveTeacherHistory(teacherId, 'PRESENTATION', topic, slides, gradeLevel, subject);
    }

    res.json({
      slides,
      _meta: {
        model: response.model,
        provider: response.provider || 'openrouter'
      }
    });

  } catch (error) {
    console.error("Presentation Gen Error:", error);
    res.status(500).json({ error: "Failed to generate presentation" });
  }
});

// GET Teacher History
app.get('/api/teachers/:teacherId/history', async (req, res) => {
  const { teacherId } = req.params;
  try {
    // 1. Try Supabase first
    const { data, error } = await supabase
      .from('teacher_history')
      .select('*')
      .eq('teacherId', teacherId)
      .order('createdAt', { ascending: false });

    if (!error && data && data.length > 0) {
      return res.json(data);
    }

    // 2. Fallback to local if Supabase is empty or errors
    console.log(`[TEACHER HISTORY] Falling back to local for ${teacherId}`);
    const localData = getLocalTeacherHistory(teacherId);
    res.json(localData);

  } catch (err) {
    console.error("Teacher History Fetch Error:", err);
    // Even on error, return local
    const localData = getLocalTeacherHistory(teacherId);
    res.json(localData);
  }
});

// 5. Chat Interface
app.post('/api/chat', async (req, res) => {
  try {
    const { message, history } = req.body;
    // Add current message to history
    const messages = [...(history || []), {
      role: 'user',
      text: message + "\n\n(IMPORTANT: Use ONLY plain English text in your response. Do NOT use any LaTeX notation or mathematical symbols like \\textbf, \\nabla, \\frac, etc. Write formulas in simple readable words like 'Force = mass times acceleration'. Keep explanations clear and easy to understand.)"
    }];

    const result = await chat(messages, { model: await getCurrentModel(), provider: await getCurrentProvider() });
    res.json({
      text: result.text,
      _meta: {
        model: result.model || currentModel,
        provider: result.provider || 'openrouter'
      }
    });

  } catch (error) {
    console.error("Chat Error:", error);
    res.status(500).json({ error: "Chat failed", details: error.message });
  }
});


// 7. Quiz Analysis - Diagnostic Pedagogy Framework
app.post('/api/analyze-quiz', async (req, res) => {
  try {
    const { topic, questions, userAnswers, gradeLevel, subject } = req.body;

    // Parse grade for vocabulary calibration
    const gradeMatch = (gradeLevel || 'Grade 10').match(/\d+/);
    const gradeNum = gradeMatch ? parseInt(gradeMatch[0], 10) : 10;

    // Vocabulary examples for grade-locking
    const vocabExample = gradeNum <= 5
      ? 'Use analogies like "Lego bricks", "building blocks", "puzzle pieces"'
      : gradeNum <= 8
        ? 'Use analogies like "factory assembly lines", "team coordination", "recipe steps"'
        : 'Use precise academic terminology like "molecular bonds", "systemic processes", "algorithmic steps"';

    // Build question analysis with wrong answer tracking
    const questionAnalysis = questions.map((q, i) => {
      const userAnswer = userAnswers[i];
      const isCorrect = userAnswer === q.correctAnswer;
      return `Q${i + 1}: "${q.question}"
      - Correct Answer: "${q.options[q.correctAnswer]}"
        - Student's Answer: "${q.options[userAnswer]}" ${isCorrect ? '✓ CORRECT' : '✗ INCORRECT'}
          - All Options: ${q.options.map((opt, idx) => `[${idx}] ${opt}`).join(' | ')} `;
    }).join('\n\n');

    const prompt = `### ROLE: DIAGNOSTIC PEDAGOGY EXPERT
You are a Senior Academic Diagnostician with 20 + years of experience in ${gradeLevel || 'Grade 10'} ${subject || 'Science'} education.Your specialty is identifying the ROOT CAUSE of student learning gaps, not just surface - level errors.

### STUDENT CONTEXT
      - Grade Level: ${gradeLevel || 'Grade 10'}
    - Subject: ${subject || 'Science'}
    - Topic Tested: "${topic}"
      - Curriculum Standard: CBSE / NCERT(India) or equivalent

### TASK: ATOMIC GAP ANALYSIS
Analyze the following quiz results and perform a DEEP DIAGNOSTIC analysis.

### QUIZ DATA
${questionAnalysis}

### MANDATORY ANALYSIS FRAMEWORK

    1. ** ATOMIC DETAIL ** (Do NOT generalize)
  - ❌ BAD: "Math" or "Physics"
    - ✓ GOOD: "Single-digit carrying in addition" or "Direction of friction force on inclined planes"
      - Break down the topic into the SMALLEST possible unit of knowledge.

2. ** DISTRACTOR ANALYSIS ** (For each wrong answer)
- Why did the student pick THAT specific wrong option ?
  - What MISCONCEPTION does this reveal ?
    - Example : If student picked "Plants breathe in oxygen" instead of "Plants absorb CO2", the misconception is "Confusing respiration with photosynthesis".

3. ** GAP CLASSIFICATION ** (Categorize each gap)
- PROCEDURAL: Student knows the concept but made a calculation / process error.
   - FACTUAL: Student lacks specific factual knowledge.
   - CONCEPTUAL: Student has a fundamental misunderstanding of the underlying principle.

4. ** GRADE - LOCKED VOCABULARY **
  - ${vocabExample}
- All explanations and sub - topic names must be age - appropriate for ${gradeLevel || 'Grade 10'}.

5. ** SYLLABUS ALIGNMENT **
  - Map each gap to the exact chapter / unit from ${subject || 'Science'} CBSE / NCERT curriculum where applicable.

### OUTPUT FORMAT(JSON)
Return a JSON object with this EXACT structure:
{
  "summary": {
    "totalQuestions": ${questions.length},
    "correctCount": <number>,
      "weaknessCount": <number>
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

    const response = await generate(prompt, { json: true, model: await getCurrentModel(), provider: await getCurrentProvider(), maxTokens: 4096 });
    const analysisData = JSON.parse(cleanText(response.text));

    // Extract simple weak concepts array for backwards compatibility
    const weakConcepts = (analysisData.gaps || []).map(g => g.atomicTopic);

    res.json({
      weakConcepts, // Backwards compatible
      diagnosticReport: analysisData, // Full diagnostic data
      _meta: {
        model: response.model || currentModel,
        provider: response.provider || 'openrouter'
      }
    });

  } catch (error) {
    console.error("Quiz Analysis Error:", error);
    res.status(500).json({ error: "Failed to analyze results" });
  }
});

// 8. Opportunity Finder [NEW]
// 8. Opportunity Finder [NEW]
app.post('/api/opportunities/find', async (req, res) => {
  try {
    const { interest = 'Academic', region = 'Global', gradeLevel, type } = req.body;
    const today = new Date().toISOString().split('T')[0];

    // 1. Try to fetch existing non-expired opportunities from DB
    // Sorted by created_at DESC to show "Newly Launched" on top
    const { data: existing, error: dbError } = await supabase
      .from('opportunities')
      .select('*')
      .eq('grade_level', gradeLevel)
      .eq('region', region)
      .eq('interest', interest)
      .eq('type', type)
      .gte('deadline', today)
      .order('created_at', { ascending: false });

    if (!dbError && existing && existing.length >= 3) {
      console.log(`[OPPORTUNITIES] Found ${existing.length} cached opportunities for ${gradeLevel}`);
      return res.json({
        opportunities: existing,
        _meta: { source: 'database' }
      });
    }

    // 2. Fallback to AI if no fresh results in DB
    const prompt = `List 5 active or upcoming ${type || 'competitions and scholarships'} for ${gradeLevel || 'High School'} students in 2025/2026 related to "${interest}".
        Focus on opportunities relevant to: ${region}.

        CRITICAL FILTERING RULES:
        1. STRICTLY EXCLUDE opportunities that are NOT for ${gradeLevel}.
        2. EXCLUDE opportunities that have already passed (Current date: ${today}).
        3. If no opportunities are found specifically for ${gradeLevel}, return an empty array []. DO NOT hallucinate.

        Return a strictly valid JSON array of objects with this schema:
        {
          "title": "string",
          "type": "SCHOLARSHIP" | "COMPETITION" | "OLYMPIAD",
          "organization": "string",
          "deadline": "YYYY-MM-DD",
          "reward": "string",
          "description": "string (brief summary)",
          "tags": ["string"],
          "link": "string (Official URL. If unknown, leave empty string '')",
          "searchQuery": "string (Google search query to find this opportunity)"
        }
        Ensure the data looks realistic and high quality.`;

    const response = await generate(prompt, { json: true, model: await getCurrentModel(), provider: await getCurrentProvider() });
    let aiOpportunities = [];
    try {
      const parsed = JSON.parse(cleanText(response.text));
      aiOpportunities = Array.isArray(parsed) ? parsed : (parsed.opportunities || []);
    } catch (e) {
      console.error("[OPPORTUNITIES] AI Parse Error:", e);
    }

    // 3. Save new AI results to DB & handle links
    const toInsert = aiOpportunities.map(opp => ({
      ...opp,
      grade_level: gradeLevel,
      region: region,
      interest: interest,
      link: (opp.link && opp.link.startsWith('http')) ? opp.link : `https://www.google.com/search?q=${encodeURIComponent(opp.searchQuery || opp.title + ' application')}`
    }));

    if (toInsert.length > 0) {
      const { error: insertError } = await supabase.from('opportunities').insert(toInsert);
      if (insertError) console.error("[OPPORTUNITIES] DB Insert Error:", insertError.message);
    }

    // 4. Return combined fresh results (re-fetching from DB ensures correct sorting and IDs)
    const { data: finalResults } = await supabase
      .from('opportunities')
      .select('*')
      .eq('grade_level', gradeLevel)
      .eq('region', region)
      .eq('interest', interest)
      .eq('type', type)
      .gte('deadline', today)
      .order('created_at', { ascending: false });

    const formatted = (finalResults || toInsert).map(opp => ({
      id: opp.id,
      title: opp.title,
      type: opp.type,
      organization: opp.organization,
      deadline: opp.deadline,
      reward: opp.reward,
      description: opp.description,
      tags: opp.tags,
      link: opp.link,
      searchQuery: opp.search_query || opp.searchQuery,
      gradeLevel: opp.grade_level || opp.gradeLevel,
      region: opp.region || opp.region,
      interest: opp.interest || opp.interest,
      createdAt: opp.created_at || opp.createdAt
    }));

    res.json({
      opportunities: formatted,
      _meta: { model: await getCurrentModel(), provider: await getCurrentProvider(), source: existing ? 'database' : 'ai+db' }
    });

    // 5. Cleanup: Periodically delete expired opportunities (optional background task)
    // For now, the .gte('deadline', today) handles visibility automatically.

  } catch (error) {
    console.error("Opportunity Finder Error:", error);
    res.status(500).json({ error: "Failed to find opportunities" });
  }
});


// 6. Flashcard Generator
app.post('/api/flashcards', async (req, res) => {
  try {
    const { topic, gradeLevel, count, studentId, classId } = req.body;

    // Enforce 5-30 flashcards
    let fCount = count || 10;
    if (fCount < 5) fCount = 5;
    if (fCount > 30) fCount = 30;

    const prompt = `Create a set of ${fCount} study flashcards about "${topic}" for a ${gradeLevel || 'Grade 10'} student.
        Each flashcard should have a 'front' (term/question) and 'back' (definition/answer). Keep the 'back' concise.

        CRITICAL FORMATTING RULES:
        - Use ONLY plain English text. NO LaTeX, NO mathematical symbols like \\, \\textbf, \\nabla, \\frac, etc.
        - Write formulas in simple words: "Force = mass × acceleration" NOT "F = m \\cdot a"
        - Keep answers clear, concise, and easy to memorize.
        
        Return JSON array:
        [
          {
            "front": "Question/term in plain English",
            "back": "Answer/definition in plain English"
          }
        ]

        IMPORTANT:
        1. Return ONLY valid JSON.
        2. Escape all double quotes inside strings (e.g., \\").
        3. Escape all newlines in strings as \\\\n.
        4. Do NOT output trailing commas.`;

    const response = await generate(prompt, { json: true, model: await getCurrentModel(), provider: await getCurrentProvider() });
    let flashcards = JSON.parse(cleanText(response.text));

    // Normalize response: if AI returned {flashcards: [...] }, extract the array
    if (!Array.isArray(flashcards) && flashcards.flashcards) {
      flashcards = flashcards.flashcards;
    }

    // Safety check
    if (!Array.isArray(flashcards)) {
      console.error("AI returned invalid structure:", flashcards);
      throw new Error("AI failed to generate a valid list of flashcards");
    }

    if (studentId) {
      await saveModuleHistory(studentId, 'FLASHCARDS', topic, flashcards, classId);
    }

    // Add model info to response
    res.json({
      flashcards: flashcards,
      _meta: {
        model: response.model || currentModel,
        provider: response.provider || 'openrouter'
      }
    });
  } catch (error) {
    console.error("Flashcards Error:", error);
    res.status(500).json({ error: "Failed to generate flashcards" });
  }
});

// 7. Generic Save Module History (for client-side generation)
app.post('/api/save-module-history', async (req, res) => {
  const { studentId, type, topic, count } = req.body;
  console.log(`[API] Saving history for ${studentId} (${type}: ${topic})`);
  console.log(`[API] Payload size: ${JSON.stringify(req.body).length} chars`);
  try {
    await saveModuleHistory(studentId, type, topic, req.body.content);
    console.log("[API] History saved successfully.");
    res.json({ message: "Saved" });
  } catch (e) {
    console.error("[API] Save History Failed:", e);
    res.status(500).json({ error: e.message });
  }
});

// 8. Mindmap Generator (Node.js Port)
app.post('/api/generate-mindmap', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ detail: "No file uploaded" });
    }

    const buffer = fs.readFileSync(req.file.path);
    let text = "";

    if (req.file.mimetype === 'application/pdf' || req.file.originalname.endsWith('.pdf')) {
      text = await extractTextFromPDF(buffer);
    } else if (req.file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || req.file.originalname.endsWith('.docx')) {
      text = await extractTextFromDOCX(buffer);
    } else if (req.file.mimetype === 'text/plain' || req.file.originalname.endsWith('.txt')) {
      text = buffer.toString('utf-8');
    } else {
      // Cleanup
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ detail: "Unsupported file type" });
    }

    // Cleanup uploaded file
    fs.unlinkSync(req.file.path);

    if (!text.trim()) {
      return res.status(400).json({ detail: "Could not extract text from file" });
    }

    const prompt = getMindmapPrompt(text, false);

    const response = await generate(prompt, { json: true, model: await getCurrentModel(), provider: await getCurrentProvider() });

    const mindmapData = JSON.parse(cleanText(response.text));

    // Auto-save if studentId provided (usually easier to do in frontend for this flow, but can be here)
    // Leaving history save to frontend as per current architecture for mindmaps

    res.json(mindmapData);

  } catch (error) {
    console.error("Mindmap Generation Error:", error);
    // Cleanup if file exists and wasn't cleaned
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

    res.status(500).json({ detail: `Failed to generate mindmap: ${error.message}` });
  }
});

app.post('/api/generate-mindmap-from-text', async (req, res) => {
  try {
    const { text, topic } = req.body;

    if (!text && !topic) {
      return res.status(400).json({ detail: "Provide 'text' or 'topic'" });
    }

    const prompt = getMindmapPrompt(text || topic, !!topic);

    const response = await generate(prompt, { json: true, model: await getCurrentModel(), provider: await getCurrentProvider() });

    const mindmapData = JSON.parse(cleanText(response.text));
    res.json(mindmapData);

  } catch (error) {
    console.error("Mindmap Text Generation Error:", error);
    res.status(500).json({ detail: error.message });
  }
});

// --- MODULE HISTORY ---

app.get('/api/students/:studentId/modules', async (req, res) => {
  const { studentId } = req.params;
  console.log(`[API] Fetching history for student: ${studentId}`);
  try {
    const { data, error } = await supabase
      .from('generated_modules')
      .select('*')
      .eq('studentId', studentId)
      .order('createdAt', { ascending: false });

    if (error) {
      console.error("[API] Supabase Error:", error);
      throw error;
    }
    console.log(`[API] Found ${data?.length || 0} records for ${studentId}`);
    res.json(data);
  } catch (err) {
    console.error("History Fetch Error:", err);
    // Fail silently or return empty if table doesn't exist yet
    if (err.message && err.message.includes('relation "generated_modules" does not exist')) {
      console.warn("[API] Table 'generated_modules' does not exist yet.");
      return res.json([]);
    }
    res.status(500).json({ error: err.message });
  }
});

// POST endpoint for frontend to save module history
app.post('/api/save-module-history', async (req, res) => {
  const { studentId, type, topic, content, subject, classId } = req.body;

  if (!studentId) {
    return res.status(400).json({ error: 'studentId is required' });
  }

  try {
    await saveModuleHistory(studentId, type, topic, content, classId);
    res.json({ success: true });
  } catch (err) {
    console.error('Save Module History Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// --- DATABASE ROUTES ---

// Schools
// Schools
app.get('/api/schools', async (req, res) => {
  try {
    const { data: schools, error } = await supabase.from('schools').select('*');
    if (error) throw error;

    const { data: teachers, error: tError } = await supabase.from('teachers').select('*');
    if (tError) throw tError;

    const schoolsWithFaculty = schools.map(school => ({
      ...school,
      faculty: teachers
        .filter(t => t.schoolId === school.id)
        .map(t => ({
          ...t,
          assignedClasses: t.assignedClasses // Supabase handles JSON
        }))
    }));

    res.json(schoolsWithFaculty);
  } catch (err) {
    if (err.message?.includes('relation') && err.message?.includes('does not exist')) {
      console.error(`[CRITICAL] Supabase table 'schools' or 'teachers' is missing! Run setup_all_tables.sql`);
    } else {
      console.error("Schools Fetch Error:", err.message);
    }
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/schools', async (req, res) => {
  const { id, name, inviteCode, adminEmail, password, subscriptionStatus, trialEndsAt, studentCount, maxStudents, plan, logoUrl } = req.body;
  try {
    const { error } = await supabase
      .from('schools')
      .insert([{
        id, name, inviteCode, adminEmail, password, subscriptionStatus, trialEndsAt, studentCount, maxStudents, plan, logoUrl
      }]);

    if (error) throw error;
    res.json({ id, ...req.body });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/teachers/:id', async (req, res) => {
  const { assignedClasses } = req.body;
  const id = req.params.id;

  try {
    // Supabase stores JSONB, so pass the array/object directly
    const { error } = await supabase
      .from('teachers')
      .update({ assignedClasses })
      .eq('id', id);

    if (error) throw error;
    res.json({ message: "Updated" });
  } catch (err) {
    console.error("DB Update Error:", err.message);
    return res.status(500).json({ error: err.message });
  }
});



// Teachers
app.post('/api/teachers', async (req, res) => {
  const { id, schoolId, name, email, subject, joinedAt, assignedClasses, password } = req.body;

  try {
    const { error } = await supabase
      .from('teachers')
      .insert([{
        id, schoolId, name, email, subject, joinedAt, assignedClasses, password
      }]);

    if (error) throw error;
    res.json(req.body);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Students
app.get('/api/students', async (req, res) => {
  try {
    const { data, error } = await supabase.from('students').select('*');
    if (error) throw error;
    res.json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/students', async (req, res) => {
  const { id, schoolId, classId, name, email, mobileNumber, rollNumber, username, password, grade, attendance, avgScore, status, weakerSubjects, weaknessHistory } = req.body;
  console.log(`[Join] Creating new student: ${name} for school ${schoolId}`);
  try {
    const { data, error } = await supabase
      .from('students')
      .insert([{
        id,
        schoolId,
        classId,
        name,
        email,
        mobileNumber,
        rollNumber,
        username,
        password,
        grade,
        attendance,
        avgScore,
        status,
        weakerSubjects, // Supabase handles JSON automatically
        weaknessHistory
      }])
      .select();

    if (error) throw error;
    res.json(data[0]);
  } catch (err) {
    console.error("Student Registration Error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/students/:id', async (req, res) => {
  // [FIX] Strip derived fields like 'level' that don't exist in DB
  const { id: _id, level, ...updates } = req.body;
  const id = req.params.id;

  try {
    const { error } = await supabase
      .from('students')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
    res.json({ message: "Updated" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Classrooms
app.get('/api/classrooms', async (req, res) => {
  try {
    const { data, error } = await supabase.from('classrooms').select('*');
    if (error) throw error;

    const classrooms = data.map(r => ({
      ...r,
      studentIds: r.studentIds // Supabase handles JSON
    }));

    res.json(classrooms);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/classrooms', async (req, res) => {
  const { id, schoolId, teacherId, name, section, motto, inviteCode, studentIds } = req.body;

  const createClass = async () => {
    try {
      const { error } = await supabase.from('classrooms').insert([{
        id, schoolId, teacherId, name, section, motto, inviteCode, studentIds, subject: req.body.subject, subjects: req.body.subjects
      }]);
      if (error) throw error;
      console.log("Classroom created successfully");
      res.json(req.body);
    } catch (err) {
      console.error("Failed to insert classroom:", err);
      return res.status(500).json({ error: err.message });
    }
  };

  try {
    // Check if teacher exists
    const { data: teacher } = await supabase.from('teachers').select('id').eq('id', teacherId).single();

    if (!teacher) {
      console.log(`Teacher/Admin ${teacherId} missing. Auto-creating...`);
      const { error: tError } = await supabase.from('teachers').insert([{
        id: teacherId,
        schoolId,
        name: "System User",
        email: "system@gyan.ai",
        subject: "Administration",
        joinedAt: new Date().toISOString(),
        assignedClasses: []
      }]);
      if (tError) return res.status(500).json({ error: "Failed to create implicit user: " + tError.message });
    }
    await createClass();
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.put('/api/classrooms/:id', async (req, res) => {
  const { studentIds } = req.body;
  try {
    const { error } = await supabase.from('classrooms').update({ studentIds }).eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: "Updated" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/api/classrooms/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('classrooms').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: "Deleted" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Announcements
// Announcements
app.get('/api/announcements', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .order('timestamp', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/announcements', async (req, res) => {
  const { id, schoolId, authorName, content, type, timestamp } = req.body;

  try {
    const { error } = await supabase
      .from('announcements')
      .insert([{
        id,
        schoolId,
        authorName,
        content,
        type,
        timestamp
      }]);

    if (error) throw error;
    res.json(req.body);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- SUGGESTIONS (Teacher to Student Feedback) ---

// Create a new suggestion
app.post('/api/suggestions', async (req, res) => {
  const { id, fromTeacherId, fromTeacherName, toStudentId, content, createdAt } = req.body;
  try {
    const { error } = await supabase.from('suggestions').insert([{
      id, fromTeacherId, fromTeacherName, toStudentId, content, createdAt
    }]);
    if (error) throw error;
    res.json(req.body);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Get suggestions for a student
app.get('/api/students/:studentId/suggestions', async (req, res) => {
  const { studentId } = req.params;
  try {
    const { data, error } = await supabase
      .from('suggestions')
      .select('*')
      .eq('toStudentId', studentId)
      .order('createdAt', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Mark suggestion as read
app.patch('/api/suggestions/:id/read', async (req, res) => {
  const { id } = req.params;
  const readAt = new Date().toISOString();
  try {
    const { error } = await supabase.from('suggestions').update({ readAt }).eq('id', id);
    if (error) throw error;
    res.json({ message: 'Marked as read' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});


// Assignments
// Assignments
app.get('/api/assignments', async (req, res) => {
  const { classId } = req.query;

  try {
    let query = supabase.from('assignments').select('*').order('createdAt', { ascending: false });

    if (classId) {
      query = query.eq('classId', classId);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Parse JSON questions safely
    const dataWithParsedQuestions = data.map(item => {
      let questions = item.questions;
      if (typeof questions === 'string') {
        try {
          questions = JSON.parse(questions);
        } catch (e) {
          console.error(`[API] Failed to parse questions for assignment ${item.id}:`, e);
          questions = []; // Fallback to empty array
        }
      }
      return { ...item, questions };
    });

    res.json(dataWithParsedQuestions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/assignments', async (req, res) => {
  const { id, classId, title, description, subject, type, maxMarks, deadline, createdAt, questions, attachment } = req.body;

  try {
    const { error } = await supabase
      .from('assignments')
      .insert([{
        id,
        classId,
        title,
        description,
        subject,
        type,
        maxMarks,
        deadline,
        createdAt,
        questions, // JSON/Array handled automatically
        attachment
      }]);

    if (error) throw error;
    res.json({ id, classId, title, description, maxMarks, deadline, questions, attachment });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- REMEDIAL RESOLUTION FLOW ---

// 1. Generate Remedial Content (Explanation + Quiz)
app.post('/api/remedial/generate', async (req, res) => {
  const { topic, subTopic, gradeLevel, subject } = req.body;
  try {
    const prompt = `You are an expert tutor. A student has a specific learning gap: "${subTopic}" (within the broader topic of "${topic}").
    
    1. Provide a clear, easy-to-understand EXPLANATION of this specific concept (approx 150 words). Use analogies if helpful.
    2. Generate 5 multiple-choice questions (MCQs) to test understanding of *this specific concept*.
    
    Return JSON format:
    {
      "explanation": "Markdown text here...",
      "practiceQuestions": [
        { "question": "...", "options": ["A", "B", "C", "D"], "correctAnswer": 0 }
      ]
    }`;

    const aiResponse = await generate(prompt, { json: true });
    let content = JSON.parse(cleanText(aiResponse.text));

    // [ROBUSTNESS] Map any alternate field names to 'practiceQuestions'
    if (!content.practiceQuestions && content.questions) {
      console.log("[REMEDIAL] Mapping 'questions' to 'practiceQuestions'");
      content.practiceQuestions = content.questions;
      delete content.questions;
    }

    if (!content.practiceQuestions || !Array.isArray(content.practiceQuestions)) {
      console.error("[REMEDIAL] AI failed to generate valid questions array:", content);
      content.practiceQuestions = []; // Fallback
    }

    console.log(`[REMEDIAL] Generated ${content.practiceQuestions.length} questions for ${subTopic}`);
    res.json(content);
  } catch (err) {
    console.error("Remedial Gen Error:", err);
    res.status(500).json({ error: "Failed to generate remedial content" });
  }
});

// 2. Submit Resolution Quiz
app.post('/api/remedial/resolve', async (req, res) => {
  const { studentId, gapId, score, totalQuestions } = req.body;

  try {
    const percentage = (score / totalQuestions) * 100;
    const isResolved = percentage >= 80; // STRICT CRITERIA

    if (isResolved) {
      // Fetch student to update history
      const { data: student } = await supabase.from('students').select('weaknessHistory').eq('id', studentId).single();
      let history = student.weaknessHistory || [];

      // Find and Update Gap
      const gapIndex = history.findIndex(g => g.id === gapId || (g.topic === req.body.topic && g.subTopic === req.body.subTopic)); // Fallback match

      if (gapIndex !== -1) {
        history[gapIndex].status = 'RESOLVED';
        history[gapIndex].resolvedAt = new Date().toISOString();

        await supabase.from('students').update({ weaknessHistory: history }).eq('id', studentId);
      }
    }

    res.json({ success: true, resolved: isResolved, percentage });
  } catch (err) {
    console.error("Gap Resolution Error:", err);
    res.status(500).json({ error: "Failed to resolve gap" });
  }
});

// --- QUIZ SUBMISSION ROUTE ---
app.post('/api/quiz/submit', async (req, res) => {
  try {
    const { studentId, topic, userAnswers, questions, classId, source = 'AI_LEARNING', subject } = req.body;

    console.log(`[QUIZ SUBMIT] Processing submission for ${studentId}, Topic: ${topic}, Source: ${source}`);

    // 1. Calculate Score & Identify Wrong Answers
    let correctCount = 0;
    const wrongAnswers = [];

    questions.forEach((q, index) => {
      const userAnsIndex = userAnswers[index];
      if (userAnsIndex === q.correctAnswer) {
        correctCount++;
      } else {
        wrongAnswers.push({
          question: q.question,
          studentAnswer: q.options[userAnsIndex],
          correctAnswer: q.options[q.correctAnswer],
          options: q.options
        });
      }
    });

    const totalQuestions = questions.length;
    const scorePercentage = (correctCount / totalQuestions) * 100;
    const passed = scorePercentage >= 50;

    let newGaps = [];

    // 2. AI Analysis for Wrong Answers (If any)
    if (wrongAnswers.length > 0) {
      console.log(`[QUIZ SUBMIT] analyzing ${wrongAnswers.length} wrong answers...`);

      const prompt = `Analyze these wrong answers from a ${req.body.gradeLevel || 'Grade 10'} student's quiz on "${topic}".
      
      Wrong Answers:
      ${JSON.stringify(wrongAnswers.slice(0, 5))} // Analyze top 5 errors to save tokens

      TASK: Identify the TOP 1-3 most critical "Atomic Learning Gaps" (subtopics or concepts) that caused these errors.
      
      REQUIREMENTS:
      1. Be specific (e.g. "Differentiating Isogamy vs Anisogamy" instead of just "Reproduction").
      2. Return ONLY a JSON array of strings.
      3. CRITICAL: DO NOT return generic terms like "Quiz Performance", "Score", "Mistakes", or "General Knowledge". Return only ACADEMIC TOPICS.
      4. CRITICAL: Limit output to a MAXIMUM of 3 gaps total. Do not list every single error as a separate gap. Group them by underlying concept.
      5. Example: ["Concept A", "Concept B"]`;

      try {
        const aiResponse = await generate(prompt, { json: true, model: await getCurrentModel(), provider: await getCurrentProvider() });
        let identifiedGaps = JSON.parse(cleanText(aiResponse.text));

        // [filter] Sanitize Gaps & Hard Limit
        identifiedGaps = identifiedGaps.filter(g =>
          !g.toLowerCase().includes('quiz performance') &&
          !g.toLowerCase().includes('score') &&
          !g.includes('%')
        ).slice(0, 3); // [Updated] MAX 3 GAPS PER QUIZ

        // 3. Create Weakness Records
        if (Array.isArray(identifiedGaps) && identifiedGaps.length > 0) {
          console.log(`[QUIZ SUBMIT] AI Identified Gaps (Limited to top 3):`, identifiedGaps);

          // Fetch existing student to check for duplicates
          const { data: student } = await supabase.from('students').select('weaknessHistory').eq('id', studentId).single();
          let currentHistory = student?.weaknessHistory || [];
          let gapsUpdated = false;

          const gapsToCreate = identifiedGaps.map(gapName => ({
            id: `GAP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            topic: topic,
            subTopic: gapName,
            subject: subject || 'General',
            source: source, // 'AI_LEARNING' or 'ASSIGNMENT'
            classId: classId,
            detectedAt: new Date().toISOString(),
            status: 'OPEN',
            score: scorePercentage,
            remedialCompleted: false
          }));

          const meaningfulNewGaps = [];

          gapsToCreate.forEach(newGap => {
            // Find existing OPEN gap with same Topic AND SubTopic
            const existingIndex = currentHistory.findIndex(existing =>
              existing.status === 'OPEN' &&
              existing.topic === newGap.topic &&
              existing.subTopic === newGap.subTopic
            );

            if (existingIndex !== -1) {
              // UPDATE existing gap (Refresh timestamp and score)
              console.log(`[QUIZ SUBMIT] Updating existing gap: ${newGap.subTopic}`);
              currentHistory[existingIndex].detectedAt = newGap.detectedAt;
              currentHistory[existingIndex].score = newGap.score;
              gapsUpdated = true;
            } else {
              // CREATE new gap
              meaningfulNewGaps.push(newGap);
            }
          });

          if (meaningfulNewGaps.length > 0 || gapsUpdated) {
            const finalHistory = [...currentHistory, ...meaningfulNewGaps];

            // Update Student
            await supabase.from('students').update({ weaknessHistory: finalHistory }).eq('id', studentId);

            newGaps = meaningfulNewGaps;
            console.log(`[QUIZ SUBMIT] Processed Gaps: ${meaningfulNewGaps.length} Created, ${gapsUpdated ? 'Some' : 'None'} Updated.`);
          } else if (scorePercentage < 40) {
            console.log(`[QUIZ SUBMIT] AI found no gaps, but score is low (${scorePercentage}%). Creating fallback gap.`);

            // Reuse Fallback Logic
            const fallbackGap = {
              id: `GAP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              topic: topic,
              subTopic: topic,
              subject: subject || 'General',
              source: source,
              classId: classId,
              detectedAt: new Date().toISOString(),
              status: 'OPEN',
              score: scorePercentage,
              remedialCompleted: false
            };

            // Avoid duplicates check
            const existingIndex = currentHistory.findIndex(existing =>
              existing.status === 'OPEN' &&
              existing.topic === fallbackGap.topic &&
              existing.subTopic === fallbackGap.subTopic
            );

            if (existingIndex === -1) {
              const finalHistory = [...currentHistory, fallbackGap];
              await supabase.from('students').update({ weaknessHistory: finalHistory }).eq('id', studentId);
              newGaps = [fallbackGap];
            }
          } else {
            console.log(`[QUIZ SUBMIT] No changes to gaps key.`);
          }
        }
      } catch (aiErr) {
        console.error("[QUIZ SUBMIT] AI Analysis Failed:", aiErr);
        // Fallback: Create generic gap if score is very low
        if (scorePercentage < 40) {
          console.log("[QUIZ SUBMIT] Low score detected, creating fallback gap.");
          const fallbackGap = {
            id: `GAP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            topic: topic,
            subTopic: topic, // Use main topic as the gap
            subject: subject || 'General',
            source: source,
            classId: classId,
            detectedAt: new Date().toISOString(),
            status: 'OPEN',
            score: scorePercentage,
            remedialCompleted: false
          };

          // Add fallback gap to student history
          const { data: student } = await supabase.from('students').select('weaknessHistory').eq('id', studentId).single();
          const currentHistory = student?.weaknessHistory || [];

          // Avoid duplicates
          const existingIndex = currentHistory.findIndex(existing =>
            existing.status === 'OPEN' &&
            existing.topic === fallbackGap.topic &&
            existing.subTopic === fallbackGap.subTopic
          );

          if (existingIndex === -1) {
            const finalHistory = [...currentHistory, fallbackGap];
            await supabase.from('students').update({ weaknessHistory: finalHistory }).eq('id', studentId);
            newGaps = [fallbackGap];
          }
        }
      }
    }

    res.json({
      success: true,
      score: scorePercentage,
      correctCount,
      totalQuestions,
      passed,
      newGaps, // Return to frontend to show "New Gaps Detected!"
      message: passed ? "Great job!" : "Gaps detected. Check your Remedial Center."
    });

  } catch (error) {
    console.error("[QUIZ SUBMIT] Error:", error);
    res.status(500).json({ error: "Failed to process quiz submission" });
  }
});

// --- SUBMISSION ROUTES ---

// Submit Assignment
// Submit Assignment
// Submit Assignment
app.post('/api/assignments/submit', async (req, res) => {
  console.log("Submission received for:", req.body.studentId, req.body.assignmentId);
  const { id, assignmentId, studentId, score, maxMarks, timeTaken, gaps, textAnswer, attachment } = req.body;
  const submittedAt = new Date().toISOString();
  const status = 'SUBMITTED';

  // [FIX] Prioritize full answers array (with flags/custom text) over simple gaps
  const answers = req.body.answers || gaps || []; // Supabase handles JSON

  try {
    // 1. Insert Submission
    const { error } = await supabase
      .from('submissions')
      .insert([{
        id,
        assignmentId,
        studentId,
        score,
        maxMarks,
        submittedAt,
        timeTaken,
        status,
        answers,
        textAnswer,
        attachment
      }]);

    if (error) throw error;

    // 2. Update Student Average Score
    // Get all student submissions
    const { data: submissions, error: subError } = await supabase
      .from('submissions')
      .select('score, maxMarks')
      .eq('studentId', studentId);

    if (!subError && submissions.length > 0) {
      const totalScore = submissions.reduce((acc, curr) => acc + (curr.score / curr.maxMarks) * 100, 0);
      const avgScore = Math.round(totalScore / submissions.length);

      await supabase
        .from('students')
        .update({ avgScore })
        .eq('id', studentId);
    }

    res.json({ message: "Assignment submitted successfully" });
  } catch (err) {
    console.error("Submission DB Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get Submissions for an Assignment (Teacher View)
// Get Submissions for an Assignment (Teacher View)
app.get('/api/assignments/:assignmentId/submissions', async (req, res) => {
  const { assignmentId } = req.params;
  try {
    const { data, error } = await supabase
      .from('submissions')
      .select('*')
      .eq('assignmentId', assignmentId);

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Student History (Student/Teacher View)
app.get('/api/students/:studentId/history', async (req, res) => {
  const { studentId } = req.params;

  try {
    /*
        Supabase Join Syntax is different.
        We select from submissions and populate the assignment data.
        */
    const { data, error } = await supabase
      .from('submissions')
      .select(`
        id,
        score,
        maxMarks,
        submittedAt,
        timeTaken,
        assignments (
        title,
        subject,
        type
        )
        `)
      .eq('studentId', studentId)
      .order('submittedAt', { ascending: false });

    if (error) throw error;

    // Transform to flatten structure if needed by frontend
    // Frontend expects: title, subject, type at top level
    const flattened = data.map(sub => ({
      submissionId: sub.id,
      score: sub.score,
      maxMarks: sub.maxMarks,
      submittedAt: sub.submittedAt,
      timeTaken: sub.timeTaken,
      title: sub.assignments?.title,
      subject: sub.assignments?.subject,
      type: sub.assignments?.type
    }));

    res.json(flattened);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



// Get Student Submissions (Simple List)
app.get('/api/students/:studentId/submissions', async (req, res) => {
  const { studentId } = req.params;
  try {
    const { data, error } = await supabase
      .from('submissions')
      .select('*')
      .eq('studentId', studentId);

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get All Assignments for a Teacher (including Past)
app.get('/api/teachers/:teacherId/assignments', async (req, res) => {
  const { teacherId } = req.params;

  try {
    // 1. Get teacher's assigned classes from teachers table
    const { data: teacher, error: tError } = await supabase.from('teachers').select('assignedClasses').eq('id', teacherId).single();
    if (tError) throw tError;

    const assignedClassIds = teacher ? (teacher.assignedClasses || []) : [];

    // 2. Get classrooms where teacher is the creator
    const { data: ownedClasses, error: cError } = await supabase.from('classrooms').select('id').eq('teacherId', teacherId);
    if (cError) throw cError;

    const ownedClassIds = ownedClasses.map(c => c.id);

    // 3. Combine both sets (remove duplicates)
    const allClassIds = [...new Set([...assignedClassIds, ...ownedClassIds])];

    if (allClassIds.length === 0) return res.json([]);

    // 4. Get assignments
    const { data: assignments, error: aError } = await supabase
      .from('assignments')
      .select('*')
      .in('classId', allClassIds)
      .order('createdAt', { ascending: false });

    if (aError) throw aError;

    // Parse JSON questions if necessary
    const parsedAssignments = assignments.map(item => ({
      ...item,
      questions: typeof item.questions === 'string' ? JSON.parse(item.questions) : item.questions
    }));

    res.json(parsedAssignments);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});


// Migration Endpoint
// Migration Endpoint (Disabled for Supabase Only Mode)
app.post('/api/migrate', (req, res) => {
  res.status(501).json({ error: 'Migration logic disabled for Supabase-only mode.' });
  /*
  db.serialize(() => {... });
        */
});

// --- DEVELOPER CONSOLE ENDPOINTS ---

app.get('/api/dev/stats', async (req, res) => {
  try {
    const { count: sCount, error: sError } = await supabase.from('schools').select('*', { count: 'exact', head: true });
    const { count: tCount, error: tError } = await supabase.from('teachers').select('*', { count: 'exact', head: true });
    const { count: stCount, error: stError } = await supabase.from('students').select('*', { count: 'exact', head: true });

    if (sError) throw sError;
    if (tError) throw tError;
    if (stError) throw stError;

    res.json({
      schools: sCount || 0,
      teachers: tCount || 0,
      students: stCount || 0,
      parents: 0 // Not implemented yet
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/dev/schools', async (req, res) => {
  try {
    const { data: schools, error } = await supabase.from('schools').select('*');
    if (error) throw error;

    const enrichedSchools = [];

    for (const school of schools) {
      const { count: tCount } = await supabase.from('teachers').select('*', { count: 'exact', head: true }).eq('schoolId', school.id);
      const { count: sCount } = await supabase.from('students').select('*', { count: 'exact', head: true }).eq('schoolId', school.id);

      enrichedSchools.push({
        ...school,
        teacherCount: tCount || 0,
        studentCount: sCount || 0
      });
    }
    res.json(enrichedSchools);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/dev/school/:id/details', async (req, res) => {
  const { id } = req.params;

  try {
    const { data: teachers } = await supabase.from('teachers').select('*').eq('schoolId', id);
    const { data: students } = await supabase.from('students').select('*').eq('schoolId', id);
    const { data: classrooms } = await supabase.from('classrooms').select('*').eq('schoolId', id);

    res.json({
      teachers: teachers || [],
      students: students || [],
      parents: [],
      classrooms: classrooms || []
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- INDIVIDUAL & COLLECTIVE DATA ENDPOINTS ---

// Collective: Get ALL Teachers
app.get('/api/dev/teachers', async (req, res) => {
  try {
    const { data, error } = await supabase.from('teachers').select('*');
    if (error) throw error;
    res.json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Collective: Get ALL Students
app.get('/api/dev/students', async (req, res) => {
  try {
    const { data, error } = await supabase.from('students').select('*');
    if (error) throw error;
    res.json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// --- SITE CONTENT ENDPOINTS ---

app.get('/api/site-content', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('site_content')
      .select('content')
      .eq('id', 'GLOBAL_CONFIG')
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "no rows found"

    if (data) {
      res.json(data.content);
    } else {
      // Return default if not found
      res.json({
        teamMembers: [
          {
            id: '1',
            name: "Abhay Kumar",
            role: "Founder & Lead Developer",
            bio: "Visionary behind Gyan AI, passionate about EdTech and AI.",
            imageUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Abhay",
            socials: { linkedin: "#", twitter: "#", github: "#" }
          }
        ]
      });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/site-content', async (req, res) => {
  const content = req.body;
  const updatedAt = new Date().toISOString();
  try {
    const { error } = await supabase
      .from('site_content')
      .upsert({ id: 'GLOBAL_CONFIG', content, updatedAt });

    if (error) throw error;
    res.json({ success: true, updated: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- CONTACT FORM ENDPOINTS ---

app.post('/api/contact/submit', async (req, res) => {
  const { name, email, message } = req.body;
  const id = `MSG-${Date.now()}`;
  const submittedAt = new Date().toISOString();
  const status = 'UNREAD';

  try {
    const { error } = await supabase
      .from('contact_submissions')
      .insert([{ id, name, email, message, submittedAt, status }]);

    if (error) throw error;
    res.json({ success: true, message: 'Message sent successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/contact/submissions', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('contact_submissions')
      .select('*')
      .order('submittedAt', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Individual: Get Teacher by ID
app.get('/api/dev/teacher/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { data, error } = await supabase.from('teachers').select('*').eq('id', id).single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: "Teacher not found" });
    res.json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Individual: Get Student by ID
app.get('/api/dev/student/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { data, error } = await supabase.from('students').select('*').eq('id', id).single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: "Student not found" });
    res.json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

const server = app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
  console.log(`Frontend command: npm start`);
  // Run sync after a short delay to ensure DB is ready
  setTimeout(syncClassroomData, 2000);
});

// [NEW] WebSocket Upgrade Handling
const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (request, socket, head) => {
  // console.log("Upgrade Request:", request.url);
  if (request.url === '/gemini-stream') {
    handleGeminiStream(wss, request, socket, head);
  } else {
    socket.destroy();
  }
});

// --- SYNC FUNCTION ---
const syncClassroomData = () => {
  // Disabled for Supabase. Data integrity should be managed via Foreign Keys or Hooks if needed.
  console.log("Sync Function Disabled for Supabase Migration");
};

// --- AI MIND MAP GENERATION ---
app.post('/api/mindmap', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    console.log("Processing Mind Map for:", req.file.originalname);

    let text = "";
    const filePath = req.file.path;

    // Extract Text based on file type
    if (req.file.mimetype === 'application/pdf') {
      const dataBuffer = fs.readFileSync(filePath);

      const pdfModule = require('pdf-parse');
      const PDFParse = pdfModule.PDFParse;

      if (!PDFParse) {
        console.error("Critical Error: PDFParse class missing from library.");
        throw new Error("PDF processing library unavailable/incompatible.");
      }

      const parser = new PDFParse({ data: dataBuffer });
      try {
        const data = await parser.getText();
        text = data.text;
      } finally {
        await parser.destroy();
      }
    } else {
      // Assume text file
      text = fs.readFileSync(filePath, 'utf-8');
    }

    // Clean up uploaded file
    fs.unlinkSync(filePath);

    if (!text || text.length < 50) {
      return res.status(400).json({ error: "Could not extract enough text from file." });
    }

    // Generate Mind Map JSON with AI
    const gradeLevel = req.body.gradeLevel || 'Grade 10';
    const subject = req.body.subject || 'General';

    const prompt = `
        Analyze the following text (Context: ${gradeLevel} ${subject}) and create a hierarchical mind map structure.
        Ensure all nodes and summaries are appropriate for a ${gradeLevel} student.
        Return ONLY valid JSON data matching this exact structure for ReactFlow:
        {
          "nodes": [
            {"id": "1", "type": "input", "data": {"label": "Main Topic" }, "position": {"x": 250, "y": 0 } },
            {"id": "2", "data": {"label": "Subtopic" }, "position": {"x": 100, "y": 100 } }
          ],
          "edges": [
            {"id": "e1-2", "source": "1", "target": "2" }
          ]
        }

        Rules:
        1. Identify the central core concept as the root node (type: 'input').
        2. Identify 3-5 main branches (subtopics).
        3. For each subtopic, identify key details as child nodes.
        4. Layout the nodes:
           - Root at x:250, y:0.
           - Level 1 nodes spread horizontally below root (y: 100-200).
           - Level 2 nodes below their parents.
        5. Do NOT include markdown formatting or backticks. Just the raw JSON object.

        Text to analyze:
        ${text.substring(0, 15000)}
    `;

    const result = await generate(prompt);
    const jsonStr = cleanText(result.text);
    const mindMapData = JSON.parse(jsonStr);

    res.json(mindMapData);

  } catch (error) {
    console.error("Mind Map Generation Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// --- English Learning IDE Routes ---

app.post('/api/english/analyze', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'Text required' });

    const prompt = `Act as an English Code Compiler. Analyze the following text for grammar, tone, and style.
        Return JSON format:
        {
          "errors": [{"line": 1, "message": "error description", "suggestion": "correction" }],
        "cefrLevel": "A1-C2",
        "tone": "Formal/Casual/Neutral",
        "readability": "Easy/Medium/Hard",
        "score": 0-100
        }
        Text: "${text}"`;

    const result = await generate(prompt);
    const json = cleanText(result.text);
    res.json(JSON.parse(json));
  } catch (error) {
    console.error('English Analyze Error:', error);
    res.status(500).json({ error: 'Analysis failed' });
  }
});

app.post('/api/english/generate-practice', async (req, res) => {
  try {
    const { topic, level, focusContext } = req.body;
    let prompt = "";

    // Handle Active/Passive Voice (and sub-types like "Active & Passive Voice - Past Perfect")
    if (topic.includes("Active & Passive Voice")) {
      const subType = topic.split(" - ")[1]; // extract "Past Perfect" if present
      prompt = `Generate a sentence in Active Voice ${subType ? `specifically in ${subType} Tense` : ''} for the student to convert into Passive Voice.
        Topic: Active & Passive Voice ${subType ? `(${subType})` : ''}
        Difficulty: ${level}`;

      // Handle Nouns & Verbs (and sub-types like "Nouns - Proper")
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
      prompt += `\n        Focus Context (Use this to target specific weaknesses): ${focusContext}`;
    }

    const isVoice = topic.startsWith("Active & Passive Voice");
    const isNounVerb = topic.startsWith("Nouns") || topic.startsWith("Verbs");

    prompt += `\n        Return JSON format: {"question": "${isVoice ? "Active Voice Sentence" : isNounVerb ? "Sentence" : "Hindi Sentence"}", "answer": "${isVoice ? "Passive Voice Conversion" : isNounVerb ? "Nouns: [list], Verbs: [list]" : "English Translation"}", "hints": ["hint1"] }`;

    const result = await generate(prompt);
    const json = cleanText(result.text);
    res.json(JSON.parse(json));
  } catch (error) {
    console.error('Generate Practice Error:', error);
    res.status(500).json({ error: 'Generation failed' });
  }
});

app.post('/api/english/validate', async (req, res) => {
  try {
    const { question, answer, context } = req.body;

    let instructions = "If the Question was in Hindi, check the English Translation.";
    if (context && context.includes("Active & Passive Voice")) {
      instructions = "The user MUST convert the sentence to Passive Voice (or Active if specified). Check strict grammatical accuracy of the voice conversion.";
    } else if (context && (context.includes("Nouns") || context.includes("Verbs"))) {
      instructions = "The user MUST identify Nouns and Verbs. Check if the classification is correct.";
    }

    const prompt = `Evaluate this student's answer.
        Context/Topic: ${context || "General Translation"}
        Question/Prompt: "${question}"
        Student Answer: "${answer}"

        Instructions: ${instructions}

        Return JSON format: {
          "correct": boolean,
        "feedback": "Why it is right or wrong",
        "improved": "Better version if applicable" 
        }`;

    const result = await generate(prompt);
    const json = cleanText(result.text);
    res.json(JSON.parse(json));
  } catch (error) {
    console.error('Validate Translation Error:', error);
    res.status(500).json({ error: 'Validation failed' });
  }
});

// --- AI ENGLISH TUTOR CHAT ---
app.post('/api/english/tutor', async (req, res) => {
  try {
    const { message, context } = req.body;

    const systemPrompt = `You are an expert English grammar tutor for Indian students learning English.
        You help students understand grammar concepts, resolve doubts, and improve their English skills.
        Be friendly, patient, and provide clear explanations with Hindi examples when helpful.
        Keep responses concise but thorough. Use bullet points and examples.
        Current context: ${context || 'General English learning'}`;

    const prompt = `${systemPrompt}

        Student's Question: ${message}

        Provide a helpful, clear response. If explaining grammar rules, use examples. If the question is about translation, show both Hindi and English.`;

    const result = await generate(prompt);
    res.json({
      response: result.text,
      success: true
    });
  } catch (error) {
    console.error('AI Tutor Error:', error);
    res.status(500).json({ error: 'Tutor unavailable', success: false });
  }
});

// --- WRITING ASSISTANT ---
app.post('/api/english/writing/guide', async (req, res) => {
  try {
    const { type, topic } = req.body;
    const prompt = `Create a writing guide for a student.
        Type: ${type}
        Topic: ${topic}
        Return JSON: {
          "structure": [{"part": "e.g. Salutation", "instruction": "Check the recipient..."}],
        "example": "Full example text..."
        }`;

    const result = await generate(prompt);
    const json = cleanText(result.text);
    res.json(JSON.parse(json));
  } catch (error) {
    console.error("Writing Guide Error", error);
    res.status(500).json({ error: "Failed" });
  }
});

app.post('/api/english/writing/evaluate', async (req, res) => {
  try {
    const { type, topic, content } = req.body;
    const prompt = `Evaluate this student's writing.
        Type: ${type}
        Topic: ${topic}
        Content: "${content}"

        Analyze Grammar, Vocabulary, Tone, and Structure.
        Return JSON: {
          "score": 0-100,
        "grammarScore": 0-100,
        "vocabScore": 0-100,
        "toneScore": 0-100,
        "corrections": [{"original": "bad text", "suggestion": "good text", "reason": "why"}],
        "tips": ["tip1", "tip2"]
        }`;

    const result = await generate(prompt);
    const json = cleanText(result.text);
    res.json(JSON.parse(json));
  } catch (error) {
    console.error("Writing Eval Error", error);
    res.status(500).json({ error: "Failed" });
  }
});


// --- PASSWORD RESET ROUTES ---

app.post('/api/forgot-password', async (req, res) => {
  const { role, identifier } = req.body;

  try {
    // 1. Find User and get their email
    let user = null;
    let userEmail = null;

    if (role === 'STUDENT') {
      const { data, error } = await supabase
        .from('students')
        .select('id, name, email, mobileNumber, parentEmail')
        .or(`username.eq.${identifier},mobileNumber.eq.${identifier},id.eq.${identifier}`)
        .single();
      if (!error) {
        user = data;
        // Priority: Student's own email > parentEmail > identifier if it looks like email
        userEmail = data.email || data.parentEmail || (identifier.includes('@') ? identifier : null);
      }
    } else if (role === 'TEACHER') {
      const { data, error } = await supabase
        .from('teachers')
        .select('id, name, email, mobileNumber')
        .or(`email.eq.${identifier},mobileNumber.eq.${identifier}`)
        .single();
      if (!error) {
        user = data;
        userEmail = data.email;
      }
    } else if (role === 'ADMIN') {
      const { data, error } = await supabase
        .from('schools')
        .select('id, name, adminEmail')
        .eq('adminEmail', identifier)
        .single();
      if (!error) {
        user = data;
        userEmail = data.adminEmail;
      }
    }

    if (!user) {
      return res.status(404).json({ error: "User not found with provided identifier" });
    }

    // 2. Generate Code
    const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    // 3. Save to password_resets
    const { error: resetError } = await supabase
      .from('password_resets')
      .insert([{
        identifier: identifier,
        role: role,
        code: code,
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString()
      }]);

    if (resetError) throw resetError;

    // 4. Send Email with Reset Code
    console.log(`[PASSWORD RESET] Code for ${role} ${identifier}: ${code}`);

    if (userEmail) {
      const emailResult = await sendPasswordResetEmail(userEmail, code, user.name || 'User');
      if (!emailResult.success) {
        console.warn(`[PASSWORD RESET] Email failed for ${userEmail}:`, emailResult.error);
        // Still return success but note email issue
        return res.json({
          message: "Reset code generated. Email delivery may have failed.",
          emailSent: false,
          ...(process.env.NODE_ENV !== 'production' && { debug_code: code })
        });
      }
      res.json({ message: "Reset code sent to your email", emailSent: true });
    } else {
      // No email available - return code in dev mode only
      console.warn(`[PASSWORD RESET] No email found for ${role} ${identifier}`);
      res.json({
        message: "No email on file. Contact admin for password reset.",
        emailSent: false,
        ...(process.env.NODE_ENV !== 'production' && { debug_code: code })
      });
    }

  } catch (err) {
    console.error("Forgot Password Error:", err);
    res.status(500).json({ error: "Failed to process request" });
  }
});

app.post('/api/reset-password', async (req, res) => {
  const { role, identifier, code, newPassword } = req.body;

  try {
    // 1. Verify Code
    const { data: resets, error } = await supabase
      .from('password_resets')
      .select('*')
      .eq('identifier', identifier)
      .eq('role', role)
      .eq('code', code)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    if (error || !resets || resets.length === 0) {
      return res.status(400).json({ error: "Invalid or expired reset code" });
    }

    // 2. Update Password
    if (role === 'STUDENT') {
      const { data: user } = await supabase
        .from('students')
        .select('id')
        .or(`username.eq.${identifier},mobileNumber.eq.${identifier},id.eq.${identifier}`)
        .single();
      if (user) await supabase.from('students').update({ password: newPassword }).eq('id', user.id);
    } else if (role === 'TEACHER') {
      const { data: user } = await supabase
        .from('teachers')
        .select('id')
        .or(`email.eq.${identifier},mobileNumber.eq.${identifier}`)
        .single();
      if (user) await supabase.from('teachers').update({ password: newPassword }).eq('id', user.id);
    } else if (role === 'ADMIN') {
      await supabase.from('schools').update({ password: newPassword }).eq('adminEmail', identifier);
    }

    // 3. Delete used codes
    await supabase.from('password_resets').delete().eq('identifier', identifier).eq('role', role);

    res.json({ success: true, message: "Password updated successfully" });

  } catch (err) {
    console.error("Reset Password Error:", err);
    res.status(500).json({ error: "Failed to reset password" });
  }
});


// ==========================================
// [FIXED] Missing Study Plan Endpoint
// ==========================================
app.post('/api/study-plan', async (req, res) => {
  try {
    const { topic, gradeLevel, studentId } = req.body;
    console.log(`[Study Plan] Generating for: ${topic} (${gradeLevel})`);

    const prompt = `Create a comprehensive study plan for the topic: "${topic}".
    Target Audience: ${gradeLevel || 'Grade 10'} student.

    Return ONLY valid JSON in this exact structure:
    {
      "topic": "${topic}",
      "summary": "2-3 sentence overview of the topic",
      "detailedExplanation": "A detailed explanation in Markdown format. Use headings, bullet points, and simple language suitable for the grade level.",
      "keyPoints": ["Key concept 1", "Key concept 2", "Key concept 3", "Key concept 4", "Key concept 5"],
      "resources": [
        { "title": "Video: Introduction to ${topic}", "url": "https://www.youtube.com/results?search_query=${encodeURIComponent(topic + ' introduction')}", "language": "English" },
        { "title": "Article: Understanding ${topic}", "url": "https://www.google.com/search?q=${encodeURIComponent(topic + ' explanation')}", "language": "English" }
      ],
      "timeAllocation": "Suggested time to master this topic (e.g., '2 weeks')"
    }
    
    Ensure the content is accurate, educational, and engaging.`;

    // Use the unified AI service (Gemini 2.5 Flash as configured)
    const response = await generate(prompt, {
      json: true,
      provider: 'gemini' // Explicitly request Gemini as per user instruction
    });

    let planData;
    try {
      // Clean potential markdown blocks if the provider adds them
      const cleanJson = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
      planData = JSON.parse(cleanJson);
    } catch (e) {
      console.error("[Study Plan] JSON Parse Error:", e);
      // Fallback if JSON parsing fails
      planData = {
        topic,
        summary: "Generated content could not be parsed structurally.",
        detailedExplanation: response.text,
        keyPoints: [],
        resources: []
      };
    }

    if (studentId) {
      // Optional: Save history logic here
    }

    res.json(planData);

  } catch (error) {
    console.error("[Study Plan] Generation Error:", error);
    res.status(500).json({ error: "Failed to generate study plan", details: error.message });
  }
});

// ==========================================
// [DEBUG] AI Connection Test Endpoint
// ==========================================
app.get('/api/debug-ai', async (req, res) => {
  try {
    const aiStatus = getAIStatus();
    const geminiKey = process.env.GEMINI_API_KEY
      ? `Present (Starts with ${process.env.GEMINI_API_KEY.substring(0, 4)}..., Length: ${process.env.GEMINI_API_KEY.length})`
      : 'Missing';

    console.log(`[Debug AI] Testing connection... Key: ${geminiKey}`);

    let testResponse = "Not attempted";
    let error = null;
    let availableModels = [];

    // 1. Try to list models to see what is actually available
    try {
      if (process.env.GEMINI_API_KEY) {
        // Determine if we are using @google/genai or @google/generative-ai based on earlier analysis
        // ai-service.js imports { GoogleGenAI } from "@google/genai"
        // The new SDK usually has client.models.list()
        // We need to access the client instance.
        // Since we can't easily import the client instance from ai-service (it's not exported),
        // we will instantiate a local one for debugging.

        // Dynamic import to match ai-service.js
        const { GoogleGenAI } = await import("@google/genai");
        const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

        // Try listing
        const listResp = await client.models.list();
        // usage might vary by SDK version.
        // If it returns an object with .models property or is iterable
        if (listResp && listResp.models) {
          availableModels = listResp.models.map(m => m.name || m.displayName);
        } else if (Array.isArray(listResp)) {
          availableModels = listResp.map(m => m.name || m.displayName);
        } else {
          availableModels = ["Could not parse list response", JSON.stringify(listResp)];
        }
      }
    } catch (listErr) {
      console.error("[Debug AI] List Models Failed:", listErr);
      availableModels = [`List Failed: ${listErr.message}`];
    }

    // 2. Try generation
    try {
      const result = await generate("Hello, are you online?", { provider: 'gemini' });
      testResponse = result.text;
    } catch (e) {
      error = e.message;
      console.error("[Debug AI] Generation Failed:", e);
    }

    res.json({
      status: "Debug Report",
      environment: {
        GEMINI_API_KEY_STATUS: geminiKey,
        NODE_ENV: process.env.NODE_ENV
      },
      aiConfig: aiStatus,
      availableModels: availableModels,
      testGeneration: {
        success: !error,
        response: testResponse,
        error: error
      }
    });

  } catch (err) {
    res.status(500).json({ error: "Debug endpoint failed", details: err.message });
  }
});

// --- FRONTEND STATIC SERVING (Must be last) ---

const distPath = path.join(__dirname, '../dist');
console.log(`[Server] Environment: ${process.env.NODE_ENV}`);
console.log(`[Server] Dist Path: ${distPath}`);
console.log(`[Server] Dist Exists: ${fs.existsSync(distPath)}`);
console.log(`[Server] Index Exists: ${fs.existsSync(path.join(distPath, 'index.html'))}`);

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')));

  // SPA Fallback: Serve index.html for any unknown route
  app.get('*', (req, res) => {
    // Skip API routes to avoid returning HTML for 404 API calls
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ error: 'API endpoint not found' });
    }
    res.sendFile(path.join(__dirname, '../dist', 'index.html'));
  });
}

// ==========================================
// DEVELOPER API & EXTERNAL INTEGRATION
// ==========================================

// Mock DB for API Keys (In production, use a real table 'api_keys')
// Structure: {id, schoolId, key, createdAt}
// Storing raw keys for demo simplicity. Real world: Store Hash.
const apiKeys = [];

// Generate API Key Endpoint
app.post('/api/keys/generate', (req, res) => {
  const { schoolId } = req.body;
  if (!schoolId) return res.status(400).json({ error: "School ID required" });

  // Generate sk_live_...
  const key = 'sk_live_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

  // Store
  apiKeys.push({
    id: Date.now().toString(),
    schoolId,
    key, // In real app, store hash(key)
    createdAt: new Date().toISOString()
  });

  console.log(`Generated API Key for school ${schoolId}`);
  res.json({ key });
});

// Middleware: Authenticate API Key
const authenticateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) return res.status(401).json({ error: "Missing x-api-key header" });

  const keyRecord = apiKeys.find(k => k.key === apiKey);
  if (!keyRecord) return res.status(403).json({ error: "Invalid API Key" });

  // Attach Context
  req.currentSchoolId = keyRecord.schoolId;
  next();
};

// --- EXTERNAL API ROUTES (For School Integrations) ---

const externalRouter = express.Router();
app.use('/api/external', authenticateApiKey, externalRouter);

// 1. External Chat (AI Tutor)
externalRouter.post('/chat', async (req, res) => {
  const { message, context } = req.body;
  try {
    const prompt = `You are a Tutor embedded in an external school app. School ID: ${req.currentSchoolId}.
        Context: ${context || 'General'}
        Student Message: ${message}

        Provide a helpful, concise answer.`;

    const result = await generate(prompt);
    res.json({ response: result.text, success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 2. External Quiz Generation
externalRouter.post('/quiz', async (req, res) => {
  const { topic, grade, count } = req.body;
  try {
    // Reuse internal logic or call generate
    const prompt = `Generate a quiz for ${topic} (Grade ${grade}). Return JSON with ${count || 5} questions.`;
    const result = await generate(prompt);
    res.json({ quiz: JSON.parse(cleanText(result.text)) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 3. Sync Students
externalRouter.post('/students', async (req, res) => {
  const { students } = req.body; // Array of student objects
  if (!Array.isArray(students)) return res.status(400).json({ error: "Expected 'students' array" });

  // Mock processing
  console.log(`[External API] Syncing ${students.length} students for School ${req.currentSchoolId}`);
  res.json({ message: `Successfully synced ${students.length} students`, timestamp: new Date() });
});

// 4. Create Assignment
externalRouter.post('/assignments', async (req, res) => {
  const { title, subject, type } = req.body;
  // Database insert logic would go here
  console.log(`[External API] Creating assignment '${title}' for ${req.currentSchoolId}`);
  res.json({ id: 'asg_' + Date.now(), status: 'created' });
});

// 5. Analytics Snapshot
externalRouter.get('/analytics', (req, res) => {
  res.json({
    schoolId: req.currentSchoolId,
    activeStudents: Math.floor(Math.random() * 500) + 100,
    avgPerformance: '85%',
    aiUsageCredits: 4500
  });
});

// --- STUDENT API ---
externalRouter.get('/student/:id/dashboard', (req, res) => {
  const { id } = req.params;
  res.json({
    studentId: id,
    schoolId: req.currentSchoolId,
    stats: { attendance: '92%', assignmentsPending: 3, avgScore: 88 },
    recentActivity: [
      { id: 1, type: 'assignment', title: 'Math Homework', status: 'pending' },
      { id: 2, type: 'quiz', title: 'Physics Quiz', score: '9/10' }
    ]
  });
});

externalRouter.get('/student/:id/learning-path', (req, res) => {
  res.json({
    studentId: req.params.id,
    recommended: [
      { topic: 'Calculus', reason: 'Weak performance in last quiz', urgency: 'High' },
      { topic: 'Thermodynamics', reason: 'Upcoming test', urgency: 'Medium' }
    ]
  });
});

externalRouter.post('/student/:id/submit-assignment', (req, res) => {
  const { assignmentId, content } = req.body;
  console.log(`[External API] Student ${req.params.id} submitted assignment ${assignmentId}`);
  res.json({ success: true, submissionId: 'sub_' + Date.now() });
});

// --- TEACHER API ---
externalRouter.get('/teacher/:id/classes', (req, res) => {
  // Mock classes linked to teacher
  res.json({
    teacherId: req.params.id,
    classes: [
      { id: 'c1', name: 'Grade 10 Math', studentCount: 45 },
      { id: 'c2', name: 'Grade 12 Physics', studentCount: 32 }
    ]
  });
});

externalRouter.post('/teacher/:id/create-assignment', (req, res) => {
  const { classId, title, dueDate } = req.body;
  console.log(`[External API] Teacher ${req.params.id} created assignment for class ${classId}`);
  res.json({ success: true, assignmentId: 'asg_' + Date.now() });
});

externalRouter.get('/teacher/:id/analytics', (req, res) => {
  res.json({
    teacherId: req.params.id,
    classPerformance: {
      'Grade 10 Math': { avg: 78, topStudent: 'Student A', weakTopics: ['Algebra'] },
      'Grade 12 Physics': { avg: 82, topStudent: 'Student B', weakTopics: ['Optics'] }
    }
  });
});

// --- ADMIN API ---
externalRouter.get('/admin/school-stats', (req, res) => {
  res.json({
    schoolId: req.currentSchoolId,
    totalStudents: 1250,
    totalTeachers: 85,
    activeClasses: 40,
    systemHealth: 'Optimal'
  });
});

externalRouter.post('/admin/manage-users', (req, res) => {
  const { action, userId, role } = req.body; // action: 'add', 'remove', 'suspend'
  console.log(`[External API] Admin performed ${action} on ${role} ${userId}`);
  res.json({ success: true, action, timestamp: new Date() });
});

externalRouter.get('/admin/audit-logs', (req, res) => {
  res.json({
    logs: [
      { time: new Date().toISOString(), action: 'User Login', user: 'Teacher_01' },
      { time: new Date(Date.now() - 10000).toISOString(), action: 'Grade Update', user: 'Teacher_02' }
    ]
  });
});





// ==========================================
// [FIXED] Missing Study Plan Endpoint
// ==========================================
app.post('/api/study-plan', async (req, res) => {
  try {
    const { topic, gradeLevel, studentId } = req.body;
    console.log(`[Study Plan] Generating for: ${topic} (${gradeLevel})`);

    const prompt = `Create a comprehensive study plan for the topic: "${topic}".
    Target Audience: ${gradeLevel || 'Grade 10'} student.

    Return ONLY valid JSON in this exact structure:
    {
      "topic": "${topic}",
      "summary": "2-3 sentence overview of the topic",
      "detailedExplanation": "A detailed explanation in Markdown format. Use headings, bullet points, and simple language suitable for the grade level.",
      "keyPoints": ["Key concept 1", "Key concept 2", "Key concept 3", "Key concept 4", "Key concept 5"],
      "resources": [
        { "title": "Video: Introduction to ${topic}", "url": "https://www.youtube.com/results?search_query=${encodeURIComponent(topic + ' introduction')}", "language": "English" },
        { "title": "Article: Understanding ${topic}", "url": "https://www.google.com/search?q=${encodeURIComponent(topic + ' explanation')}", "language": "English" }
      ],
      "timeAllocation": "Suggested time to master this topic (e.g., '2 weeks')"
    }
    
    Ensure the content is accurate, educational, and engaging.`;

    // Use the unified AI service (Gemini 2.5 Flash as configured)
    const response = await generate(prompt, {
      json: true,
      provider: 'gemini' // Explicitly request Gemini as per user instruction
    });

    let planData;
    try {
      // Clean potential markdown blocks if the provider adds them
      const cleanJson = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
      planData = JSON.parse(cleanJson);
    } catch (e) {
      console.error("[Study Plan] JSON Parse Error:", e);
      // Fallback if JSON parsing fails
      planData = {
        topic,
        summary: "Generated content could not be parsed structurally.",
        detailedExplanation: response.text,
        keyPoints: [],
        resources: []
      };
    }

    // Save history (Fire and Forget)
    if (studentId) {
      // Assuming saveModuleHistory exists in server.js or imported, but for safety avoiding direct DB call here if not sure.
      // Actually, let's try to call the save endpoint via internal logic if possible, or just skip it for now to fix the blockage.
      // AdaptiveLearning.tsx calls `api.updateStudent` (XP) but relies on `api.generateStudyPlan` to return data.
      // It also calls `api.saveModuleHistory`. Wait, `AdaptiveLearning.tsx` does NOT call `saveModuleHistory` explicitly in `handleGenerate`.
      // It says `console.log("Plan generated, saving to history...");` then sets state.
      // Ah, looking at `api.ts`, `saveModuleHistory` exists. `server.js` usually handles this.
      // I'll leave history saving for now to keep it simple and working.
    }

    res.json(planData);

  } catch (error) {
    console.error("[Study Plan] Generation Error:", error);
    res.status(500).json({ error: "Failed to generate study plan", details: error.message });
  }
});

// ==========================================
// [DEBUG] AI Connection Test Endpoint
// ==========================================
app.get('/api/debug-ai', async (req, res) => {
  try {
    const aiStatus = getAIStatus();
    // Mask key for safety but confirm presence and length
    const geminiKey = process.env.GEMINI_API_KEY
      ? `Present (Starts with ${process.env.GEMINI_API_KEY.substring(0, 4)}..., Length: ${process.env.GEMINI_API_KEY.length})`
      : 'Missing';

    console.log(`[Debug AI] Testing connection... Key Status: ${geminiKey}`);

    // simple test generation
    let testResponse = "Not attempted";
    let error = null;

    try {
      // Use the simplest model first to verify connection
      const result = await generate("Hello, are you online?", { provider: 'gemini' });
      testResponse = result.text;
    } catch (e) {
      error = e.message;
      console.error("[Debug AI] Generation Failed:", e);
    }

    res.json({
      status: "Debug Report",
      environment: {
        GEMINI_API_KEY_STATUS: geminiKey,
        NODE_ENV: process.env.NODE_ENV
      },
      aiConfig: aiStatus,
      testGeneration: {
        success: !error,
        response: testResponse,
        error: error
      }
    });

  } catch (err) {
    res.status(500).json({ error: "Debug endpoint failed", details: err.message });
  }
});


