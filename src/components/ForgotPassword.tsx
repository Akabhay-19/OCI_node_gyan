import React, { useState } from 'react';
import { NeonCard, NeonButton, Input } from './UIComponents';
import { ArrowLeft, KeyRound, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { UserRole } from '../types';
import { api } from '../services/api';

interface ForgotPasswordProps {
    onBack: () => void;
    initialRole?: UserRole;
}

export const ForgotPassword: React.FC<ForgotPasswordProps> = ({ onBack, initialRole = 'STUDENT' }) => {
    const [step, setStep] = useState<'IDENTIFY' | 'RESET'>('IDENTIFY');
    const [role, setRole] = useState<UserRole>(initialRole);
    const [identifier, setIdentifier] = useState('');
    const [resetCode, setResetCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const handleSendCode = async () => {
        if (!identifier) {
            setError("Please enter your username, email, or mobile number.");
            return;
        }
        setError(null);
        setLoading(true);

        try {
            const response = await api.forgotPassword(role, identifier);

            // In dev mode, we might see the code in the response
            if (response.debug_code) {
                console.log("DEV DEBUG: Reset Code is", response.debug_code);
                alert(`(DEV MODE) Reset Code Sent: ${response.debug_code}\n\nCheck console for details.`);
            } else {
                alert("Reset Code sent! (Check backend console in this demo)");
            }

            setStep('RESET');
            setSuccess("Reset code sent! verify it below.");
        } catch (err: any) {
            setError(err.message || "Failed to find user. Please check your details.");
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async () => {
        if (!resetCode) return setError("Please enter the reset code.");
        if (!newPassword) return setError("Please enter a new password.");
        if (newPassword !== confirmPassword) return setError("Passwords do not match.");

        setError(null);
        setLoading(true);

        try {
            await api.resetPassword(role, identifier, resetCode, newPassword);
            setSuccess("Password updated successfully! You can now login.");
            setTimeout(() => {
                onBack(); // Go back to login
            }, 2000);
        } catch (err: any) {
            setError(err.message || "Failed to reset password. Invalid code or expired.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] w-full relative">
            <NeonButton variant="ghost" onClick={onBack} className="absolute top-0 right-4 md:right-8">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Login
            </NeonButton>

            <NeonCard className="w-full max-w-md p-8 space-y-6" glowColor="purple">
                <div className="text-center">
                    <KeyRound className="w-12 h-12 text-neon-purple mx-auto mb-4" />
                    <h3 className="text-2xl font-bold text-white">
                        {step === 'IDENTIFY' ? 'Forgot Password?' : 'Reset Password'}
                    </h3>
                    <p className="text-gray-400 text-sm mt-2">
                        {step === 'IDENTIFY'
                            ? "Enter your details to receive a reset code."
                            : "Enter the code sent to you and your new password."}
                    </p>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/50 p-3 rounded flex items-start gap-2 text-red-200 text-sm">
                        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                {success && (
                    <div className="bg-green-500/10 border border-green-500/50 p-3 rounded flex items-start gap-2 text-green-200 text-sm">
                        <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
                        <span>{success}</span>
                    </div>
                )}

                {step === 'IDENTIFY' ? (
                    <div className="space-y-4">
                        {/* Role Selector */}
                        <div className="grid grid-cols-3 gap-2 p-1 bg-white/5 rounded-lg">
                            {(['STUDENT', 'TEACHER', 'ADMIN'] as UserRole[]).map(r => (
                                <button
                                    key={r}
                                    onClick={() => setRole(r)}
                                    className={`py-2 text-xs font-bold rounded transition-all ${role === r ? 'bg-neon-purple text-white shadow-lg' : 'text-gray-400 hover:text-white'
                                        }`}
                                >
                                    {r}
                                </button>
                            ))}
                        </div>

                        <Input
                            placeholder={role === 'TEACHER' || role === 'ADMIN' ? "Email Address" : "Username, Mobile, or Roll No."}
                            value={identifier}
                            onChange={e => setIdentifier(e.target.value)}
                        />

                        <NeonButton
                            onClick={handleSendCode}
                            className="w-full"
                            glow
                            disabled={loading}
                        >
                            {loading ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : null}
                            {loading ? 'Sending...' : 'Send Reset Code'}
                        </NeonButton>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="bg-white/5 p-3 rounded text-center mb-2">
                            <span className="text-xs text-gray-400 uppercase tracking-wider">Resetting for:</span>
                            <p className="text-white font-mono">{identifier}</p>
                        </div>

                        <Input
                            placeholder="Enter 6-digit Code"
                            value={resetCode}
                            onChange={e => setResetCode(e.target.value)}
                        />
                        <Input
                            type="password"
                            placeholder="New Password"
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                        />
                        <Input
                            type="password"
                            placeholder="Confirm New Password"
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                        />

                        <NeonButton
                            onClick={handleResetPassword}
                            className="w-full"
                            glow
                            variant="action"
                            disabled={loading}
                        >
                            {loading ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : null}
                            {loading ? 'Updating...' : 'Update Password'}
                        </NeonButton>

                        <button
                            onClick={() => { setStep('IDENTIFY'); setError(null); setSuccess(null); }}
                            className="w-full text-xs text-gray-500 hover:text-white mt-2 transition-colors"
                        >
                            Wrong user? Start over
                        </button>
                    </div>
                )}
            </NeonCard>
        </div>
    );
};
