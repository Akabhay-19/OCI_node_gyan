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

// --- PRODUCTION HARDENING ---
app.set('trust proxy', 1); // Trust first-hop proxy (Vercel, Nginx, Cloudflare)
app.disable('x-powered-by'); // Hide server technology

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('[GYAN AI] Critical: SUPABASE_URL or SUPABASE_ANON_KEY is missing.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// --- SECURITY MIDDLEWARE ---
// 1. Strict CORS
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://192.168.1.9:3000',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl) or if in whitelist
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`[Security] Blocked CORS request from: ${origin}`);
      callback(new Error('Blocked by Security Policy (CORS)'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// 2. Security Headers (Helmet)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://*.googleapis.com", "https://accounts.google.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://*.googleapis.com"],
      imgSrc: ["'self'", "data:", "https://*.supabase.co", "https://images.unsplash.com", "https://*.googleusercontent.com"],
      connectSrc: ["'self'", "https://*.supabase.co", "https://api.gemini.ai", "https://openrouter.ai", "wss://*.gemini.ai", "https://iazyudyiqxuovsvepzmr.supabase.co"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      frameSrc: ["'self'", "https://accounts.google.com"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" }
}));

// 3. Rate Limiting (Global Protection)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Slightly higher for dashboard active use
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`[Security] Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({ error: 'Too many requests, please slow down.' });
  }
});

// --- PERFORMANCE MONITORING ---
app.use((req, res, next) => {
  const start = process.hrtime();
  res.on('finish', () => {
    const elapsed = process.hrtime(start);
    const durationInMs = (elapsed[0] * 1000 + elapsed[1] / 1e6).toFixed(2);
    // Silent health checks to keep logs clean, but log everything else
    if (req.originalUrl !== '/api/health' && req.originalUrl !== '/api') {
      console.log(`[API] ${req.method} ${req.originalUrl} - ${res.statusCode} (${durationInMs}ms)`);
    }
    res.setHeader('X-Response-Time', `${durationInMs}ms`);
  });
  next();
});

app.use('/api', apiLimiter);

// 4. Gzip Compression (Speed up responses)
app.use(compression());

// 5. Strict Body Limits
app.use(express.json({ limit: '20kb' })); // Small limit for typical JSON
app.use(express.urlencoded({ limit: '20kb', extended: true }));

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

// --- 1. Public & Monitoring Routes ---
// Health Check (for Monitoring/Load Balancers)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'UP',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage().heapUsed,
    env: process.env.NODE_ENV
  });
});

app.get('/api', (req, res) => res.json({
  status: "running",
  version: "1.2.0",
  message: "Gyan AI API is active.",
  timestamp: new Date().toISOString()
}));

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
  logger.error(`[Global Error] ${err.message}`, {
    error: err.message,
    status: err.status || 500,
    stack: process.env.NODE_ENV === 'production' ? 'Production stack trace hidden' : err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip
  });
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
