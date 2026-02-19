import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID;

if (!GOOGLE_CLIENT_ID) {
    console.warn('[Google Auth] GOOGLE_CLIENT_ID not set. Google authentication will not work.');
}

/**
 * Verify Google ID Token
 * Decodes and validates the JWT signature against Google's public keys
 * @param {string} idToken - Google ID token from frontend
 * @returns {Promise<Object>} - Decoded token payload with user info
 */
export const verifyGoogleToken = async (idToken) => {
    try {
        // Decode without verification first to get kid (key ID)
        const decoded = jwt.decode(idToken, { complete: true });
        if (!decoded) throw new Error('Invalid token format');

        const { header, payload } = decoded;
        const kid = header.kid;

        // Fetch Google's public keys
        const keysRes = await fetch('https://www.googleapis.com/oauth2/v1/certs');
        if (!keysRes.ok) throw new Error('Failed to fetch Google keys');
        
        const keys = await keysRes.json();
        const publicKey = keys[kid];
        if (!publicKey) throw new Error('Key not found');

        // Verify the token signature using the public key
        const verified = jwt.verify(idToken, publicKey, {
            algorithms: ['RS256'],
            audience: GOOGLE_CLIENT_ID
        });

        return {
            google_id: verified.sub,
            email: verified.email,
            name: verified.name,
            picture: verified.picture,
            email_verified: verified.email_verified
        };
    } catch (err) {
        console.error('[Google Auth] Token verification failed:', err.message);
        throw new Error('Invalid Google token: ' + err.message);
    }
};

/**
 * Handle Google OAuth Login/Signup
 * Finds or creates user based on Google ID
 * @param {Object} supabase - Supabase client
 * @param {string} idToken - Google ID token
 * @param {string} role - User role (STUDENT, TEACHER, ADMIN, DEVELOPER)
 * @returns {Promise<Object>} - User data or error
 */
export const handleGoogleAuth = async (supabase, idToken, role) => {
    try {
        // 1. Verify Google token
        const googleUser = await verifyGoogleToken(idToken);
        console.log(`[Google Auth] Verified user: ${googleUser.email}`);

        // 2. Pick the right table based on role
        let table = 'students'; // default
        let identifierField = 'email';
        
        if (role === 'TEACHER') {
            table = 'teachers';
            identifierField = 'email';
        } else if (role === 'ADMIN') {
            table = 'schools';
            identifierField = 'adminEmail';
        } else if (role === 'DEVELOPER') {
            table = 'system_users';
            identifierField = 'email';
        }

        // 3. Look up existing user by google_id first
        let { data: existingUser, error: lookupError } = await supabase
            .from(table)
            .select('*')
            .eq('google_id', googleUser.google_id)
            .single();

        if (existingUser && !lookupError) {
            console.log(`[Google Auth] Existing user found by google_id: ${existingUser.id}`);
            return {
                success: true,
                user: existingUser,
                isNewUser: false,
                authProvider: 'google'
            };
        }

        // 4. Check if email already exists (prevent duplicate accounts)
        const emailField = role === 'ADMIN' ? 'adminEmail' : 'email';
        let { data: emailExists, error: emailError } = await supabase
            .from(table)
            .select('id, ' + emailField)
            .eq(emailField, googleUser.email)
            .single();

        if (emailExists && !emailError) {
            console.log(`[Google Auth] Email already exists, linking Google account`);
            // User exists with email, link Google account
            const { data: linked, error: linkError } = await supabase
                .from(table)
                .update({
                    google_id: googleUser.google_id,
                    auth_provider: 'google',
                    oauth_linked_at: new Date().toISOString()
                })
                .eq('id', emailExists.id)
                .select()
                .single();

            if (linkError) {
                console.error('[Google Auth] Failed to link Google account:', linkError);
                throw new Error('Failed to link Google account');
            }
            return {
                success: true,
                user: linked,
                isNewUser: false,
                authProvider: 'google',
                accountLinked: true
            };
        }

        // 5. Create new user (Google signup)
        console.log(`[Google Auth] Creating new user: ${googleUser.email}`);
        
        let newUserData = {
            id: `USR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            [emailField]: googleUser.email,
            google_id: googleUser.google_id,
            auth_provider: 'google',
            oauth_linked_at: new Date().toISOString(),
            password: null // No password for Google users
        };

        // Add role-specific fields
        if (role === 'STUDENT') {
            newUserData = {
                ...newUserData,
                name: googleUser.name,
                username: googleUser.email.split('@')[0], // Auto-generate username
                status: 'Active',
                attendance: 100,
                avgScore: 0,
                weakerSubjects: [],
                weaknessHistory: []
            };
        } else if (role === 'TEACHER') {
            newUserData = {
                ...newUserData,
                name: googleUser.name,
                joinedAt: new Date().toISOString(),
                assignedClasses: []
            };
        } else if (role === 'ADMIN') {
            newUserData = {
                ...newUserData,
                adminEmail: googleUser.email,
                name: googleUser.name,
                password: null
            };
        } else if (role === 'DEVELOPER') {
            newUserData = {
                ...newUserData,
                name: googleUser.name,
                role: 'DEVELOPER',
                password: null
            };
        }

        const { data: newUser, error: createError } = await supabase
            .from(table)
            .insert([newUserData])
            .select()
            .single();

        if (createError) {
            console.error('[Google Auth] Failed to create user:', createError);
            throw new Error(createError.message || 'Failed to create user');
        }

        console.log(`[Google Auth] New user created: ${newUser.id}`);
        return {
            success: true,
            user: newUser,
            isNewUser: true,
            authProvider: 'google'
        };

    } catch (err) {
        console.error('[Google Auth] Error:', err.message);
        return {
            success: false,
            error: err.message || 'Google authentication failed'
        };
    }
};

/**
 * Optionally handle account linking
 * For existing password users who want to add Google
 */
export const linkGoogleAccount = async (supabase, userId, idToken, role) => {
    try {
        const googleUser = await verifyGoogleToken(idToken);

        let table = role === 'TEACHER' ? 'teachers' : role === 'ADMIN' ? 'schools' : 'students';

        const { data: updated, error } = await supabase
            .from(table)
            .update({
                google_id: googleUser.google_id,
                auth_provider: 'google',
                oauth_linked_at: new Date().toISOString()
            })
            .eq('id', userId)
            .select()
            .single();

        if (error) throw error;

        return { success: true, user: updated };
    } catch (err) {
        console.error('[Google Link] Error:', err.message);
        return { success: false, error: err.message };
    }
};
