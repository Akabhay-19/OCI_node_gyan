import React from 'react';
import { AlertCircle } from 'lucide-react';
import { CredentialResponse } from '@react-oauth/google';
import { GoogleLoginButton } from './GoogleLoginButton';

interface GoogleAuthBlockProps {
    onSuccess: (credentialResponse: CredentialResponse) => void;
    onError: (error: string) => void;
    isLoading: boolean;
    error: string | null;
    role: string | null;
}

export const GoogleAuthBlock: React.FC<GoogleAuthBlockProps> = React.memo(({
    onSuccess,
    onError,
    isLoading,
    error,
    role
}) => {
    return (
        <div className="flex flex-col gap-2">
            <p className="text-xs text-gray-400 text-center">Or sign in with</p>
            {error && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs animate-in fade-in slide-in-from-top-1">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                </div>
            )}
            <div className="flex justify-center">
                <GoogleLoginButton
                    onSuccess={onSuccess}
                    onError={() => onError('Google login failed. Please try again.')}
                    isLoading={isLoading}
                    disabled={!role}
                />
            </div>
        </div>
    );
});
