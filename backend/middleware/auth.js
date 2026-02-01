import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'gyan-ai-super-secret-key-change-in-production';
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
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // Attach decoded user info to request
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token.' });
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
