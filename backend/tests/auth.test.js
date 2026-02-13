import { describe, it, expect, vi, beforeAll } from 'vitest';

// Mock Supabase before importing anything
vi.mock('@supabase/supabase-js', () => ({
    createClient: () => ({
        from: (table) => ({
            select: () => ({
                eq: () => ({
                    eq: () => ({
                        single: () => Promise.resolve({
                            data: {
                                id: 'test-id',
                                email: 'test@dev.com',
                                password: '$2a$10$testhashedpassword',
                                role: 'DEVELOPER',
                                name: 'Test Dev'
                            },
                            error: null
                        }),
                        maybeSingle: () => Promise.resolve({ data: null, error: null }),
                    }),
                    single: () => Promise.resolve({ data: null, error: null }),
                }),
            }),
            insert: () => Promise.resolve({ data: null, error: null }),
            update: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
        }),
    }),
}));

// Mock email service
vi.mock('../email-service.js', () => ({
    sendEmailOTP: vi.fn(),
    verifyEmailOTP: vi.fn(() => true),
    sendPasswordResetEmail: vi.fn(),
    default: {
        sendEmailOTP: vi.fn(),
        verifyEmailOTP: vi.fn(() => true),
        sendPasswordResetEmail: vi.fn(),
    }
}));

// Mock dotenv
vi.mock('dotenv', () => ({
    default: { config: vi.fn() },
    config: vi.fn(),
}));

// Set required env vars
process.env.JWT_SECRET = 'test-secret-key-for-testing-only-minimum-32-chars';
process.env.GEMINI_API_KEY = 'test-key';
process.env.OPENROUTER_API_KEY = 'test-key';
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_ANON_KEY = 'test-anon-key';
process.env.VITE_SUPABASE_URL = 'https://test.supabase.co';
process.env.VITE_SUPABASE_ANON_KEY = 'test-anon-key';
process.env.NODE_ENV = 'test';

describe('Input Validation', () => {
    it('rejects login with missing password', async () => {
        const { default: request } = await import('supertest');
        const { default: express } = await import('express');
        const { createAuthRoutes } = await import('../routes/auth.routes.js');

        const app = express();
        app.use(express.json());

        const mockEmailService = {
            sendEmailOTP: vi.fn(),
            verifyEmailOTP: vi.fn(),
            sendPasswordResetEmail: vi.fn(),
        };

        const mockSupabase = {
            from: () => ({
                select: () => ({ eq: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }) }),
            }),
        };

        app.use('/api', createAuthRoutes(mockSupabase, mockEmailService));

        const res = await request(app)
            .post('/api/login')
            .send({ username: 'test', role: 'STUDENT' }); // missing password

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Validation failed');
    });

    it('rejects login with invalid role', async () => {
        const { default: request } = await import('supertest');
        const { default: express } = await import('express');
        const { createAuthRoutes } = await import('../routes/auth.routes.js');

        const app = express();
        app.use(express.json());

        const mockEmailService = {
            sendEmailOTP: vi.fn(),
            verifyEmailOTP: vi.fn(),
            sendPasswordResetEmail: vi.fn(),
        };

        const mockSupabase = {
            from: () => ({
                select: () => ({ eq: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }) }),
            }),
        };

        app.use('/api', createAuthRoutes(mockSupabase, mockEmailService));

        const res = await request(app)
            .post('/api/login')
            .send({ username: 'test', password: 'pass1234', role: 'HACKER' });

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Validation failed');
    });

    it('rejects reset-password without verification code', async () => {
        const { default: request } = await import('supertest');
        const { default: express } = await import('express');
        const { createAuthRoutes } = await import('../routes/auth.routes.js');

        const app = express();
        app.use(express.json());

        const mockEmailService = {
            sendEmailOTP: vi.fn(),
            verifyEmailOTP: vi.fn(),
            sendPasswordResetEmail: vi.fn(),
        };

        const mockSupabase = {
            from: () => ({
                select: () => ({ eq: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }) }),
            }),
        };

        app.use('/api', createAuthRoutes(mockSupabase, mockEmailService));

        const res = await request(app)
            .post('/api/reset-password')
            .send({ role: 'STUDENT', identifier: 'user@test.com', newPassword: 'newpass123' }); // missing code

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Validation failed');
    });

    it('rejects dev-login with invalid email', async () => {
        const { default: request } = await import('supertest');
        const { default: express } = await import('express');
        const { createAuthRoutes } = await import('../routes/auth.routes.js');

        const app = express();
        app.use(express.json());

        const mockEmailService = {
            sendEmailOTP: vi.fn(),
            verifyEmailOTP: vi.fn(),
            sendPasswordResetEmail: vi.fn(),
        };

        const mockSupabase = {
            from: () => ({
                select: () => ({ eq: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }) }),
            }),
        };

        app.use('/api/auth', createAuthRoutes(mockSupabase, mockEmailService));

        const res = await request(app)
            .post('/api/auth/dev-login')
            .send({ email: 'not-an-email', password: 'test' });

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Validation failed');
    });
});

describe('Auth Middleware', () => {
    it('rejects requests without token', async () => {
        const { default: request } = await import('supertest');
        const { default: express } = await import('express');
        const { verifyToken } = await import('../middleware/auth.js');

        const app = express();
        app.use(express.json());
        app.get('/protected', verifyToken, (req, res) => res.json({ ok: true }));

        const res = await request(app).get('/protected');

        expect(res.status).toBe(401);
        expect(res.body.error).toContain('Access denied');
    });

    it('rejects requests with invalid token', async () => {
        const { default: request } = await import('supertest');
        const { default: express } = await import('express');
        const { verifyToken } = await import('../middleware/auth.js');

        const app = express();
        app.use(express.json());
        app.get('/protected', verifyToken, (req, res) => res.json({ ok: true }));

        const res = await request(app)
            .get('/protected')
            .set('Authorization', 'Bearer invalid-token-here');

        expect(res.status).toBe(401);
        expect(res.body.error).toContain('Invalid');
    });

    it('accepts requests with valid token', async () => {
        const { default: request } = await import('supertest');
        const { default: express } = await import('express');
        const { verifyToken, generateToken } = await import('../middleware/auth.js');

        const app = express();
        app.use(express.json());
        app.get('/protected', verifyToken, (req, res) => res.json({ ok: true, user: req.user }));

        const token = generateToken({ id: 'test-user', role: 'STUDENT' });

        const res = await request(app)
            .get('/protected')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.ok).toBe(true);
        expect(res.body.user.id).toBe('test-user');
    });
});
