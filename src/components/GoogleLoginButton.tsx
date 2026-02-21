import React, { useState } from 'react';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { Loader2 } from 'lucide-react';

interface GoogleLoginButtonProps {
    onSuccess: (credentialResponse: CredentialResponse) => void;
    onError: () => void;
    disabled?: boolean;
    isLoading?: boolean;
}

export const GoogleLoginButton: React.FC<GoogleLoginButtonProps> = ({
    onSuccess,
    onError,
    disabled = false,
    isLoading = false
}) => {
    return (
        <div className="flex flex-col items-center gap-3 w-full">
            <div className="relative flex items-center justify-center w-full">
                <div className={`transition-all duration-300 ${isLoading ? 'opacity-50 pointer-events-none grayscale' : 'opacity-100'}`}>
                    <GoogleLogin
                        onSuccess={onSuccess}
                        onError={onError}
                        theme="filled_black"
                        shape="pill"
                        text="signin_with"
                        size="large"
                    />
                </div>
                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <Loader2 className="w-5 h-5 text-neon-cyan animate-spin" />
                    </div>
                )}
            </div>
        </div>
    );
};
