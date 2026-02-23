import React, { useState, useEffect, useCallback, useRef } from 'react';
import { noticeService, Notice, NoticeType } from '../services/noticeService';

// -------------------------------------------------------
// GYAN AI — Global Notice Component
// A fixed, top-center toast notification system.
// Supports: success | error | warning | info | processing
// -------------------------------------------------------

const ICONS: Record<NoticeType, React.ReactNode> = {
    success: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
    ),
    error: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
    ),
    warning: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
    ),
    info: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    ),
    processing: (
        <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
    ),
};

const STYLES: Record<NoticeType, { border: string; bg: string; text: string; icon: string; progress: string }> = {
    success: {
        border: 'border-emerald-500/60',
        bg: 'bg-emerald-950/90',
        text: 'text-emerald-200',
        icon: 'text-emerald-400',
        progress: 'bg-emerald-500',
    },
    error: {
        border: 'border-red-500/60',
        bg: 'bg-red-950/90',
        text: 'text-red-200',
        icon: 'text-red-400',
        progress: 'bg-red-500',
    },
    warning: {
        border: 'border-amber-500/60',
        bg: 'bg-amber-950/90',
        text: 'text-amber-200',
        icon: 'text-amber-400',
        progress: 'bg-amber-500',
    },
    info: {
        border: 'border-cyan-500/60',
        bg: 'bg-cyan-950/90',
        text: 'text-cyan-200',
        icon: 'text-cyan-400',
        progress: 'bg-cyan-500',
    },
    processing: {
        border: 'border-purple-500/60',
        bg: 'bg-purple-950/90',
        text: 'text-purple-200',
        icon: 'text-purple-400',
        progress: 'bg-purple-500',
    },
};

interface ToastItemProps {
    notice: Notice;
    onDismiss: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ notice, onDismiss }) => {
    const [visible, setVisible] = useState(false);
    const [leaving, setLeaving] = useState(false);
    const [progress, setProgress] = useState(100);
    const style = STYLES[notice.type];
    const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const dismiss = useCallback(() => {
        setLeaving(true);
        setTimeout(() => onDismiss(notice.id), 300);
    }, [notice.id, onDismiss]);

    useEffect(() => {
        // Animate in
        setTimeout(() => setVisible(true), 10);

        // Auto-dismiss if duration > 0
        if (notice.duration && notice.duration > 0) {
            const step = 100 / (notice.duration / 50);
            progressRef.current = setInterval(() => {
                setProgress(p => {
                    if (p <= 0) {
                        if (progressRef.current) clearInterval(progressRef.current);
                        dismiss();
                        return 0;
                    }
                    return p - step;
                });
            }, 50);
        }

        return () => {
            if (progressRef.current) clearInterval(progressRef.current);
        };
    }, [notice.duration, dismiss]);

    return (
        <div
            className={`
        relative overflow-hidden rounded-xl border backdrop-blur-md shadow-2xl
        transition-all duration-300 ease-out cursor-pointer
        ${style.border} ${style.bg}
        ${visible && !leaving ? 'translate-y-0 opacity-100 scale-100' : '-translate-y-3 opacity-0 scale-95'}
        min-w-[280px] max-w-[420px] w-full
      `}
            onClick={dismiss}
            role="alert"
            aria-live="polite"
        >
            {/* Content */}
            <div className="flex items-start gap-3 px-4 py-3">
                <span className={`mt-0.5 flex-shrink-0 ${style.icon}`}>
                    {ICONS[notice.type]}
                </span>
                <p className={`text-sm font-medium leading-relaxed flex-1 ${style.text}`}>
                    {notice.message}
                </p>
                {/* Close button */}
                <button
                    onClick={(e) => { e.stopPropagation(); dismiss(); }}
                    className="flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity text-white mt-0.5"
                    aria-label="Dismiss"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {/* Progress bar */}
            {notice.duration && notice.duration > 0 && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/10">
                    <div
                        className={`h-full transition-none ${style.progress}`}
                        style={{ width: `${progress}%` }}
                    />
                </div>
            )}
        </div>
    );
};

// -------------------------------------------------------
// Main GlobalNotice component — mount once in App root
// -------------------------------------------------------
export const GlobalNotice: React.FC = () => {
    const [notices, setNotices] = useState<Notice[]>([]);

    const addNotice = useCallback((notice: Notice) => {
        setNotices(prev => {
            // Max 5 toasts at once
            const trimmed = prev.length >= 5 ? prev.slice(1) : prev;
            return [...trimmed, notice];
        });
    }, []);

    const dismissNotice = useCallback((id: string) => {
        setNotices(prev => prev.filter(n => n.id !== id));
    }, []);

    // Register with noticeService on mount
    useEffect(() => {
        noticeService._register(addNotice, dismissNotice);
        return () => {
            noticeService._register(() => { }, () => { });
        };
    }, [addNotice, dismissNotice]);

    if (notices.length === 0) return null;

    return (
        <>
            {/* Styles injected once */}
            <style>{`
        @keyframes gyan-notice-in {
          from { transform: translateY(-12px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>

            <div
                aria-label="Notifications"
                className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 items-center pointer-events-none"
                style={{ minWidth: '320px', maxWidth: '480px', width: '90vw' }}
            >
                {notices.map(notice => (
                    <div key={notice.id} className="w-full pointer-events-auto">
                        <ToastItem notice={notice} onDismiss={dismissNotice} />
                    </div>
                ))}
            </div>
        </>
    );
};
