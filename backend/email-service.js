// Email OTP Service using Resend & Supabase
import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
if (!resend) {
  console.warn('[Email Service] RESEND_API_KEY is missing. Email features will be disabled.');
}

/**
 * Generate a random 6-digit OTP
 */
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Send OTP to email
 * @param supabase - Supabase client
 * @param email - Recipient email address
 * @param role - User role
 * @param type - 'VERIFY' or 'RESET'
 * @param userName - personalization
 * @returns { success: boolean, error?: string }
 */
export const sendOTP = async (supabase, email, role = 'STUDENT', type = 'VERIFY', userName = 'User') => {
  try {
    if (!supabase) throw new Error('Supabase client required for OTP storage');

    // Rate limiting check (max 5 per email per hour)
    const oneHourAgo = new Date(Date.now() - 3600 * 1000).toISOString();
    const { count, error: countError } = await supabase
      .from('password_resets')
      .select('*', { count: 'exact', head: true })
      .eq('identifier', email)
      .gt('created_at', oneHourAgo);

    if (countError) throw countError;
    if (count >= 5) {
      return { success: false, error: 'Too many attempts. Try again in an hour.' };
    }

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes

    // Store OTP in Database
    const { error: insertError } = await supabase
      .from('password_resets')
      .insert({
        identifier: email,
        role: role,
        otp: otp,
        expires_at: expiresAt
      });

    if (insertError) throw insertError;

    // Send email via Resend
    if (!resend) {
      console.warn('[Email Service] Cannot send email: Resend not initialized.');
      // Return success in dev if no key, just log the OTP
      console.log(`[DEV ONLY] OTP for ${email}: ${otp}`);
      return { success: true };
    }

    const isReset = type === 'RESET';
    const subject = isReset ? 'Password Reset Code - Gyan AI' : 'Verification Code - Gyan AI';
    const color = isReset ? '#ff6b6b' : '#bc13fe';
    const icon = isReset ? '🔐' : '✨';

    const { data, error } = await resend.emails.send({
      from: 'Gyan AI <noreply@gyanai.online>',
      to: email,
      subject: subject,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #0a0a0a; color: #ffffff; padding: 40px; }
            .container { max-width: 500px; margin: 0 auto; background: linear-gradient(135deg, #1a1a2e 0%, #0a0a0a 100%); border-radius: 16px; padding: 40px; border: 1px solid rgba(188, 19, 254, 0.3); }
            .logo { text-align: center; margin-bottom: 30px; }
            .logo h1 { color: #bc13fe; font-size: 28px; margin: 0; }
            .otp-box { background: rgba(188, 19, 254, 0.1); border: 2px solid ${color}; border-radius: 12px; padding: 20px; text-align: center; margin: 30px 0; }
            .otp-code { font-size: 36px; font-weight: bold; letter-spacing: 8px; color: ${isReset ? '#ff6b6b' : '#00f3ff'}; }
            .message { color: #a0a0a0; line-height: 1.6; }
            .warning { color: #ff6b6b; font-size: 12px; margin-top: 20px; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="logo">
              <h1>${icon} Gyan AI</h1>
            </div>
            <p class="message">Hello ${userName}!</p>
            <p class="message">${isReset ? 'We received a request to reset your password.' : 'Please use the following verification code to complete your registration:'}</p>
            <div class="otp-box">
              <div class="otp-code">${otp}</div>
            </div>
            <p class="message">This code will expire in <strong>15 minutes</strong>.</p>
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

    return { success: true };
  } catch (err) {
    console.error('[Email Service] Error:', err);
    return { success: false, error: 'Email service error.' };
  }
};

/**
 * Legacy wrapper for registration OTP
 */
export const sendEmailOTP = async (supabase, email) => {
  return sendOTP(supabase, email, 'STUDENT', 'VERIFY');
};

/**
 * Legacy wrapper for password reset
 */
export const sendPasswordResetEmail = async (supabase, role, email, userName = 'User') => {
  return sendOTP(supabase, email, role, 'RESET', userName);
};

/**
 * Verify OTP from Database
 * @param supabase - Supabase client
 * @param email - User identifier
 * @param otp - Code to check
 * @returns { boolean }
 */
export const verifyEmailOTP = async (supabase, email, otp) => {
  try {
    if (!supabase) throw new Error('Supabase client required');

    const { data, error } = await supabase
      .from('password_resets')
      .select('*')
      .eq('identifier', email)
      .eq('otp', otp)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return false;

    // Consume OTP
    await supabase.from('password_resets').delete().eq('id', data.id);
    return true;
  } catch (err) {
    console.error('[Email Service] Verify error:', err);
    return false;
  }
};

export default { sendEmailOTP, verifyEmailOTP, sendPasswordResetEmail };
