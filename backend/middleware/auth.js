import jwt from 'jsonwebtoken';

// [SECURITY] JWT_SECRET MUST be set in production. No fallback.
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    console.error('[GYAN AI] CRITICAL: JWT_SECRET environment variable is missing! Auth will not work.');
    // In production, you might want to: process.exit(1);
}
const JWT_EXPIRES_IN = '7d';

/**
 * Generate a JWT token for a user
 */
export const generateToken = (payload) => {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

/**
 * Middleware to verify JWT token from Authorization header
 * Usage: app.get('/protected', verifyToken, (req, res) => { ... })
 */
export const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        console.log(`[Auth] 401: No token provided. Path: ${req.path}`);
        console.log(`[Auth] Header received: ${authHeader}`);
        return res.status(401).json({ error: 'AuthMiddleware: Access denied. No token provided.' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // Attach decoded user info to request
        next();
    } catch (err) {
        const reason = err.name === 'TokenExpiredError' ? 'Token expired'
            : err.name === 'JsonWebTokenError' ? 'Invalid token'
                : 'Token verification failed';
        console.warn(`[Auth] ${reason} for ${req.method} ${req.originalUrl}: ${err.message}`);
        return res.status(401).json({ error: reason });
    }
};

/**
 * Middleware to check if user has specific role
 * Usage: app.get('/admin', verifyToken, requireRole('DEVELOPER'), (req, res) => { ... })
 */
export const requireRole = (role) => {
    return (req, res, next) => {
        if (!req.user || req.user.role !== role) {
            return res.status(403).json({ error: 'Forbidden. Insufficient permissions.' });
        }
        next();
    };
};
