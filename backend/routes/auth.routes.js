import express from 'express';
import bcrypt from 'bcryptjs';
import { generateToken } from '../middleware/auth.js';
import { loginRules, devLoginRules, forgotPasswordRules, resetPasswordRules, validate } from '../middleware/validators.js';

// Factory function to create auth routes with dependencies
export const createAuthRoutes = (supabase, emailService) => {
    const router = express.Router();
    const { sendEmailOTP, verifyEmailOTP, sendPasswordResetEmail } = emailService;

    // Developer Console Login
    router.post('/dev-login', devLoginRules, validate, async (req, res) => {
        const { email, password } = req.body;

        try {
            const { data: user, error } = await supabase
                .from('system_users')
                .select('*')
                .eq('email', email)
                .eq('role', 'DEVELOPER')
                .single();

            if (error || !user) {
                console.warn(`[Dev Auth Router] Login failed: User ${email} not found.`);
                return res.status(401).json({ error: 'User not found or Role mismatch', details: error });
            }

            console.log(`[Dev Auth Router] User found: ${email}. Verifying password...`);
            const isValid = await bcrypt.compare(password, user.passwordHash);

            if (isValid) {
                // Generate JWT token
                const token = generateToken({
                    id: user.id,
                    email: user.email,
                    role: user.role
                });
                res.json({ success: true, token });
            } else {
                res.status(401).json({ error: 'Password mismatch' });
            }
        } catch (err) {
            console.error('Dev Auth Error:', err);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    // General Login (Student/Teacher/Admin)
    router.post('/login', loginRules, validate, async (req, res) => {
        const { username, password, email, role, asParent } = req.body;

        try {
            let user = null;
            let error = null;

            if (role === 'STUDENT' || (role === 'PARENT' && asParent)) {
                const { data, error: err } = await supabase
                    .from('students')
                    .select('*')
                    .or(`username.eq.${username},mobileNumber.eq.${username},id.eq.${username}`)
                    .single();
                user = data;
                error = err;
            } else if (role === 'TEACHER') {
                const { data, error: err } = await supabase
                    .from('teachers')
                    .select('*')
                    .or(`email.eq.${email},mobileNumber.eq.${email}`)
                    .single();
                user = data;
                error = err;
            } else if (role === 'ADMIN') {
                const { data, error: err } = await supabase
                    .from('schools')
                    .select('*')
                    .eq('adminEmail', email)
                    .single();
                user = data;
                error = err;
            }

            if (error || !user) {
                return res.status(401).json({ error: "Invalid credentials" });
            }

            // [HARDENING] Bcrypt Compare
            const isValid = await bcrypt.compare(password, user.password);
            if (!isValid) {
                return res.status(401).json({ error: "Invalid credentials" });
            }

            // [HARDENING] Generate JWT Token for ALL roles
            const token = generateToken({
                id: user.id,
                email: user.email || user.adminEmail || user.username,
                role: role,
                schoolId: user.schoolId || user.id // For admin schoolId is user.id
            });

            if (role === 'STUDENT' && asParent) {
                res.json({ ...user, token, loginAsParent: true });
            } else if (role === 'ADMIN') {
                res.json({
                    id: user.id,
                    name: user.name,
                    email: user.adminEmail,
                    role: 'ADMIN',
                    schoolId: user.id,
                    token
                });
            } else {
                res.json({ ...user, token });
            }

        } catch (err) {
            console.error("Login Error:", err);
            res.status(500).json({ error: err.message });
        }
    });

    // Forgot Password (Needs Bcrypt update too for reset)

    // Forgot Password
    router.post('/forgot-password', forgotPasswordRules, validate, async (req, res) => {
        const { role, identifier } = req.body;
        try {
            await sendPasswordResetEmail(supabase, role, identifier);
            res.json({ success: true, message: "Reset email sent" });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // Reset Password
    router.post('/reset-password', resetPasswordRules, validate, async (req, res) => {
        const { role, identifier, code, newPassword } = req.body;
        try {
            // [HARDENING] Verify OTP code before allowing password reset
            if (!code) {
                return res.status(400).json({ error: 'Verification code is required.' });
            }
            const isValidCode = await verifyEmailOTP(supabase, identifier, code);
            if (!isValidCode) {
                return res.status(401).json({ error: 'Invalid or expired verification code.' });
            }

            let table = role === 'TEACHER' ? 'teachers' : role === 'ADMIN' ? 'schools' : 'students';
            let field = role === 'ADMIN' ? 'adminEmail' : role === 'STUDENT' ? 'username' : 'email';

            // [HARDENING] Hash new password
            const hashedPassword = await bcrypt.hash(newPassword, 10);

            const { error } = await supabase.from(table).update({ password: hashedPassword }).eq(field, identifier);
            if (error) throw error;

            res.json({ success: true });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    return router;
};


