import express from 'express';
import bcrypt from 'bcryptjs';
import { generateToken } from '../middleware/auth.js';

const router = express.Router();

// Factory function to create auth routes with dependencies
export const createAuthRoutes = (supabase, emailService) => {
    const { sendEmailOTP, verifyEmailOTP, sendPasswordResetEmail } = emailService;

    // Developer Console Login
    router.post('/dev-login', async (req, res) => {
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
                return res.status(401).json({ error: 'Invalid Developer Credentials' });
            }

            console.log(`[Dev Auth Router] User found: ${email}. Verifying password...`);
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

    // General Login (Student/Teacher/Admin)
    router.post('/login', async (req, res) => {
        const { username, password, email, role, asParent } = req.body;

        try {
            if (role === 'STUDENT' || (role === 'PARENT' && asParent)) {
                // Student login
                const { data: students, error } = await supabase
                    .from('students')
                    .select('*')
                    .or(`username.eq.${username},mobileNumber.eq.${username},id.eq.${username}`)
                    .eq('password', password);

                if (error) throw error;
                if (!students || students.length === 0) return res.status(401).json({ error: "Invalid credentials" });

                const student = students[0];

                if (asParent) {
                    res.json({ ...student, loginAsParent: true });
                } else {
                    res.json(student);
                }

            } else if (role === 'TEACHER') {
                // Teacher login
                const { data: teachers, error } = await supabase
                    .from('teachers')
                    .select('*')
                    .or(`email.eq.${email},mobileNumber.eq.${email}`)
                    .eq('password', password);

                if (error) throw error;
                if (!teachers || teachers.length === 0) return res.status(401).json({ error: "Invalid credentials" });

                res.json(teachers[0]);

            } else if (role === 'ADMIN') {
                const { data: schools, error } = await supabase
                    .from('schools')
                    .select('*')
                    .eq('adminEmail', email)
                    .eq('password', password);

                if (error) throw error;
                if (!schools || schools.length === 0) return res.status(401).json({ error: "Invalid credentials" });

                const school = schools[0];
                res.json({ id: school.id, name: school.name, email: school.adminEmail, role: 'ADMIN', schoolId: school.id });
            } else {
                res.status(400).json({ error: "Invalid role" });
            }
        } catch (err) {
            console.error("Login Error:", err);
            res.status(500).json({ error: err.message });
        }
    });

    return router;
};

export default router;
