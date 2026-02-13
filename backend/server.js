import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import logger from './utils/logger.js';
import multer from 'multer';
import compression from 'compression';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { WebSocketServer } from 'ws';

// Import local services and helpers
import aiService from './ai-service.js';
import { sendEmailOTP, verifyEmailOTP, sendPasswordResetEmail } from './email-service.js';
import * as helpers from './utils/helpers.js';

// Import Routes
import { createAuthRoutes } from './routes/auth.routes.js';
import { createAIRoutes } from './routes/ai.routes.js';
import { createQuizRoutes } from './routes/quiz.routes.js';
import { createStudyPlanRoutes } from './routes/study-plan.routes.js';
import { createAssignmentRoutes } from './routes/assignment.routes.js';
import { createDataRoutes } from './routes/data.routes.js';
import { createHistoryRoutes } from './routes/history.routes.js';
import { createContentRoutes } from './routes/content.routes.js';
import { createEnglishRoutes } from './routes/english.routes.js';
import { createAIFeatureRoutes } from './routes/ai-features.routes.js';
import { createAnnouncementRoutes } from './routes/announcement.routes.js';
import { createDevRoutes } from './routes/dev.routes.js';
import { createAttendanceRoutes } from './routes/attendance.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env
dotenv.config({ path: path.join(__dirname, '../.env.local') });
dotenv.config({ path: path.join(__dirname, '../.env') });

// Validate Environment Variables
import { validateEnv } from './utils/validateEnv.js';
validateEnv();

const app = express();
const PORT = process.env.PORT || 5000;

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('[GYAN AI] Critical: SUPABASE_URL or SUPABASE_ANON_KEY is missing.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// --- SECURITY HARDENING ---
// 1. CORS Whitelist
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:3000',
];
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
};
app.use(cors(corsOptions));

// 3. Security Headers
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://*.googleapis.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "https://*.supabase.co", "https://images.unsplash.com"],
      connectSrc: ["'self'", "https://*.supabase.co", "https://api.gemini.ai", "https://openrouter.ai", "wss://*.gemini.ai"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    }
  } : false,
  crossOriginEmbedderPolicy: false,
}));

// 2. Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api', apiLimiter);

// 2.5 Compression
app.use(compression());

// --- 1. Public Base Routes ---
app.get('/api', (req, res) => res.json({
  status: "running",
  version: "1.2.0",
  message: "Gyan AI API is active.",
  timestamp: new Date().toISOString()
}));
app.get('/', (req, res) => res.send("Gyan AI Backend is active."));

// Standard Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Multer Config
const upload = multer({ dest: 'uploads/' });

// Mount Routes
// --- 2. Prioritized Auth Routes ---
const authDependencies = { sendEmailOTP, verifyEmailOTP, sendPasswordResetEmail };
app.use('/api/auth', createAuthRoutes(supabase, authDependencies));
app.use('/api', createAuthRoutes(supabase, authDependencies));

// --- 3. Protected Data & Features (Requires Token) ---
app.use('/api', createDataRoutes(supabase));
app.use('/api', createHistoryRoutes(supabase));
app.use('/api', createContentRoutes(supabase));

// --- 4. Resource Specific Routers ---
app.use('/api/announcements', createAnnouncementRoutes(supabase));
app.use('/api/ai', createAIRoutes(aiService, supabase));
app.use('/api/quiz', createQuizRoutes(aiService, supabase, helpers));
app.use('/api/study-plan', createStudyPlanRoutes(aiService, supabase, helpers));
app.use('/api/assignments', createAssignmentRoutes(aiService, supabase, helpers));
app.use('/api/english', createEnglishRoutes(aiService, supabase, helpers));

// --- FEATURES ---
app.use('/api', createAIFeatureRoutes(aiService, supabase, helpers, upload));

// --- DEV & TOOLS ---
app.use('/api/dev', createDevRoutes(supabase));
app.use('/api/attendance', createAttendanceRoutes(supabase));

// --- LEGACY ALIASES ---
app.post('/api/analyze-quiz', (req, res, next) => {
  req.url = '/analyze';
  next();
}, createQuizRoutes(aiService, supabase, helpers));

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Production Mode
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });
}

// Global Error Handler
app.use((err, req, res, next) => {
  logger.error(`[Global Error] ${err.message}`, { stack: err.stack });
  const isProd = process.env.NODE_ENV === 'production';

  res.status(err.status || 500).json({
    error: isProd ? 'Internal Server Error' : err.message,
    ...(isProd ? {} : { stack: err.stack })
  });
});

// Start Server
const server = app.listen(PORT, () => {
  logger.info(`[GYAN AI] Backend running on port ${PORT}`);
});

// WebSocket Handling
const wss = new WebSocketServer({ noServer: true });
server.on('upgrade', (request, socket, head) => {
  if (request.url === '/gemini-stream') {
    // gems handles upgrade
  } else {
    socket.destroy();
  }
});

export default app;
