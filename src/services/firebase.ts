// Firebase configuration for Gyan AI
import { initializeApp } from 'firebase/app';
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Store confirmation result for OTP verification
let confirmationResult: ConfirmationResult | null = null;

/**
 * Initialize reCAPTCHA verifier for phone authentication
 * Must be called before sendPhoneOTP
 */
export const initRecaptcha = (containerId: string): RecaptchaVerifier => {
    // Clear any existing verifier
    if ((window as any).recaptchaVerifier) {
        (window as any).recaptchaVerifier.clear();
    }

    const verifier = new RecaptchaVerifier(auth, containerId, {
        size: 'invisible',
        callback: () => {
            console.log('[Firebase] reCAPTCHA solved');
        },
        'expired-callback': () => {
            console.log('[Firebase] reCAPTCHA expired');
        }
    });

    (window as any).recaptchaVerifier = verifier;
    return verifier;
};

/**
 * Send OTP to phone number
 * @param phoneNumber - Phone number with country code (e.g., +91XXXXXXXXXX)
 * @returns true if OTP sent successfully
 */
export const sendPhoneOTP = async (phoneNumber: string): Promise<{ success: boolean; error?: string }> => {
    try {
        // Ensure phone number starts with country code
        const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;

        const verifier = (window as any).recaptchaVerifier;
        if (!verifier) {
            return { success: false, error: 'Please initialize reCAPTCHA first' };
        }

        console.log('[Firebase] Sending OTP to:', formattedPhone);
        confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, verifier);
        console.log('[Firebase] OTP sent successfully');

        return { success: true };
    } catch (error: any) {
        console.error('[Firebase] Send OTP error:', error);

        // Handle specific error codes
        if (error.code === 'auth/invalid-phone-number') {
            return { success: false, error: 'Invalid phone number format. Use +91XXXXXXXXXX' };
        }
        if (error.code === 'auth/too-many-requests') {
            return { success: false, error: 'Too many attempts. Please try again later.' };
        }
        if (error.code === 'auth/quota-exceeded') {
            return { success: false, error: 'SMS quota exceeded. Please try again tomorrow.' };
        }

        return { success: false, error: error.message || 'Failed to send OTP' };
    }
};

/**
 * Verify OTP code
 * @param otp - 6-digit OTP code
 * @returns true if verification successful
 */
export const verifyPhoneOTP = async (otp: string): Promise<{ success: boolean; error?: string }> => {
    try {
        if (!confirmationResult) {
            return { success: false, error: 'No OTP was sent. Please request a new one.' };
        }

        console.log('[Firebase] Verifying OTP...');
        const result = await confirmationResult.confirm(otp);
        console.log('[Firebase] Phone verified successfully:', result.user.phoneNumber);

        // Sign out immediately - we just needed to verify the phone, not maintain a session
        await auth.signOut();

        return { success: true };
    } catch (error: any) {
        console.error('[Firebase] Verify OTP error:', error);

        if (error.code === 'auth/invalid-verification-code') {
            return { success: false, error: 'Invalid OTP code. Please check and try again.' };
        }
        if (error.code === 'auth/code-expired') {
            return { success: false, error: 'OTP expired. Please request a new one.' };
        }

        return { success: false, error: error.message || 'Failed to verify OTP' };
    }
};

/**
 * Clean up reCAPTCHA verifier
 */
export const cleanupRecaptcha = () => {
    if ((window as any).recaptchaVerifier) {
        (window as any).recaptchaVerifier.clear();
        (window as any).recaptchaVerifier = null;
    }
    confirmationResult = null;
};

export { auth };
