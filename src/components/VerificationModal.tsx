import React, { useState, useEffect, useRef } from 'react';
import { NeonCard, NeonButton } from './UIComponents';
import { X, Mail, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';


interface VerificationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onVerified: (email: string) => void;
    email: string;
}

export const VerificationModal: React.FC<VerificationModalProps> = ({
    isOpen,
    onClose,
    onVerified,
    email
}) => {
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'verifying' | 'verified' | 'error'>('idle');
    const [error, setError] = useState<string | null>(null);
    const [countdown, setCountdown] = useState(0);

    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    // Countdown timer for resend
    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [countdown]);

    // Reset OTP when opening
    useEffect(() => {
        if (isOpen) {
            setOtp(['', '', '', '', '', '']);
            setStatus('idle');
            setError(null);
        }
    }, [isOpen]);

    const handleOtpChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return; // Only allow digits

        const newOtp = [...otp];
        newOtp[index] = value.slice(-1); // Only keep last digit
        setOtp(newOtp);

        // Auto-focus next input
        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        const newOtp = [...otp];
        for (let i = 0; i < pastedData.length; i++) {
            newOtp[i] = pastedData[i];
        }
        setOtp(newOtp);
        if (pastedData.length === 6) {
            inputRefs.current[5]?.focus();
        }
    };

    const sendOTP = async () => {
        setStatus('sending');
        setError(null);

        try {
            const API_URL = (import.meta as any).env.VITE_API_URL ||
                ((import.meta as any).env.PROD ? '/api' : 'http://localhost:5000/api');

            const res = await fetch(`${API_URL}/auth/send-email-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to send OTP');

            setStatus('sent');
            setCountdown(60);
        } catch (err: any) {
            setError(err.message || 'Failed to send OTP');
            setStatus('error');
        }
    };

    const verifyOTP = async () => {
        const otpCode = otp.join('');
        if (otpCode.length !== 6) {
            setError('Please enter the complete 6-digit OTP');
            return;
        }

        setStatus('verifying');
        setError(null);

        try {
            const API_URL = (import.meta as any).env.VITE_API_URL ||
                ((import.meta as any).env.PROD ? '/api' : 'http://localhost:5000/api');

            const res = await fetch(`${API_URL}/auth/verify-email-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp: otpCode })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Invalid OTP');

            setStatus('verified');
            setTimeout(() => onVerified(email), 1500);
        } catch (err: any) {
            setError(err.message || 'Failed to verify OTP');
            setStatus('error');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[99] flex items-center justify-center p-4">
            <NeonCard glowColor="purple" className="w-full max-w-md relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                    <X className="w-5 h-5 text-gray-400" />
                </button>

                <div className="p-6">
                    <div className="flex justify-center mb-4">
                        <div className="w-16 h-16 rounded-full bg-neon-purple/20 flex items-center justify-center border border-neon-purple/50">
                            <Mail className="w-8 h-8 text-neon-purple" />
                        </div>
                    </div>

                    <h2 className="text-2xl font-bold text-white mb-2 text-center">Verify Email</h2>
                    <p className="text-gray-400 text-center mb-6">Enter the OTP sent to your email address</p>

                    {/* Identifier display */}
                    <div className="bg-white/5 rounded-lg p-3 mb-6 text-center">
                        <span className="text-gray-400 text-sm">Sending OTP to:</span>
                        <p className="text-white font-medium">{email}</p>
                    </div>

                    {status === 'verified' ? (
                        <div className="text-center py-8">
                            <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
                            <p className="text-green-400 font-bold text-lg">Verified Successfully!</p>
                        </div>
                    ) : (
                        <>
                            {/* Send OTP button */}
                            {status === 'idle' && (
                                <NeonButton onClick={sendOTP} glow className="w-full mb-4">
                                    Send Verification Code
                                </NeonButton>
                            )}

                            {/* Sending state */}
                            {status === 'sending' && (
                                <div className="text-center py-4">
                                    <RefreshCw className="w-8 h-8 text-neon-purple animate-spin mx-auto mb-2" />
                                    <p className="text-gray-400">Sending OTP...</p>
                                </div>
                            )}

                            {/* OTP Input */}
                            {(status === 'sent' || status === 'verifying' || status === 'error') && (
                                <>
                                    <div className="flex justify-center gap-2 mb-6" onPaste={handlePaste}>
                                        {otp.map((digit, index) => (
                                            <input
                                                key={index}
                                                ref={el => { inputRefs.current[index] = el; }}
                                                type="text"
                                                inputMode="numeric"
                                                maxLength={1}
                                                value={digit}
                                                onChange={e => handleOtpChange(index, e.target.value)}
                                                onKeyDown={e => handleKeyDown(index, e)}
                                                className="w-12 h-14 text-center text-2xl font-bold bg-white/10 border border-white/20 rounded-lg text-white focus:border-neon-purple focus:outline-none focus:ring-2 focus:ring-neon-purple/50"
                                                disabled={status === 'verifying'}
                                            />
                                        ))}
                                    </div>

                                    <NeonButton
                                        onClick={verifyOTP}
                                        glow
                                        className="w-full mb-4"
                                        disabled={status === 'verifying' || otp.join('').length !== 6}
                                    >
                                        {status === 'verifying' ? 'Verifying...' : 'Verify OTP'}
                                    </NeonButton>

                                    {/* Resend option */}
                                    <div className="text-center">
                                        {countdown > 0 ? (
                                            <p className="text-gray-400 text-sm">Resend OTP in {countdown}s</p>
                                        ) : (
                                            <button onClick={sendOTP} className="text-neon-purple hover:underline text-sm font-medium">
                                                Resend OTP
                                            </button>
                                        )}
                                    </div>
                                </>
                            )}

                            {/* Error display */}
                            {error && (
                                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-400">
                                    <AlertTriangle className="w-4 h-4 shrink-0" />
                                    <span className="text-sm">{error}</span>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </NeonCard>
        </div>
    );
};
