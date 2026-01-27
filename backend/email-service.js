// Email OTP Service using Resend
import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

// In-memory OTP store (use Redis or database in production for multi-instance)
const otpStore = new Map();

/**
 * Generate a random 6-digit OTP
 */
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Send OTP to email
 * @param email - Recipient email address
 * @returns { success: boolean, error?: string }
 */
export const sendEmailOTP = async (email) => {
    try {
        // Rate limiting check (max 3 per email per hour)
        const key = `otp:${email}`;
        const existing = otpStore.get(key);

        if (existing && existing.attempts >= 3) {
            const timeSinceFirst = Date.now() - existing.firstAttempt;
            if (timeSinceFirst < 3600000) { // 1 hour
                const minutesLeft = Math.ceil((3600000 - timeSinceFirst) / 60000);
                return { success: false, error: `Too many attempts. Try again in ${minutesLeft} minutes.` };
            }
            // Reset after 1 hour
            otpStore.delete(key);
        }

        // Generate OTP
        const otp = generateOTP();
        const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

        // Store OTP
        const currentData = otpStore.get(key) || { attempts: 0, firstAttempt: Date.now() };
        otpStore.set(key, {
            otp,
            expiresAt,
            attempts: currentData.attempts + 1,
            firstAttempt: currentData.firstAttempt
        });

        // Send email via Resend
        const { data, error } = await resend.emails.send({
            from: 'Gyan AI <noreply@gyanai.online>', // Update with your verified domain
            to: email,
            subject: 'Your Verification Code - Gyan AI',
            html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #0a0a0a; color: #ffffff; padding: 40px; }
            .container { max-width: 500px; margin: 0 auto; background: linear-gradient(135deg, #1a1a2e 0%, #0a0a0a 100%); border-radius: 16px; padding: 40px; border: 1px solid rgba(188, 19, 254, 0.3); }
            .logo { text-align: center; margin-bottom: 30px; }
            .logo h1 { color: #bc13fe; font-size: 28px; margin: 0; }
            .otp-box { background: rgba(188, 19, 254, 0.1); border: 2px solid #bc13fe; border-radius: 12px; padding: 20px; text-align: center; margin: 30px 0; }
            .otp-code { font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #00f3ff; }
            .message { color: #a0a0a0; line-height: 1.6; }
            .warning { color: #ff6b6b; font-size: 12px; margin-top: 20px; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="logo">
              <h1>✨ Gyan AI</h1>
            </div>
            <p class="message">Hello! Please use the following verification code to complete your registration:</p>
            <div class="otp-box">
              <div class="otp-code">${otp}</div>
            </div>
            <p class="message">This code will expire in <strong>10 minutes</strong>.</p>
            <p class="warning">If you didn't request this code, please ignore this email.</p>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Gyan AI - Learning Reimagined</p>
            </div>
          </div>
        </body>
        </html>
      `
        });

        if (error) {
            console.error('[Email Service] Send error:', error);
            return { success: false, error: 'Failed to send email. Please try again.' };
        }

        console.log('[Email Service] OTP sent to:', email, 'messageId:', data?.id);
        return { success: true };

    } catch (err) {
        console.error('[Email Service] Error:', err);
        return { success: false, error: 'Email service error. Please try again.' };
    }
};

/**
 * Verify OTP for email
 * @param email - Email address
 * @param otp - OTP code to verify
 * @returns { success: boolean, error?: string }
 */
export const verifyEmailOTP = (email, otp) => {
    try {
        const key = `otp:${email}`;
        const stored = otpStore.get(key);

        if (!stored) {
            return { success: false, error: 'No OTP found. Please request a new one.' };
        }

        if (Date.now() > stored.expiresAt) {
            otpStore.delete(key);
            return { success: false, error: 'OTP has expired. Please request a new one.' };
        }

        if (stored.otp !== otp) {
            return { success: false, error: 'Invalid OTP code. Please check and try again.' };
        }

        // OTP verified successfully - clean up
        otpStore.delete(key);
        console.log('[Email Service] OTP verified for:', email);

        return { success: true };

    } catch (err) {
        console.error('[Email Service] Verify error:', err);
        return { success: false, error: 'Verification failed. Please try again.' };
    }
};

export default { sendEmailOTP, verifyEmailOTP };
