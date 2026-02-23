import React, { useState } from 'react';
import { SignupDraft, draftService } from '../services/draftService';
import { UserRole } from '../types';

// -------------------------------------------------------
// GYAN AI — Resume Draft Modal
// Shown when an incomplete registration is detected.
// -------------------------------------------------------

interface ResumeDraftModalProps {
    draft: SignupDraft;
    onResume: (draft: SignupDraft) => void;
    onStartFresh: () => void;
}

const ROLE_ICONS: Record<string, string> = {
    STUDENT: '🎓',
    TEACHER: '👩‍🏫',
    ADMIN: '🏫',
    PARENT: '👨‍👩‍👧',
};

const ROLE_COLORS: Record<string, { border: string; accent: string; bg: string }> = {
    STUDENT: { border: 'border-orange-500/40', accent: 'text-orange-400', bg: 'bg-orange-500/10' },
    TEACHER: { border: 'border-cyan-500/40', accent: 'text-cyan-400', bg: 'bg-cyan-500/10' },
    ADMIN: { border: 'border-purple-500/40', accent: 'text-purple-400', bg: 'bg-purple-500/10' },
    PARENT: { border: 'border-emerald-500/40', accent: 'text-emerald-400', bg: 'bg-emerald-500/10' },
};

export const ResumeDraftModal: React.FC<ResumeDraftModalProps> = ({
    draft,
    onResume,
    onStartFresh,
}) => {
    const [isResuming, setIsResuming] = useState(false);
    const [isFresh, setIsFresh] = useState(false);

    const role = draft.role || 'STUDENT';
    const colors = ROLE_COLORS[role] || ROLE_COLORS.STUDENT;
    const lastSaved = draftService.getLastSavedText(draft);

    // Calculate filled fields (excluding empty/password)
    const filledFields = Object.entries(draft.formData || {})
        .filter(([key, val]) => key !== 'password' && val && val !== '')
        .length;

    const handleResume = async () => {
        setIsResuming(true);
        setTimeout(() => onResume(draft), 300);
    };

    const handleFresh = async () => {
        setIsFresh(true);
        await draftService.clear();
        setTimeout(() => onStartFresh(), 300);
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[9998] flex items-center justify-center p-4"
                aria-modal="true"
                role="dialog"
                aria-label="Resume registration"
            >
                {/* Modal Card */}
                <div
                    className={`
            relative w-full max-w-md rounded-2xl border
            bg-gray-950/95 backdrop-blur-xl shadow-2xl
            ${colors.border}
            animate-[fadeSlideUp_0.35s_ease-out]
          `}
                    style={{ animation: 'fadeSlideUp 0.35s ease-out' }}
                >
                    <style>{`
            @keyframes fadeSlideUp {
              from { opacity: 0; transform: translateY(24px) scale(0.97); }
              to { opacity: 1; transform: translateY(0) scale(1); }
            }
          `}</style>

                    {/* Glow accent */}
                    <div
                        className={`absolute -top-px left-8 right-8 h-px ${colors.bg.replace('bg-', 'bg-').replace('/10', '')}`}
                        style={{ filter: 'blur(2px)' }}
                    />

                    <div className="p-6 space-y-5">
                        {/* Header */}
                        <div className="flex items-start gap-4">
                            <div className={`w-14 h-14 rounded-xl ${colors.bg} border ${colors.border} flex items-center justify-center text-2xl flex-shrink-0`}>
                                📋
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white leading-tight">
                                    Incomplete Registration Found
                                </h2>
                                <p className="text-sm text-gray-400 mt-1">
                                    You started a registration that wasn't completed.
                                </p>
                            </div>
                        </div>

                        {/* Draft Info Card */}
                        <div className={`rounded-xl border ${colors.border} ${colors.bg} p-4 space-y-2`}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="text-xl">{ROLE_ICONS[role] || '🎓'}</span>
                                    <span className={`font-bold text-sm uppercase tracking-wider ${colors.accent}`}>
                                        {role}
                                    </span>
                                </div>
                                <span className="text-xs text-gray-500 bg-white/5 px-2 py-1 rounded-full">
                                    {lastSaved}
                                </span>
                            </div>

                            {/* Fields filled indicator */}
                            <div className="flex items-center gap-2 mt-1">
                                <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all ${colors.accent.replace('text-', 'bg-')}`}
                                        style={{ width: `${Math.min((filledFields / 6) * 100, 100)}%` }}
                                    />
                                </div>
                                <span className="text-xs text-gray-400 whitespace-nowrap">
                                    {filledFields} field{filledFields !== 1 ? 's' : ''} filled
                                </span>
                            </div>

                            {/* Partially filled fields preview */}
                            {draft.formData?.name && (
                                <p className="text-xs text-gray-400 mt-1">
                                    Name: <span className="text-white">{draft.formData.name}</span>
                                </p>
                            )}
                            {draft.formData?.email && (
                                <p className="text-xs text-gray-400">
                                    Email: <span className="text-white">{draft.formData.email}</span>
                                </p>
                            )}
                        </div>

                        {/* Action Buttons */}
                        <div className="space-y-3">
                            <button
                                onClick={handleResume}
                                disabled={isResuming}
                                className={`
                  w-full py-3 px-5 rounded-xl font-bold text-sm
                  transition-all duration-200 flex items-center justify-center gap-2
                  ${colors.bg} border ${colors.border} ${colors.accent}
                  hover:brightness-125 active:scale-[0.98]
                  disabled:opacity-60 disabled:cursor-not-allowed
                `}
                            >
                                {isResuming ? (
                                    <>
                                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                        Restoring...
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Resume Where I Left Off
                                    </>
                                )}
                            </button>

                            <button
                                onClick={handleFresh}
                                disabled={isFresh}
                                className="w-full py-2.5 px-5 rounded-xl font-medium text-sm
                  text-gray-400 border border-white/10 hover:border-white/20
                  hover:text-white hover:bg-white/5
                  transition-all duration-200 active:scale-[0.98]
                  disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {isFresh ? 'Clearing...' : 'Start Fresh Instead'}
                            </button>
                        </div>

                        {/* Footer note */}
                        <p className="text-xs text-center text-gray-600">
                            Drafts are saved for 24 hours · Your password is never stored locally
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
};
